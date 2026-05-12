# CHAT & INBOX MIGRATION SPEC

**Status:** Backend implemented (Prisma + SQLite + Hono). Mobile inbox UI not yet implemented.
**Target:** Supabase Postgres + Next.js web + React Native (Expo) mobile.
**Date:** 2026-05-12
**Source files referenced:**
- `backend/prisma/schema.prisma`
- `backend/src/routes/messages.ts`
- `backend/src/lib/chat-moderation.ts`
- `backend/src/lib/fraud-scoring.ts`
- `backend/src/index.ts`
- `shared/contracts.ts`

---

## 1. CURRENT MESSAGE SCHEMA

### 1.1 Prisma model — `Message`

Source: `backend/prisma/schema.prisma` (lines 138-165, `@@map("message")`).

```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  recipientId    String
  content        String
  imageUrl       String?
  imageHash      String?  // For spam detection
  // Moderation
  isHidden       Boolean  @default(false)  // Soft-hide for recipient
  flaggedReason  String?  // "url" | "off_platform" | "image_spam" | "reported"
  createdAt      DateTime @default(now())

  @@index([conversationId])
  @@index([senderId])
  @@index([recipientId])
  @@map("message")
}
```

#### Fields

| Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | string (cuid) | no | cuid() | PK |
| `conversationId` | string | no | — | Deterministic; `sort([a,b]).join("_")` |
| `senderId` | string | no | — | FK → `user.id` (not enforced at DB level today) |
| `recipientId` | string | no | — | FK → `user.id` (not enforced at DB level today) |
| `content` | string | no | — | Sanitized text (URLs replaced with `[Link removed for safety]`) |
| `imageUrl` | string | yes | null | Public URL from upload service |
| `imageHash` | string | yes | null | Used for image-spam detection (3+ recipients / 5 min) |
| `isHidden` | boolean | no | false | Soft-hidden from recipient but visible to sender |
| `flaggedReason` | string | yes | null | `"url"`, `"off_platform"`, `"image_spam"`, `"reported"` |
| `createdAt` | DateTime | no | now() | UTC; serialized as ISO string in API responses |

#### Indexes
- `(conversationId)`
- `(senderId)`
- `(recipientId)`

#### Relations
- **None enforced in Prisma today.** `senderId` / `recipientId` are loose strings; no `User` relation declared on `Message`. This is a gap and should be enforced as FKs on migration (with `ON DELETE` strategy decided — see §3.4).

### 1.2 Sibling models tied to chat

```prisma
model ChatReport {
  id         String   @id @default(cuid())
  messageId  String
  reporterId String
  reason     String
  createdAt  DateTime @default(now())
  @@map("chat_report")
}

model UserStrike {
  id        String   @id @default(cuid())
  userId    String
  reason    String
  createdAt DateTime @default(now())
  expiresAt DateTime              // 90 days from creation
  @@index([userId])
  @@map("user_strike")
}

model FraudHold {
  id             String    @id @default(cuid())
  entityType     String    // "user" | "listing" | "chat" | "service" | "appointment"
  entityId       String
  fraudScore     Int
  reason         String
  missiveDraftId String?
  resolvedAt     DateTime?
  resolvedBy     String?
  createdAt      DateTime  @default(now())
  @@index([entityId])
  @@map("fraud_hold")
}
```

User fields used by chat abuse controls (`backend/prisma/schema.prisma`):
- `User.fraudScore` (Int, 0-100, default 0)
- `User.isHeld` (Boolean) — requires Super Admin approval
- `User.restrictedMode` (Boolean)
- `User.restrictedUntil` (DateTime?) — 7-day cooldown
- `User.tokensDisabled` (Boolean)

### 1.3 Recommended Supabase / Postgres model (V1)

```sql
-- Messages
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null,                    -- "sorted_a_uuid_sorted_b_uuid" or per-pair UUID
  sender_id       uuid not null references auth.users(id) on delete cascade,
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  listing_id      uuid references public.listings(id) on delete set null,
  content         text not null check (char_length(content) between 1 and 2000),
  image_url       text,
  image_hash      text,
  is_hidden       boolean not null default false,
  flagged_reason  text check (flagged_reason in ('url','off_platform','image_spam','reported')),
  created_at      timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at desc);
create index messages_recipient_id_idx on public.messages (recipient_id);
create index messages_sender_id_idx    on public.messages (sender_id);
create index messages_image_hash_idx   on public.messages (image_hash)
  where image_hash is not null;

-- Optional V1 helper: materialized conversation rows for inbox listing
create table public.conversations (
  id              text primary key,                  -- same as messages.conversation_id
  user_a_id       uuid not null references auth.users(id) on delete cascade,
  user_b_id       uuid not null references auth.users(id) on delete cascade,
  listing_id      uuid references public.listings(id) on delete set null,
  last_message_id uuid references public.messages(id) on delete set null,
  last_message_at timestamptz not null default now(),
  check (user_a_id < user_b_id)                      -- enforce sorted-pair invariant
);
create index conversations_user_a_idx on public.conversations(user_a_id, last_message_at desc);
create index conversations_user_b_idx on public.conversations(user_b_id, last_message_at desc);

-- Reports
create table public.chat_reports (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 500),
  created_at  timestamptz not null default now(),
  unique (message_id, reporter_id)
);
create index chat_reports_message_idx on public.chat_reports(message_id);
```

Differences vs Prisma today:
- `uuid` PKs everywhere (replace cuid).
- Explicit FKs on `sender_id`, `recipient_id`, `listing_id`.
- Added `listing_id` on `messages` (today it's accepted in the request payload but **not stored**).
- Added `conversations` denormalized table to support inbox listing (current schema cannot list inboxes efficiently).
- Composite index `(conversation_id, created_at desc)` for pagination.
- DB-level constraint `sender_id <> recipient_id` (currently only enforced in handler logic — actually **not enforced at all today**, see §4.3 gap).
- `flagged_reason` is a check-constrained enum.

---

## 2. CURRENT MESSAGE ROUTES

Mounted at `/api/messages` (`backend/src/index.ts:81`). All require auth via the global middleware (`backend/src/index.ts:36-45`).

### 2.1 `POST /api/messages` — send message

Source: `backend/src/routes/messages.ts:29-75`.

**Request body** (Zod, from `shared/contracts.ts`):
```ts
sendMessageRequestSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
  imageHash: z.string().optional(),
  listingId: z.string().optional(),     // accepted but NOT persisted today
});
```

**Behavior**
1. `c.get("user")` → 401 if null.
2. `sendMessageRequestSchema.parse(body)` → 500 on throw (should be 400 — gap).
3. `conversationId = getConversationId(user.id, data.recipientId)`.
4. `moderation = moderateMessage(data.content)` — URL + off-platform sanitization.
5. If `imageUrl && imageHash` → `detectImageSpam(db, user.id, imageHash)`.
6. Compose `isHidden = moderation.isHidden || imageSpamResult.isSuspicious`, `flaggedReason = moderation.flaggedReason ?? imageSpamResult.reason`.
7. `db.message.create({ data: { ... sanitizedContent, imageUrl, imageHash, isHidden, flaggedReason } })`.
8. Return `{ message, showSenderTooltip, senderTooltip? }`.

**Response**
```ts
sendMessageResponseSchema = z.object({
  message: messageSchema,
  showSenderTooltip: z.boolean(),
  senderTooltip: z.string().optional(),
});
```

Tooltip copy: `"Links are blocked for safety. Please share details without links."`

### 2.2 `GET /api/messages/:recipientId` — read conversation

Source: `backend/src/routes/messages.ts:78-99`.

**Behavior**
1. Auth required.
2. `conversationId = getConversationId(user.id, recipientId)`.
3. Query:
   ```ts
   db.message.findMany({
     where: {
       conversationId,
       OR: [{ isHidden: false }, { senderId: user.id }],
     },
     orderBy: { createdAt: "asc" },
   })
   ```
4. Response: `{ messages: Message[] }`.

No pagination, no limit, no cursor.

### 2.3 `POST /api/messages/report` — report message

Source: `backend/src/routes/messages.ts:102-140`.

**Request body**
```ts
reportMessageRequestSchema = z.object({
  messageId: z.string(),
  reason: z.string().min(1).max(500),
});
```

**Behavior**
1. Auth required.
2. Fetch message → 404 if missing.
3. Insert `chat_report { messageId, reporterId, reason }`.
4. `db.message.update({ id }, { isHidden: true, flaggedReason: "reported" })` — immediate soft-hide.
5. `addStrike(db, message.senderId, "Reported: <reason>")` — 90-day strike on the message sender.
6. Response: `{ success: true, message: "Report submitted" }`.

**Gaps:** no check that the reporter is sender or recipient; no rate limit; no dedupe (same user can report the same message N times and each call hides it again + adds a strike).

### 2.4 Other chat-related endpoints

**None.** No list-conversations endpoint, no mark-as-read, no delete, no edit, no typing, no block, no unblock. The mobile app has **no inbox UI** — only an AI assistant chat (`mobile/src/components/AssistantChat.tsx`) and a TODO at `mobile/src/.../demo-browse.tsx:508`.

---

## 3. CONVERSATION MODEL

### 3.1 How `conversation_id` is generated

```ts
// backend/src/routes/messages.ts:17-20
function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}
```

Lexicographic sort of the two user IDs joined by `_`. Same pair always yields the same ID regardless of direction.

### 3.2 Sorted participant logic

Sort ensures `getConversationId(A,B) === getConversationId(B,A)`. No conversation row needs to exist — the column is just a derived key on `Message`.

### 3.3 Listing context behavior

`SendMessageRequest.listingId` is accepted in the Zod schema but **dropped** before the DB insert (it does not appear in `db.message.create({ data: ... })`). So today:
- One conversation between A and B = one bucket of messages, regardless of how many listings prompted them.
- The UI cannot show "this thread was started from listing X."

### 3.4 Can one conversation span multiple listings?

Yes — today it does, by accident. Pair (A, B) shares a single thread for every listing they have ever talked about.

### 3.5 Recommended V1 approach

Two options; pick **Option B** for V1.

**Option A (status quo, fix listing context):** keep conversation = sorted-pair, persist `listing_id` per message, render the listing card per-message in the UI.

**Option B (per-listing conversations, recommended):**
- `conversation_id = sha256(sort([a,b]).join('_') + '|' + (listing_id ?? 'none'))` (or just a stored `conversations` row PK).
- A new `conversations` table (see §1.3) is the source of truth and is upserted on first message.
- Inbox listing becomes a cheap query on `conversations` for `(user_a_id = me OR user_b_id = me)` ordered by `last_message_at`.
- Each thread visibly belongs to one listing (or "general").

Migration of legacy data: bucket existing rows by `(sender_id, recipient_id, sorted)` into a single "general" conversation per pair; no listing attribution is possible after the fact.

---

## 4. SEND MESSAGE BEHAVIOR

### 4.1 Auth required
Yes. Global middleware (`backend/src/index.ts:36-45`) populates `c.get("user")`. Handler returns 401 if null.

### 4.2 Validation
Zod (`shared/contracts.ts`):
- `recipientId`: non-empty string.
- `content`: 1-2000 chars after trimming-not-applied (raw `.min(1).max(2000)`).
- `imageUrl`: optional string (no URL format check).
- `imageHash`: optional string.
- `listingId`: optional string (currently dropped pre-insert).

### 4.3 Recipient cannot equal sender
**NOT enforced today.** A user can send messages to themselves; the handler will happily insert a row with `senderId === recipientId`. **V1 must add a check** at handler and DB level (`check (sender_id <> recipient_id)`).

### 4.4 Content min/max
- Min: 1 char (Zod `.min(1)`).
- Max: 2000 chars (Zod `.max(2000)`).
- Post-sanitization, content can be shorter (URLs replaced with `[Link removed for safety]`).

### 4.5 `image_url` behavior
- Optional string field on request; stored verbatim if present.
- No format validation, no domain allow-list, no upload-flow verification.
- V1 must validate the URL is on our Supabase storage / signed-upload domain.

### 4.6 `image_hash` behavior
- Optional client-supplied hash (presumably perceptual or sha256 of the upload).
- Used **only** as the lookup key in `detectImageSpam`.
- No verification that the hash matches `image_url`'s contents.
- V1: compute server-side after upload to prevent spoofing.

### 4.7 Moderation pipeline

`backend/src/lib/chat-moderation.ts`.

**Text — `moderateMessage(content)`**
- URL patterns (regex array):
  - `https?:\/\/[^\s]+`
  - `www\.[^\s]+`
  - `[a-zA-Z0-9-]+\.(com|net|org|io|co|me|app|link|ly|bit\.ly|goo\.gl|tinyurl|t\.co)[^\s]*`
- Off-platform patterns: `whatsapp`, `telegram`, `instagram`, `facebook messenger`, `signal app`, `viber`, `wa.me`, `t.me`, `ig:`, `+\d{10,}` (phone numbers), `@handle on (insta|telegram|whatsapp)`.
- Matched substrings → replaced with `[Link removed for safety]`.
- Sets `flaggedReason` to `"url"` or `"off_platform"` (URL wins if both match).
- Sets `isHidden = true` whenever any pattern matched.
- Sets `showSenderTooltip = true` to surface the sender-side warning.

**Image — `detectImageSpam(db, senderId, imageHash, window=5min, threshold=3)`**
- Looks back 5 minutes for messages from this sender with the same `imageHash`, distinct on `recipientId`.
- If ≥ 3 distinct recipients → `{ isSuspicious: true, reason: "image_spam" }`.
- Note: the check runs **before** inserting the current message, so the 3rd distinct recipient is the one that gets hidden (counts the 2 prior + we're about to be the 3rd).

### 4.8 DB write
Single `prisma.message.create` with sanitized content and the combined moderation flags. No transaction, no outbox, no event emission today.

### 4.9 Response shape

```json
{
  "message": {
    "id": "ckxxxx",
    "conversationId": "uA_uB",
    "senderId": "uA",
    "recipientId": "uB",
    "content": "Sanitized content",
    "imageUrl": null,
    "isHidden": false,
    "flaggedReason": null,
    "createdAt": "2026-05-12T12:00:00.000Z"
  },
  "showSenderTooltip": false,
  "senderTooltip": null
}
```
Note: `imageHash` is NOT returned in `transformMessage` (`backend/src/routes/messages.ts:23-26`).

### 4.10 Hidden-message behavior
- The row is always written. `isHidden = true` simply means the GET filter hides it from non-senders.
- The sender always sees their own message even if moderation hid it (renders normally on their side; UI may decorate it with a "this message was hidden from the recipient" tooltip).
- The recipient sees nothing — no placeholder. V1 recommendation: render a "Message hidden for safety" stub for the recipient so they aren't ghosted.

---

## 5. READ CONVERSATION BEHAVIOR

### 5.1 Who can read
Only via `GET /api/messages/:recipientId`. The caller is implicit; the conversation = `sort([me, recipientId])`. A third party calling this endpoint with two strangers' IDs gets back **their own** conversation with the recipient, not theirs — so accidental leakage is structurally impossible, but a third party also has no API to peek at someone else's thread. ✓

### 5.2 Pagination
**None.** All messages returned in one shot.
V1: cursor `(created_at, id)` with `limit` (default 30, max 100).

### 5.3 Ordering
`createdAt asc` (oldest first). V1 inbox UI typically wants newest-first or load-older-on-scroll; pick a direction and stick to it.

### 5.4 Hidden messages
`OR: [{ isHidden: false }, { senderId: user.id }]` — visible to sender always, to recipient only when `isHidden = false`.

### 5.5 Deleted users
No referential integrity today. If a user row is deleted, messages remain with a dangling `senderId` / `recipientId`. V1: `on delete cascade` and a deleted-user "ghost" rendering in the UI.

### 5.6 Deleted listings
Listing context is not stored today, so listing deletion does not affect chat. V1 with stored `listing_id` should `on delete set null` + show "Listing removed" in the context card.

### 5.7 Blocked / held users
- No block model exists.
- `User.isHeld` and `User.restrictedMode` are honored only in tokens / fraud flows — **not enforced at message send/read** today. V1: held users cannot send (handler check); recipients cannot see held users' messages until cleared.

---

## 6. INBOX UI SPEC (V1)

**Current state:** no inbox UI in the mobile app. AI Assistant chat exists (`mobile/src/components/AssistantChat.tsx`) — not peer-to-peer.

### 6.1 Routes (web)

- `/[locale]/inbox` — conversation list.
- `/[locale]/inbox/[conversationId]` — single thread.
- `/[locale]/inbox/new?recipientId=...&listingId=...` — composer (also accessible from listing CTA).

### 6.2 Desktop 2-pane layout

```
+--------------------------------------------------------+
| Inbox                                                  |
+----------------------+---------------------------------+
| Search…              | <Listing card if context>       |
| ┌────────────────┐   | ───────────────────────────────│
| │ Jane • 2m      │   |                                 |
| │ "see pic →"  3 │   |   [messages scroll area]        |
| ├────────────────┤   |                                 |
| │ Carlos • 1h    │   |                                 |
| │ "thanks"       │   |                                 |
| └────────────────┘   | ───────────────────────────────│
|                      | [composer • 2000 chars • send]  |
+----------------------+---------------------------------+
```

- Left pane (~360px): conversation list, virtualized.
- Right pane: selected thread; empty state if none selected.
- Sticky listing card at top of right pane (collapsible).
- Composer pinned at bottom.

### 6.3 Mobile layout (React Native)

- `/[locale]/inbox` → full-screen conversation list.
- Tap row → push `/[locale]/inbox/[conversationId]` (or use `expo-router` `Stack`).
- Header back button. No 2-pane.
- Pull-to-refresh on list.
- Listing card pinned below header on thread route.
- Composer pinned to keyboard.

### 6.4 Conversation preview row

Fields shown:
- Counterparty avatar + display name.
- Last message snippet (`isHidden` for current user → render `"Message hidden for safety"`).
- `last_message_at` relative time ("2m", "Tue", "May 4").
- Unread badge (see §6.5).
- Small listing thumbnail or text label (when per-listing conversations land — §3.5 Option B).

Data shape from new endpoint `GET /api/inbox`:
```ts
{
  conversations: [{
    conversationId: string,
    counterpartyId: string,
    counterparty: { id, displayName, avatarUrl },
    listing?: { id, title, thumbnailUrl, status },
    lastMessage: { content, createdAt, senderId, isHidden, flaggedReason },
    unreadCount: number,
  }]
}
```

### 6.5 Unread count

**Feasibility today: NO** — no `read_at` / `last_seen_at` tracking exists.

V1 minimum:
- Add `conversation_read_state(user_id, conversation_id, last_read_at timestamptz)` table.
- Mark-as-read on thread open: `POST /api/messages/:conversationId/read` (server upserts `last_read_at = now()`).
- Inbox preview `unreadCount = count(messages where conversation_id = X and recipient_id = me and created_at > last_read_at and is_hidden = false)`.

### 6.6 Listing card context

Above messages, render:
- Thumbnail
- Title
- Price + status pill (active / sold / removed)
- "View listing" button

If `listing.status === "removed"` → render disabled card "Listing removed."

### 6.7 Message composer

- Multiline text input, max 2000 chars.
- Char counter at 1800+.
- Image attach button → upload to Supabase storage → POST with `imageUrl` + server-computed `imageHash`.
- Send button disabled when empty / over limit / send in flight.
- On send error: keep draft, show inline retry.

### 6.8 Moderation tooltip

When response includes `showSenderTooltip: true`, render an inline toast/banner under the input:

> "Links are blocked for safety. Please share details without links."

Auto-dismiss after 6s; do not block subsequent sends.

### 6.9 Report message action

- Long-press (mobile) / "⋯" menu (web) on a message you did not send.
- Modal: reason `<textarea>` 1-500 chars + Cancel/Report buttons.
- `POST /api/messages/report { messageId, reason }`.
- On success: render the message dimmed with "Reported. Hidden from view."

### 6.10 States

| State | Inbox list | Thread |
|---|---|---|
| Loading | Skeleton 5 rows | Skeleton bubbles |
| Empty | "No conversations yet. Message a seller from any listing to start." + CTA → browse | "Say hi 👋" placeholder above composer |
| Error | "Couldn't load inbox. Retry." | "Couldn't load messages. Retry." |
| Offline | Cached list + offline banner | Cached messages + disabled composer |

---

## 7. RLS POLICIES (Supabase)

Assumes Supabase auth with `auth.uid()` available and the tables in §1.3.

```sql
alter table public.messages       enable row level security;
alter table public.conversations  enable row level security;
alter table public.chat_reports   enable row level security;

-- 7.1 Messages: sender + recipient can read non-hidden; sender always sees own
create policy messages_select_participant on public.messages
for select using (
  (auth.uid() = sender_id)
  or (auth.uid() = recipient_id and is_hidden = false)
);

-- 7.2 Sender insert only as self
create policy messages_insert_as_self on public.messages
for insert with check (
  auth.uid() = sender_id
  and sender_id <> recipient_id
  -- block held / restricted users
  and not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.is_held = true
        or (u.restricted_mode = true and (u.restricted_until is null or u.restricted_until > now())))
  )
);

-- 7.3 No updates / deletes from clients (moderation done server-side)
-- (omitting update/delete policies = denied by default with RLS on)

-- 7.4 Staff / moderator read-all (via role claim or staff table)
create policy messages_select_staff on public.messages
for select using (
  exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role in ('moderator','super_admin'))
);

-- 7.5 Conversations: only participants
create policy conversations_select on public.conversations
for select using (auth.uid() in (user_a_id, user_b_id));

create policy conversations_select_staff on public.conversations
for select using (
  exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role in ('moderator','super_admin'))
);

-- 7.6 Chat reports: insert by participants; read own + staff
create policy chat_reports_insert on public.chat_reports
for insert with check (
  auth.uid() = reporter_id
  and exists (
    select 1 from public.messages m
    where m.id = message_id and auth.uid() in (m.sender_id, m.recipient_id)
  )
);

create policy chat_reports_select_own on public.chat_reports
for select using (auth.uid() = reporter_id);

create policy chat_reports_select_staff on public.chat_reports
for select using (
  exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role in ('moderator','super_admin'))
);
```

### 7.7 Hidden message visibility rules (summary)

| Viewer | `is_hidden = false` | `is_hidden = true` |
|---|---|---|
| Sender | ✅ visible | ✅ visible (with "hidden from recipient" tooltip) |
| Recipient | ✅ visible | ❌ blocked by RLS |
| Third party (non-staff) | ❌ blocked (not a participant) | ❌ blocked |
| Moderator / Super Admin | ✅ visible | ✅ visible (review queue) |

---

## 8. ABUSE CONTROLS

### 8.1 Rate limits

**Today:** none on `/api/messages/*` (gap — `backend/src/lib/rate-limiter.ts` exists but is not wired here).

**V1 targets** (per-user, sliding window):
- Send: 30 / min, 300 / hour.
- Report: 10 / hour, 30 / day.
- Get conversation: 120 / min.

Use `userRateLimiter(senderId)` with Redis or Supabase `pgmq`-style counter.

### 8.2 Off-platform moderation
See §4.7. Regex-based; runs synchronously on every send; replaces matched substrings with `[Link removed for safety]` and sets `is_hidden = true`, `flagged_reason = "url" | "off_platform"`.

### 8.3 Image spam
`detectImageSpam` (§4.7). Same `image_hash` to ≥3 distinct recipients within 5 minutes → mark the 3rd (and later) `is_hidden = true`, `flagged_reason = "image_spam"`. Earlier 2 messages stay visible (this is a known limitation; consider a follow-up sweep to hide retroactively on threshold hit).

### 8.4 Held / restricted user behavior

| Flag | Effect today | Effect V1 |
|---|---|---|
| `is_held` | Tokens disabled | + cannot send messages; existing messages soft-hidden until resolved |
| `restricted_mode` + `restricted_until > now()` | None on chat | Cannot send; 7-day cooldown enforced |
| `fraud_score >= 80` | Triggers `applyFraudHold` | Same; cascades to all entity types in `fraud_hold` |

Enforcement points (V1):
- RLS `messages_insert_as_self` policy (see §7.2).
- Handler-side check returning 403 with reason code so the UI can show the right copy ("Your account is under review. Contact support.").

### 8.5 Message report thresholds (from `ModerationConfig`)
- `privateReportThreshold = 2` reports / 24h → auto-hide all messages from the offender on private threads.
- `storeReportThreshold = 5` reports / 24h → same for store / business accounts.
- `cooldownDays = 7`, `limitedStateDays = 7`, `strikeDecayDays = 90`, `fraudHoldThreshold = 80`.

These are stored in `moderation_config` and admin-tunable; the runtime today only honors `strikeDecayDays` (hardcoded as 90 in `addStrike`). V1 must read from `ModerationConfig` at request time.

### 8.6 Audit logs

`AuditLog` model exists (`backend/prisma/schema.prisma:300-316`). V1 should write `audit_log` rows for:
- `message.hide` (auto-mod or report-triggered).
- `message.report.create`.
- `user.strike.add`.
- `user.hold.apply` / `user.hold.resolve`.

Fields per entry: `actor_id`, `actor_role`, `action`, `entity_type='message'`, `entity_id`, `details` (JSON: reason, source, original content hash), `ip_address`.

---

## 9. TESTS

All tests target the V1 endpoints. Each is a happy-path or moderation assertion. Pseudocode (Vitest + Supabase test client):

### 9.1 Sender can see own message (even if hidden)
```ts
test("sender sees own message even when moderation hid it", async () => {
  const { token } = await signIn("alice");
  const res = await api.post("/api/messages", { recipientId: bob.id, content: "Check whatsapp" }, token);
  expect(res.message.isHidden).toBe(true);
  expect(res.message.flaggedReason).toBe("off_platform");

  const list = await api.get(`/api/messages/${bob.id}`, token);
  expect(list.messages).toContainEqual(expect.objectContaining({ id: res.message.id }));
});
```

### 9.2 Recipient can see non-hidden message
```ts
test("recipient sees clean message", async () => {
  await sendAs("alice", { recipientId: bob.id, content: "Hi!" });
  const list = await api.get(`/api/messages/${alice.id}`, bobToken);
  expect(list.messages.at(-1).content).toBe("Hi!");
});
```

### 9.3 Recipient cannot see hidden flagged message
```ts
test("recipient cannot see message flagged as off_platform", async () => {
  await sendAs("alice", { recipientId: bob.id, content: "ping me on telegram" });
  const list = await api.get(`/api/messages/${alice.id}`, bobToken);
  expect(list.messages.some(m => m.flaggedReason === "off_platform")).toBe(false);
});
```

### 9.4 Third party cannot read conversation
```ts
test("third party gets their own (empty) conversation, not someone else's", async () => {
  await sendAs("alice", { recipientId: bob.id, content: "secret" });
  // Carol queries with Bob's id — she'd get conv(carol, bob), which is empty.
  const list = await api.get(`/api/messages/${bob.id}`, carolToken);
  expect(list.messages).toEqual([]);
});
// V1 additionally: SELECT directly on messages with carol's JWT → 0 rows (RLS).
```

### 9.5 URL is replaced
```ts
test("URLs are stripped from content", async () => {
  const res = await sendAs("alice", { recipientId: bob.id, content: "see https://evil.example/promo for deal" });
  expect(res.message.content).toBe("see [Link removed for safety] for deal");
  expect(res.message.flaggedReason).toBe("url");
  expect(res.showSenderTooltip).toBe(true);
});
```

### 9.6 Phone number is hidden / replaced
```ts
test("phone numbers are masked and message hidden", async () => {
  const res = await sendAs("alice", { recipientId: bob.id, content: "call me +14155551234" });
  expect(res.message.content).not.toContain("+14155551234");
  expect(res.message.flaggedReason).toBe("off_platform");
  expect(res.message.isHidden).toBe(true);
});
```

### 9.7 Image spam: third recipient hidden
```ts
test("same image to 3 recipients in 5 min hides the 3rd", async () => {
  const hash = "h-abc";
  await sendAs("alice", { recipientId: bob.id,   content: "👀", imageUrl: "u", imageHash: hash });
  await sendAs("alice", { recipientId: carol.id, content: "👀", imageUrl: "u", imageHash: hash });
  const third = await sendAs("alice", { recipientId: dave.id, content: "👀", imageUrl: "u", imageHash: hash });
  expect(third.message.isHidden).toBe(true);
  expect(third.message.flaggedReason).toBe("image_spam");
});
```

### 9.8 Held user cannot send
```ts
test("held user is blocked from sending", async () => {
  await db.user.update({ where: { id: alice.id }, data: { isHeld: true } });
  const res = await api.postRaw("/api/messages", { recipientId: bob.id, content: "hi" }, aliceToken);
  expect(res.status).toBe(403);
  expect(res.body.error).toMatch(/account.*review|held/i);
});
```

### 9.9 (Additional) Sender cannot equal recipient
```ts
test("rejects messages where sender == recipient", async () => {
  const res = await api.postRaw("/api/messages", { recipientId: alice.id, content: "hi" }, aliceToken);
  expect(res.status).toBe(400);
});
```

### 9.10 (Additional) Report soft-hides and adds strike
```ts
test("report hides message and increments strike on sender", async () => {
  const sent = await sendAs("alice", { recipientId: bob.id, content: "hi" });
  await api.post("/api/messages/report", { messageId: sent.message.id, reason: "spam" }, bobToken);

  const list = await api.get(`/api/messages/${alice.id}`, bobToken);
  expect(list.messages.find(m => m.id === sent.message.id)).toBeUndefined();

  const strikes = await db.userStrike.count({ where: { userId: alice.id, expiresAt: { gt: new Date() } } });
  expect(strikes).toBeGreaterThanOrEqual(1);
});
```

---

## 10. KNOWN GAPS / V1 MUST-FIX

1. **No inbox-listing endpoint** — add `GET /api/inbox` backed by the `conversations` table.
2. **No rate limits** on `/api/messages/*` — wire `userRateLimiter`.
3. **`listingId` accepted but not persisted** — add the column and use it.
4. **No `sender !== recipient` check** in handler or DB.
5. **No FKs on `senderId` / `recipientId`** — add with `on delete cascade`.
6. **No mark-as-read / unread count** infrastructure — add `conversation_read_state` (or per-user `last_read_at` on `conversations`).
7. **Held / restricted users can send** — enforce at handler + RLS.
8. **No mobile inbox UI** — implement per §6.
9. **Validation errors return 500** — change to 400.
10. **`ModerationConfig` is mostly unused at runtime** — read thresholds from DB instead of hardcoded constants.
