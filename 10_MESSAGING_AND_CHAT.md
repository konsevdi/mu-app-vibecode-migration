# 10 — Messaging & Chat

Source: `backend/src/routes/messages.ts` (150 lines), `shared/contracts.ts` lines 181-231.

Per D1, V1 ships **chat + pickup only**. No reservation, escrow, or order state.

## Identity of a conversation

Deterministic: `conversation_id = [userA_id, userB_id].sort().join('_')`. Both UUIDs lower-cased before sort. This is already implemented in the source — preserve verbatim.

Why deterministic: no `conversations` table is needed (D8), and any two users have exactly one shared conversation.

Helper:

```ts
// lib/messaging/conversation-id.ts
export function getConversationId(a: string, b: string) {
  return [a.toLowerCase(), b.toLowerCase()].sort().join('_');
}
```

## Routes

| Route | Purpose |
|---|---|
| `/messages` | Conversation list — uses the `conversations` view (D8). |
| `/messages/[conversationId]` | Single conversation thread. |

`/messages` is auth-required. Anon users hitting `/messages*` → `/login?next=...`.

## Conversation list

Fetch the `conversations` view filtered to the caller, joined to `profiles` for the other participant's display data.

```sql
-- supabase-js call equivalent:
select
  c.conversation_id,
  c.last_message_at,
  c.message_count,
  -- compute "other participant" id
  (case
     when (c.participant_ids[1]) = auth.uid() then c.participant_ids[2]
     else c.participant_ids[1]
   end) as other_id,
  m.content as last_message_preview,
  p.name as other_name,
  p.image as other_image
from conversations c
join lateral (
  select content from messages where conversation_id = c.conversation_id order by created_at desc limit 1
) m on true
join profiles p on p.id = ...
where auth.uid() = any(c.participant_ids)
order by c.last_message_at desc;
```

Render as a vertical list of cards: avatar, name (or masked email if no name), last message preview (truncated 60 chars), relative timestamp ("πριν 5 λ" / "5m ago" via `date-fns/formatDistanceToNowStrict` + locale).

## Thread view

URL: `/messages/[conversationId]`. Validate that `auth.uid()` is one of the participants in the conversation_id (split by `_`, check membership). If not, return 404.

Layout:
- Top: other participant card + back button + report user (overflow menu).
- Middle: message list, oldest at top. Use Intersection Observer for "load older" lazy paging (50 per page).
- Bottom: composer (`textarea` auto-grow + send button + image attach button).

Send flow:
1. Client optimistically appends a temporary message with `id: 'temp-<uuid>'`.
2. POST `/api/messages` with `{ recipientId, content, imageUrl?, listingId? }`.
3. Server validates, runs moderation (URL/off-platform detection), inserts, returns `sendMessageResponseSchema`.
4. If `showSenderTooltip=true`, client renders a one-time tooltip warning ("Μην μοιραζεσαι τηλεφωνα στο chat. Χρησιμοποιησε την εφαρμογη για να μειωσεις τον κινδυνο απατης.").
5. Replace temp message with server response.

## Moderation (in `POST /api/messages`)

Source uses simple regex-based detection. Translate verbatim:

```ts
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/i,
  /\bwww\.[^\s]+/i,
];
const OFF_PLATFORM_PATTERNS = [
  /\bwhatsapp\b/i, /\bviber\b/i, /\btelegram\b/i, /\bsignal\b/i,
  /\binstagram\b/i, /\b(messenger|fb\.me)\b/i,
  /\b\+?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/, // phone numbers
];
const IMAGE_HASH_DEDUP_WINDOW_MIN = 10;

function detectFlags(content: string, imageHash: string | undefined, recentHashes: string[]) {
  const flags: string[] = [];
  if (URL_PATTERNS.some(rx => rx.test(content))) flags.push('url');
  if (OFF_PLATFORM_PATTERNS.some(rx => rx.test(content))) flags.push('off_platform');
  if (imageHash && recentHashes.includes(imageHash)) flags.push('image_spam');
  return flags.length ? flags[0] : null;
}
```

Behavior:
- If `flagged_reason` is set, the message is still delivered, but `showSenderTooltip=true` and a translated warning is returned.
- Recipient sees the message but with a small "⚠ Πιθανο μη ασφαλες περιεχομενο" banner.
- Three flagged messages within 24h from same sender → automatic `restricted_mode=true` for 7 days (`restricted_until = now() + interval '7 days'`). Also writes `user_strikes` row.

## Report

`POST /api/messages/report`:
- Body `reportMessageRequestSchema`.
- Insert `chat_reports`.
- If a message accumulates ≥ `moderation_configs.private_report_threshold` reports (default 2) within 24h, soft-hide it (`is_hidden=true`) and write `auto_action_logs`.
- Notify admin via email if the recipient has ≥ 3 reports across the past 7 days.

## Image attachments

V1 allows 1 image per message, max 5 MB, types: `image/jpeg | image/png | image/webp`. Same upload flow as listings (signed Supabase upload URL → public URL stored in `messages.image_url`). Compute SHA-256 of the file client-side and pass as `imageHash` for dedup detection.

## Read receipts

**V1 = none.** PROPOSED V2: add `messages.read_at timestamptz` plus a per-conversation marker. Keep schema room but don't surface UI.

## Typing indicators

**V1 = none.** PROPOSED V2: Supabase Realtime broadcast channel `typing:${conversation_id}`.

## Realtime updates

Use Supabase Realtime to subscribe to `messages` rows filtered by `conversation_id=eq.<id>`. Configure RLS so each user can only `SELECT` their own messages — Realtime respects RLS.

```ts
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
    queryClient.setQueryData(['messages', conversationId], (prev: Message[] = []) => [...prev, payload.new]);
  })
  .subscribe();
```

## Mailto fallback

When the viewer is anon on listing detail and clicks "Επικοινωνία / Contact", open `mailto:<seller.email>?subject=Mobile Unit: <listing title>&body=Γεια...`. Source uses this exact pattern in `mobile/src/app/listing/[id].tsx`.

## Anti-spam rate limits

- Per-user message rate: 60/hour (Upstash key `messages:${user_id}`).
- Per-conversation: 30/hour (`messages:${user_id}:${conversation_id}`).
- Per-IP (defense in depth): 200/hour.

Returns 429 with `retryAfter` when exceeded.

## Conversations endpoint (PROPOSED)

`GET /api/conversations` — returns the list-view query result above. Used by `/messages` page. Pagination: cursor by `last_message_at`.

## Edge cases

- **Seller deletes account:** `profiles` row cascades, `messages` retain `sender_id` (`on delete set null` instead? **decision:** keep FK and cascade delete messages, since orphans are useless for the buyer).
- **Listing context:** if `listingId` is provided in `POST /api/messages`, store it as `messages.listing_id` (PROPOSED column, currently the schema doesn't have it). Useful for "Re: <listing title>" thread headers.
- **Both users blocked each other:** PROPOSED V2 — a `user_blocks(blocker_id, blocked_id)` table. V1 just lets either user delete the conversation by setting all `is_hidden=true` for their side.
