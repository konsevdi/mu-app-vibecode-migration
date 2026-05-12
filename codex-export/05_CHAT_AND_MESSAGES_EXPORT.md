# 05 — Chat and Messages Export

## Schema (port from Prisma)

```sql
create table public.messages (
  id              text primary key default gen_random_uuid()::text,
  conversation_id text not null,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  content         text not null check (char_length(content) between 1 and 2000),
  image_url       text,
  image_hash      text,
  is_hidden       boolean not null default false,
  flagged_reason  text check (flagged_reason in ('url','off_platform','image_spam','reported')),
  created_at      timestamptz not null default now()
);
create index on public.messages(conversation_id);
create index on public.messages(sender_id);
create index on public.messages(recipient_id);
```

```sql
create table public.chat_reports (
  id           text primary key default gen_random_uuid()::text,
  message_id   text not null references public.messages(id) on delete cascade,
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  reason       text not null,
  created_at   timestamptz not null default now(),
  unique (message_id, reporter_id)  -- new: dedupe reports per reporter
);
```

## Conversation ID derivation

`backend/src/routes/messages.ts:17-20` — VERBATIM:

```ts
function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}
```

Implication: `conversationId` is deterministic from the participant pair, not stored separately. No `conversations` table needed. The rebuild keeps this.

## Send flow

`backend/src/routes/messages.ts:29-74` — VERBATIM behavior:

1. Authenticate (401 if not).
2. Parse `sendMessageRequestSchema`: `{ recipientId, content (1..2000), imageUrl?, imageHash?, listingId? }`.
3. Compute `conversationId`.
4. `moderation = moderateMessage(content)` → see regex below.
5. If `imageUrl && imageHash`: `imageSpamResult = detectImageSpam(db, user.id, imageHash)` — 3 distinct recipients of same hash within 5 minutes.
6. `flaggedReason = moderation.flaggedReason || imageSpamResult.reason`.
7. `isHidden = moderation.isHidden || imageSpamResult.isSuspicious`.
8. Insert message with **sanitized content** (URL/off-platform substrings replaced with `[Link removed for safety]`).
9. Response: `{ message, showSenderTooltip, senderTooltip? }`. Sender tooltip text: `"Links are blocked for safety. Please share details without links."`

## Get conversation

`backend/src/routes/messages.ts:77-103`:

```ts
const messages = await db.message.findMany({
  where: {
    conversationId,
    OR: [{ isHidden: false }, { senderId: user.id }],   // sender sees their own flagged content
  },
  orderBy: { createdAt: "asc" },
});
```

Postgres equivalent under RLS:

```sql
select * from public.messages
where conversation_id = $1
  and (is_hidden = false or sender_id = auth.uid())
order by created_at asc;
```

## Report message

`backend/src/routes/messages.ts:107-148`:

1. Insert `chat_reports` row with `reason`.
2. `UPDATE messages SET is_hidden=true, flagged_reason='reported' WHERE id=$messageId`.
3. `addStrike(db, message.senderId, "Reported: " + reason)` — 90-day decay.

**Missing**: no rate-limit on reports. **Add** in rebuild: max 5 reports/user/24h to prevent griefing.

## URL detection regex (verbatim)

`backend/src/lib/chat-moderation.ts:4-23`:

```ts
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|io|co|me|app|link|ly|bit\.ly|goo\.gl|tinyurl|t\.co)[^\s]*/gi,
];

const OFF_PLATFORM_PATTERNS = [
  /whatsapp/gi,
  /telegram/gi,
  /instagram/gi,
  /facebook\s*messenger/gi,
  /signal\s*app/gi,
  /viber/gi,
  /wa\.me/gi,
  /t\.me/gi,
  /ig:/gi,
  /\+\d{10,}/g,
  /@[a-zA-Z0-9_]+\s*(on\s*)?(insta|telegram|whatsapp)/gi,
];
```

**Important**: after each iteration the source resets `pattern.lastIndex = 0` (because `/g` regex state is sticky). Replicate this in the port — it's a real bug source if forgotten.

## Image spam detection

Default thresholds: 3 distinct recipients of the same `imageHash` within 5 minutes from the same sender → flag as `image_spam`.

Image hashing strategy is **MISSING** in source — clients are expected to compute the hash and send it. In Codex rebuild:

1. Compute pHash server-side on upload to Supabase Storage using `sharp` + `blockhash-core` or `image-hash`.
2. Store the hash on the storage object metadata AND on the message row when attached.
3. Periodic job to recompute on full-resolution image (clients send thumbnails — same image at different sizes shouldn't bypass detection).

## Realtime (PARTIAL → rebuild)

Source uses **3-second polling** on the mobile conversation screen. Replace with Supabase Realtime:

```ts
supabase
  .channel(`conv:${conversationId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}` },
      (payload) => appendMessage(payload.new))
  .subscribe();
```

RLS on the `messages` table must allow the receiving user — RLS policies are also enforced on Realtime.

## RLS policies (`messages`)

```sql
alter table public.messages enable row level security;

-- read: only sender or recipient
create policy "msg_read_owner_or_recipient" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- insert: only as yourself, only to a valid recipient, content non-empty
create policy "msg_insert_self" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and recipient_id <> sender_id
    and char_length(content) between 1 and 2000
  );

-- update: noone (server-only via service role)
-- delete: noone (server-only)
```

Moderation/sanitization is server-side only (Route Handler with service-role client). Clients never write `is_hidden` or `flagged_reason` directly.

## Empty state

**MISSING** in mobile: "no messages yet" empty state on web. Build per `13_COMPONENT_INVENTORY.md` — empty state component with a `<MessagesSquare>` icon, copy in `messages.empty.*` i18n keys.

## Test coverage to add

| Test | Scenario |
|---|---|
| unit | Greek URLs `https://παραδειγμα.com` flagged |
| unit | `+30 698 123 4567` flagged (Greek phone) |
| unit | `@user on insta` flagged |
| unit | `instagram` standalone flagged |
| unit | Plain text "see you tomorrow" NOT flagged |
| integration | sender sees own flagged content; recipient does not |
| integration | reporting marks `is_hidden=true` and adds strike |
| integration | RLS: third party cannot read conversation |
| e2e | two browser contexts (buyer + seller) exchange 3 messages, one is auto-flagged |
