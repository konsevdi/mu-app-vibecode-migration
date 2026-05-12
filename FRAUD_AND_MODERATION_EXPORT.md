# FRAUD AND MODERATION EXPORT — Mobile Unit

Date: 2026-05-12
Source: actual current implementation at `/home/user/workspace` (Vibecode tree).
Authoritative files (all paths relative to repo root):
- `backend/src/lib/fraud-scoring.ts`
- `backend/src/lib/chat-moderation.ts`
- `backend/src/lib/missive.ts`
- `backend/src/routes/listings.ts`
- `backend/src/routes/messages.ts`
- `backend/prisma/schema.prisma`
- `shared/contracts.ts`

Scope: V1 = Rhodes only. iRepair is the only partner brand (`isStore = true` listings). Greek copy uses UPPERCASE without accents.

---

## 1. Pricing Anomaly Detection

### 1.1 Source
- File: `backend/src/lib/fraud-scoring.ts`
- Functions: `checkPricingAnomaly`, `performFraudCheck`, `calculateNewFraudScore`

### 1.2 Constants (verbatim, lines 3–22)

```ts
const FRAUD_THRESHOLD = 80;
const PRIVATE_REPORT_LIMIT = 2;
const STORE_REPORT_LIMIT = 5;
const RESTRICTED_COOLDOWN_DAYS = 7;

const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  "phone_new":         { min: 200, max: 1500 },
  "phone_like_new":    { min: 150, max: 1200 },
  "phone_good":        { min: 100, max:  800 },
  "phone_fair":        { min:  50, max:  400 },
  "tablet_new":        { min: 150, max: 1200 },
  "tablet_like_new":   { min: 100, max:  900 },
  "tablet_good":       { min:  80, max:  600 },
  "tablet_fair":       { min:  40, max:  300 },
  "accessory_new":     { min:   5, max:  200 },
  "accessory_like_new":{ min:   3, max:  150 },
  "accessory_good":    { min:   2, max:  100 },
  "accessory_fair":    { min:   1, max:   50 },
};
```

### 1.3 Rules (verbatim, lines 33–54)

- Key format: `${category}_${condition}` (e.g. `phone_good`).
- **Stores are exempt**: if `isStore === true` the check returns `{ isSuspicious: false, scoreIncrease: 0 }` immediately.
- **Missing ranges are not anomalies**: if `PRICE_RANGES[key]` is undefined the check returns `{ isSuspicious: false, scoreIncrease: 0 }`. This silently exempts `laptop_*` and any `*_parts` row — `category="laptop"` is valid per `categorySchema` and `condition="parts"` is valid per `conditionSchema`, but no `PRICE_RANGES` entries exist for them. **Migration risk: add explicit entries on Supabase port.**
- Suspicion bands:
  - `price < range.min * 0.30` → `{ isSuspicious: true, scoreIncrease: 25 }` (severe)
  - `price < range.min * 0.50` → `{ isSuspicious: true, scoreIncrease: 15 }` (mild)
  - else → `{ isSuspicious: false, scoreIncrease: 0 }`

### 1.4 Score math
- `calculateNewFraudScore(currentScore, increase) = Math.min(100, Math.max(0, currentScore + increase))` (clamped to `[0, 100]`).
- Threshold to hold: `newScore >= FRAUD_THRESHOLD` (80).
- Strike side-effect inside `performFraudCheck`: `addStrike = priceCheck.scoreIncrease >= 20`. So **only +25 (severe) adds a strike; +15 (mild) does not**.

### 1.5 Call site (private listing creation only)
`backend/src/routes/listings.ts:156-194` — POST `/api/listings`:
```ts
const fraudResult = await performFraudCheck(
  db, listing.id, data.price, data.category, data.condition,
  false,  // isStore — every POST treats the listing as private
  0, 0    // currentFraudScore=0 because the listing was just created
);
if (fraudResult.newScore > 0)  await db.listing.update({ where:{id:listing.id}, data:{ fraudScore: fraudResult.newScore } });
if (fraudResult.addStrike)     await addStrike(db, user.id, `Pricing anomaly: ${data.price}`);
if (fraudResult.shouldHold) {
  await applyListingFraudHold(db, listing.id, fraudResult.newScore, fraudResult.reason || "fraud_threshold");
  await applyFraudHold(db, user.id, FRAUD_THRESHOLD, "listing_fraud");
  await createMissiveFraudDraft({ … });
  return c.json({ error: "Listing under review", held: true }, 202);
}
```

> Note: `isStore` is hard-coded `false` at the call site. Store listings (`isStore = true`) are created through a different path and skip this check entirely. The store exemption inside `checkPricingAnomaly` is therefore a belt-and-braces guard, not the primary mechanism.

> Note: a single private listing can never cross 80 from pricing alone (max +25). The 80 threshold is only reachable on POST if `currentFraudScore` is pre-loaded — which it isn't (`0, 0` hard-coded). In practice the pricing path produces strikes and `fraudScore=25`, but the hold/Missive branch is unreachable from POST `/api/listings` today. **Migration risk: pass real `currentFraudScore` to `performFraudCheck` if pricing-driven holds are desired.**

---

## 2. Grade Multipliers (iRepair Inspection)

### 2.1 Source
- Canonical constants: `shared/contracts.ts:37-42`
- Admin-configurable per-store overrides: `backend/prisma/schema.prisma` model `GradeConfig` (lines 334–346)
- Greek labels + colors (mobile): `mobile/src/lib/verification.ts`

### 2.2 Multipliers (verbatim, `shared/contracts.ts`)
```ts
export const GRADE_MULTIPLIERS = {
  A: 1.00,
  B: 0.93,
  C: 0.85,
  D: 0.60,
} as const;
```

### 2.3 Grade labels (Greek, UPPERCASE, no accents)
- A → `ΑΡΙΣΤΗ`   color `#00FF88`
- B → `ΚΑΛΗ`     color `#00BFFF`
- C → `ΜΕΤΡΙΑ`    color `#FFD700`
- D → `ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ` color `#FF6B6B`

### 2.4 Pricing bands by condition (% of new price)
From `shared/contracts.ts:28-34` — used by the seller's suggested-price tool (NOT by the anti-fraud check; that uses absolute EUR amounts in `PRICE_RANGES`):
```ts
PRICING_BANDS = {
  new:      { min: 85, max: 95 },
  like_new: { min: 75, max: 88 },
  good:     { min: 60, max: 75 },
  fair:     { min: 40, max: 60 },
  parts:    { min: 10, max: 35 },
};
```

### 2.5 `GradeConfig` model (Prisma)
```prisma
model GradeConfig {
  id        String   @id @default(cuid())
  storeId   String?  // null = global config
  gradeA    Float    @default(1.00)
  gradeB    Float    @default(0.93)
  gradeC    Float    @default(0.85)
  gradeD    Float    @default(0.60)
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("grade_config")
}
```

### 2.6 `Inspection` model
```prisma
model Inspection {
  id            String   @id @default(cuid())
  listingId     String
  storeId       String
  store         Store    @relation(fields: [storeId], references: [id])
  inspectorId   String  // Staff userId
  grade         String  // "A", "B", "C", "D"
  checklistJson String  // JSON object with checklist items
  notes         String?
  inspectedAt   DateTime @default(now())
}
```

`Listing.checklistComplete: Boolean` plus `Listing.grade: String?` are the verification flags read by the `verifiedOnly` filter at `listings.ts:43-46` (`where.grade = { not: null }; where.checklistComplete = true`).

---

## 3. Fraud Holds (user + listing)

### 3.1 Source
- File: `backend/src/lib/fraud-scoring.ts:104-155`
- Model: `backend/prisma/schema.prisma` `FraudHold` (lines 178–191)

### 3.2 `FraudHold` model (verbatim)
```prisma
model FraudHold {
  id             String   @id @default(cuid())
  entityType     String   // "user", "listing", "chat", "service", "appointment"
  entityId       String
  fraudScore     Int
  reason         String
  missiveDraftId String?
  resolvedAt     DateTime?
  resolvedBy     String?  // Super Admin ID
  createdAt      DateTime @default(now())
  @@index([entityId])
}
```

### 3.3 `applyFraudHold(db, userId, fraudScore, reason)` — user hold (verbatim, lines 104-131)
Updates `User`:
- `fraudScore`         = passed score
- `isHeld`             = true
- `restrictedMode`     = true
- `restrictedUntil`    = `new Date(Date.now() + 7 * 24*60*60*1000)`  (7-day cooldown)
- `tokensDisabled`     = true

Then inserts `FraudHold { entityType: "user", entityId: userId, fraudScore, reason }`.

### 3.4 `applyListingFraudHold(db, listingId, fraudScore, reason): Promise<string>` (verbatim, lines 134-155)
Updates `Listing`:
- `fraudScore` = passed score
- `isHeld`     = true
- `isActive`   = false

Then inserts `FraudHold { entityType: "listing", entityId: listingId, fraudScore, reason }` and returns `hold.id`.

### 3.5 Hold triggers in code
| Trigger | File:line | What happens |
|---|---|---|
| Severe pricing anomaly when `newScore >= 80` on POST `/api/listings` | `routes/listings.ts:180-194` | `applyListingFraudHold` + `applyFraudHold(user, 80, "listing_fraud")` + Missive draft + HTTP 202 `{ error: "Listing under review", held: true }`. *(See §1.5 note — currently unreachable until `currentFraudScore` is plumbed in.)* |
| Auto-hide from 24h report threshold | `routes/listings.ts:309-331` | Sets `isActive=false`, `reportCount24h`, increments `fraudScore` by 10, addStrike to seller, Missive draft. **Does NOT insert `FraudHold`** — only the +80 path does. |

### 3.6 Release flow
- `FraudHold.resolvedAt` + `FraudHold.resolvedBy` are written by a Super Admin action (not present in source — admin UI lives outside this repo).
- `User.tokensDisabled = true` blocks token issuance in the appointment/token flow.
- POST `/api/listings` short-circuits with HTTP 403 `{ error: "Account is restricted. Contact support." }` when `dbUser.isHeld || dbUser.tokensDisabled` (`routes/listings.ts:127`).

---

## 4. Listing Reports (community moderation)

### 4.1 Source
File: `backend/src/routes/listings.ts:281-338` — POST `/api/listings/:id/report`

### 4.2 Flow (verbatim, lines 282-338)

```ts
const now = new Date();
const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

let newReportCount = listing.reportCount24h + 1;
if (listing.lastReportAt && listing.lastReportAt < twentyFourHoursAgo) {
  newReportCount = 1;  // reset window
}

const threshold = listing.isStore ? 5 : 2;
const shouldAutoHide = newReportCount >= threshold;

await db.listing.update({
  where: { id },
  data: {
    reportCount24h: newReportCount,
    lastReportAt: now,
    isActive: shouldAutoHide ? false : listing.isActive,
    fraudScore: { increment: 10 },
  },
});

await addStrike(db, listing.sellerId, `Listing reported: ${id}`);

if (shouldAutoHide) {
  await createMissiveFraudDraft({
    entityType: "listing",
    entityId: id,
    fraudScore: listing.fraudScore + 10,
    reason: `Auto-hidden: ${newReportCount} reports in 24h`,
    listingTitle: listing.title,
  });
}

return c.json({ success: true, autoHidden: shouldAutoHide });
```

### 4.3 Key facts
- **Threshold**: private listing = 2, store listing = 5, in any rolling 24h window.
- **Per-report damage**: every report adds +10 to `Listing.fraudScore` and a 90-day strike to the seller. There is no per-reporter dedupe — the same user reporting twice = 2 strikes on the seller. **Migration risk: add a unique index on `(messageId|listingId, reporterId)` in Supabase.**
- **Window reset**: if `lastReportAt < now - 24h`, the counter resets to 1. There is no per-report timestamp table; only a single `lastReportAt` and a running `reportCount24h`. This means the window slides only at the boundary — a report at t=0 and 23h59m later counts as 2; a third at t=24h01m resets to 1.
- **Auto-hide is non-destructive**: `isActive=false` but no `FraudHold` row, no `User.isHeld`. The seller can re-list (via a new POST) unless their score is independently held.
- **No reporter identity stored on the listing path**. The report itself isn't persisted on `Listing`; only the counter advances. For message reports a row IS persisted (see §6).

---

## 5. User Strikes

### 5.1 Source
- File: `backend/src/lib/chat-moderation.ts:99-115`
- Model: `backend/prisma/schema.prisma` `UserStrike` (lines 167–176)

### 5.2 Model (verbatim)
```prisma
model UserStrike {
  id        String   @id @default(cuid())
  userId    String
  reason    String
  createdAt DateTime @default(now())
  expiresAt DateTime // 90 days from creation
  @@index([userId])
}
```

### 5.3 Functions (verbatim)
```ts
export async function addStrike(db: any, userId: string, reason: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await db.userStrike.create({ data: { userId, reason, expiresAt } });
}

export async function getActiveStrikes(db: any, userId: string): Promise<number> {
  const now = new Date();
  const strikes = await db.userStrike.count({
    where: { userId, expiresAt: { gt: now } },
  });
  return strikes;
}
```

### 5.4 Where strikes are added
| Caller | File:line | Reason string |
|---|---|---|
| Severe pricing anomaly (+25) | `routes/listings.ts:175-177` | `` `Pricing anomaly: ${price}` `` |
| Any listing report | `routes/listings.ts:320` | `` `Listing reported: ${id}` `` |
| Any message report | `routes/messages.ts:141` | `` `Reported: ${reason}` `` |

### 5.5 Where strikes are read
- `getActiveStrikes` is **defined but never called** anywhere in the codebase. Strikes accumulate but nothing in source consumes the count (no escalation ladder, no auto-hold from N strikes). **Migration risk: build the threshold-driven escalation on the Supabase port (e.g. N strikes → `applyFraudHold`).**

### 5.6 Decay
- Decay is **passive**: rows are not deleted. `expiresAt` is set at write time. Active count = `count(*) WHERE expiresAt > now()`. No cron, no TTL.

---

## 6. Chat Moderation

### 6.1 Source
- File: `backend/src/lib/chat-moderation.ts`
- Route file: `backend/src/routes/messages.ts`
- Model: `backend/prisma/schema.prisma` `Message` (138-155), `ChatReport` (157-165)

### 6.2 URL regex set (verbatim, lines 4-8)
```ts
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|io|co|me|app|link|ly|bit\.ly|goo\.gl|tinyurl|t\.co)[^\s]*/gi,
];
```

### 6.3 Off-platform regex set (verbatim, lines 11-23)
```ts
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
  /\+\d{10,}/g,                                    // Phone numbers (E.164-ish, 10+ digits after +)
  /@[a-zA-Z0-9_]+\s*(on\s*)?(insta|telegram|whatsapp)/gi,
];
```

### 6.4 Strings (verbatim, lines 25-26)
```ts
const LINK_REMOVED_TEXT = "[Link removed for safety]";
const SENDER_TOOLTIP = "Links are blocked for safety. Please share details without links.";
```

### 6.5 `moderateMessage(content): ModerationResult` (verbatim, lines 35-66)
- Iterates `URL_PATTERNS` then `OFF_PLATFORM_PATTERNS`.
- For each pattern: if `pattern.test(content)` is true, **replace all matches in `sanitizedContent` with `"[Link removed for safety]"`**, set `flaggedReason` (`"url"` first; otherwise `"off_platform"`), set `showSenderTooltip = true`.
- After each pattern: `pattern.lastIndex = 0` to reset `/g`-flag state (the patterns are module-level, so state would leak across calls without this).
- Return:
```ts
{
  sanitizedContent,
  isHidden: flaggedReason !== null,
  flaggedReason,            // "url" | "off_platform" | null
  showSenderTooltip,
}
```

> Important behavior: `flaggedReason` is `"url"` if **any** URL pattern matched, regardless of off-platform matches. Only if no URL matched does the function fall through to `"off_platform"`. The regex `test` against original `content` followed by `replace` against `sanitizedContent` means later patterns can match on already-sanitized text — but `[Link removed for safety]` contains no domains/handles, so this is harmless in practice.

### 6.6 `detectImageSpam(db, senderId, imageHash, timeWindowMinutes=5, recipientThreshold=3)` (verbatim, lines 69-96)
- Returns `{ isSuspicious: false, reason: null }` immediately if `imageHash` is null.
- Queries: `db.message.findMany({ where: { senderId, imageHash, createdAt: { gte: now - 5min } }, select: { recipientId: true }, distinct: ["recipientId"] })`.
- If `length >= 3`, returns `{ isSuspicious: true, reason: "image_spam" }`.
- The check runs BEFORE the new message is inserted, so "3 distinct recipients" = 3 previous sends (the current attempt becomes the 4th send and is flagged). The current message itself is not counted in the query — so a sender becomes flagged starting with the message that brings the distinct count of priors to ≥3.

### 6.7 Send flow (`routes/messages.ts:29-74`)
```ts
const conversationId = getConversationId(user.id, data.recipientId);
const moderation = moderateMessage(data.content);

let imageSpamResult = { isSuspicious: false, reason: null };
if (data.imageUrl && data.imageHash) {
  imageSpamResult = await detectImageSpam(db, user.id, data.imageHash);
}

const flaggedReason = moderation.flaggedReason || imageSpamResult.reason;
const isHidden      = moderation.isHidden     || imageSpamResult.isSuspicious;

const message = await db.message.create({
  data: {
    conversationId, senderId: user.id, recipientId: data.recipientId,
    content: moderation.sanitizedContent,     // text is ALREADY sanitized
    imageUrl: data.imageUrl ?? null,
    imageHash: data.imageHash ?? null,
    isHidden, flaggedReason,
  },
});

return c.json({
  message: transformMessage(message),
  showSenderTooltip: moderation.showSenderTooltip,
  senderTooltip:   moderation.showSenderTooltip ? SENDER_TOOLTIP : undefined,
});
```

### 6.8 Conversation ID derivation
```ts
function getConversationId(userId1, userId2) { return [userId1, userId2].sort().join("_"); }
```
Sorted-then-joined-by-underscore. Symmetric (same ID regardless of which party initiates). **Migration risk: this is not URL-safe if user IDs ever contain underscores; today they're cuids so it's fine.**

### 6.9 Fetch flow (`routes/messages.ts:77-104`)
```ts
db.message.findMany({
  where: {
    conversationId,
    OR: [ { isHidden: false }, { senderId: user.id } ],
  },
  orderBy: { createdAt: "asc" },
});
```
Sender always sees their own messages (even flagged/sanitized ones — they see `[Link removed for safety]` substitutions). Recipient never sees hidden messages.

### 6.10 Report a message (`routes/messages.ts:107-148`)
```ts
await db.chatReport.create({ data: { messageId, reporterId: user.id, reason } });
await db.message.update({ where: { id: messageId }, data: { isHidden: true, flaggedReason: "reported" } });
await addStrike(db, message.senderId, `Reported: ${reason}`);
```
Reporting is destructive in one direction: the message is hidden immediately (no review), and the sender gets a strike. No per-reporter dedupe; no Missive draft for chat reports.

### 6.11 Message + ChatReport models
```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  recipientId    String
  content        String
  imageUrl       String?
  imageHash      String?      // SHA / perceptual hash supplied by client
  isHidden       Boolean  @default(false)
  flaggedReason  String?     // "url", "off_platform", "image_spam", "reported"
  createdAt      DateTime @default(now())
}

model ChatReport {
  id         String   @id @default(cuid())
  messageId  String
  reporterId String
  reason     String
  createdAt  DateTime @default(now())
}
```

---

## 7. Auto-Action Logs

### 7.1 Source
- Model: `backend/prisma/schema.prisma` `AutoActionLog` (lines 319-331)

### 7.2 Model (verbatim)
```prisma
model AutoActionLog {
  id         String   @id @default(cuid())
  entityType String  // "listing", "user", "message"
  entityId   String
  action     String  // "auto_hide", "auto_restrict", "strike_added"
  reason     String  // "report_threshold", "fraud_score", "url_detected", etc.
  details    String? // JSON with context
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### 7.3 Current usage
**`AutoActionLog` is declared but never written from anywhere in the source.** No `db.autoActionLog.create(...)` call exists.

The intended writers (per model documentation) are:
- pricing-anomaly hold → `entityType: "listing"`, `action: "auto_hide"`, `reason: "fraud_score"`
- 24h-report threshold auto-hide → `entityType: "listing"`, `action: "auto_hide"`, `reason: "report_threshold"`
- chat URL strip → `entityType: "message"`, `action: "auto_hide"`, `reason: "url_detected"` / `"off_platform"`
- image spam soft-hide → `entityType: "message"`, `action: "auto_hide"`, `reason: "image_spam"`
- any `addStrike` → `entityType: "user"`, `action: "strike_added"`, `reason: "..."` (currently only persisted as a `UserStrike` row)

**Migration to Supabase:** wire these writes in the same code paths. They are the operations dashboard's only source of truth for "what did the automation do today?".

---

## 8. Audit Log (admin actions)

### 8.1 Source
- Model: `backend/prisma/schema.prisma` `AuditLog` (lines 301-316)

### 8.2 Model (verbatim)
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String   // User/Staff who performed action
  actorRole  String?  // Role at time of action
  action     String   // "approve_listing", "reject_listing", "ban_user", etc.
  entityType String   // "listing", "user", "message", "appointment", etc.
  entityId   String
  details    String?  // JSON with additional context
  ipAddress  String?
  createdAt  DateTime @default(now())
  @@index([actorId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### 8.3 Current usage
**`AutoActionLog` and `AuditLog` are both unused from the backend in this repo.** Admin endpoints (approve/reject listing, release fraud hold, ban user) are not present under `backend/src/routes/`. The admin UI is implied (Staff model has roles `super_admin`, `admin`, `store_manager`, `moderator`) but its handlers are not in this tree.

### 8.4 Distinction
| Log | Written by | Captures |
|---|---|---|
| `AutoActionLog` | The system itself (fraud/moderation library code) | Automated decisions: auto-hide, auto-restrict, strike-added |
| `AuditLog` | A human staff member's action (admin route handler) | Who did what to whom from the admin console, including IP |

Both must be implemented on the Supabase port. Use `AuditLog` exclusively for staff-driven actions; never mix the two streams.

---

## 9. Missive Integration

### 9.1 Source
File: `backend/src/lib/missive.ts:1-69`

### 9.2 Configuration
- Env vars: `MISSIVE_API_KEY`, `MISSIVE_ORG_ID`.
- Shared label: `const MISSIVE_LABEL = "Mobile Unit Leads";`
- Endpoint: `POST https://public.missiveapp.com/v1/drafts`, `Authorization: Bearer ${MISSIVE_API_KEY}`.
- Graceful fallback: if either env var is missing, the function logs `[Missive] API key or org ID not configured, skipping draft` and returns `null` (no throw).

### 9.3 Payload shape (verbatim, lines 27-54)
```ts
const subject = `🚨 Fraud Hold: ${payload.entityType} ${payload.entityId.slice(0, 8)}`;
const body = `
Fraud Score: ${payload.fraudScore}/100
Entity Type: ${payload.entityType}
Entity ID: ${payload.entityId}
Reason: ${payload.reason}
${payload.userEmail ? `User Email: ${payload.userEmail}` : ""}
${payload.listingTitle ? `Listing: ${payload.listingTitle}` : ""}

Action Required: Super Admin approval needed to release hold.
Tokens and redemptions are blocked until cleared.
`.trim();

fetch(".../v1/drafts", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    drafts: { subject, body, organization: orgId, add_shared_labels: [MISSIVE_LABEL] },
  }),
});
```

### 9.4 Triggers
- POST `/api/listings` when `fraudResult.shouldHold` (`listings.ts:184-191`).
- POST `/api/listings/:id/report` when `shouldAutoHide` (`listings.ts:323-331`).
- Chat reports do **NOT** trigger Missive drafts.

---

## 10. Moderation Config (admin-configurable thresholds)

`backend/prisma/schema.prisma:349-362`
```prisma
model ModerationConfig {
  id                     String   @id @default(cuid())
  privateReportThreshold Int     @default(2)   // Auto-hide after X reports/24h
  storeReportThreshold   Int     @default(5)
  cooldownDays           Int     @default(7)
  limitedStateDays       Int     @default(7)
  strikeDecayDays        Int     @default(90)
  fraudHoldThreshold     Int     @default(80)
  updatedBy              String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

**The config table exists but is not read** by the runtime code. Today's runtime hard-codes:
- `PRIVATE_REPORT_LIMIT = 2`, `STORE_REPORT_LIMIT = 5` in `fraud-scoring.ts:4-5`
- Listing report threshold check `listing.isStore ? 5 : 2` in `listings.ts:306`
- `RESTRICTED_COOLDOWN_DAYS = 7` in `fraud-scoring.ts:6`
- `FRAUD_THRESHOLD = 80` in `fraud-scoring.ts:3`
- 90-day strike expiry in `chat-moderation.ts:100`

**Migration risk: load `ModerationConfig` once and have a getter; do not inline these constants. iRepair will want to tune them after launch.**

---

## 11. User Model — moderation-relevant columns

From `backend/prisma/schema.prisma:14-44`:

| Column | Type | Default | Used by |
|---|---|---|---|
| `trustEventCount` | Int | 0 | "Verified" badge = `n >= 2`. Frontend only; not blocking. |
| `fraudScore` | Int | 0 | Set by `applyFraudHold`. Compared to `FRAUD_THRESHOLD`. |
| `isHeld` | Boolean | false | POST `/api/listings` rejects with 403 when true (`listings.ts:127`). |
| `restrictedMode` | Boolean | false | Set by `applyFraudHold`. Consumed by mobile UI (flag-only here). |
| `restrictedUntil` | DateTime? | — | 7-day cooldown end. Set by `applyFraudHold`. Not enforced server-side here. |
| `tokensDisabled` | Boolean | false | POST `/api/listings` rejects with 403 when true. Also blocks the token-issuance flow elsewhere. |

---

## 12. Supabase Implementation Plan

Target stack: Postgres (Supabase) + Next.js 15 App Router + Vercel + Upstash Redis (optional cache) + Resend + Missive (optional).

### 12.1 Tables (1:1 with Prisma models)
- `users` (extends `auth.users` via FK; columns: `trust_event_count`, `fraud_score`, `is_held`, `restricted_mode`, `restricted_until`, `tokens_disabled`, `default_city`, `language_pref`)
- `listings`, `messages`, `chat_reports`, `user_strikes`, `fraud_holds`
- `audit_logs`, `auto_action_logs`
- `moderation_config` (single-row table; enforce with a `CHECK (id = 'singleton')` or RLS)
- `grade_configs` (1 row per `store_id`, plus 1 global row with `store_id IS NULL`)

### 12.2 RLS policies (sketch)
- `listings`: anyone can `SELECT WHERE is_active = true AND is_held = false AND status = 'approved'`. Owner can SELECT/UPDATE/DELETE their own. Staff (any active row in `staff` with `is_active = true`) bypass.
- `messages`: `SELECT WHERE conversation_id LIKE concat(...) AND (is_hidden = false OR sender_id = auth.uid())`. INSERT requires `sender_id = auth.uid()`.
- `user_strikes`, `fraud_holds`, `audit_logs`, `auto_action_logs`: staff-only.
- `moderation_config`, `grade_configs`: SELECT public (clients need thresholds for client-side UI hints), UPDATE staff-only.

### 12.3 Where the logic lives in Next.js
| Concern | Location |
|---|---|
| `moderateMessage`, `detectImageSpam`, regex bundles | `src/lib/moderation.ts` (port of `chat-moderation.ts` verbatim) |
| `performFraudCheck`, `applyFraudHold`, `applyListingFraudHold`, `PRICE_RANGES` | `src/lib/fraud.ts` (port of `fraud-scoring.ts` verbatim) |
| `createMissiveFraudDraft` | `src/lib/missive.ts` (port verbatim; same env names) |
| POST listing, POST report | `src/app/api/listings/route.ts`, `src/app/api/listings/[id]/report/route.ts` |
| POST message, GET conversation, POST report | `src/app/api/messages/route.ts`, `src/app/api/messages/[recipientId]/route.ts`, `src/app/api/messages/report/route.ts` |

### 12.4 Postgres-specific upgrades (deferred but worth flagging)
- Replace hard-coded constants with `SELECT * FROM moderation_config WHERE id = 'singleton'` cached at module load.
- Add `PRICE_RANGES` rows for `laptop_*` and `*_parts`.
- Replace the single `last_report_at + report_count_24h` columns with a `listing_reports` table (`listing_id, reporter_id, created_at`, unique on `(listing_id, reporter_id)`). Threshold = `COUNT(*) WHERE created_at > now() - interval '24 hours'`. This kills the slide-at-boundary issue and dedupes reporters.
- Same per-reporter dedupe for `chat_reports`: unique on `(message_id, reporter_id)`.
- Wire `auto_action_logs` writes into every automated branch.
- Cron: nightly job to compact expired strikes (optional — `count(... WHERE expires_at > now())` is fine without it).
- Add `currentFraudScore` lookup to `performFraudCheck` call sites so 80-threshold becomes reachable cumulatively.
- `getActiveStrikes` ladder: e.g. `>=3 active strikes` → `applyFraudHold(user, 80, "strike_ladder")`. Specify in the admin product spec before coding.

### 12.5 Drizzle/Prisma schema migration
Use the verbatim Prisma definitions in §3.2, §5.2, §6.11, §7.2, §8.2, §10 as the source of truth. Convert each `@@map` name to the Postgres table name (already snake_case). Convert `cuid()` → `gen_random_uuid()` or keep `cuid()` via `@vercel/edge-cuid`. The model bodies are unchanged.

### 12.6 Edge cases to enforce in code review
1. `isStore` exemption: re-check the call site, not just the library — see §1.5.
2. Greek text in Missive subject (`🚨 Fraud Hold:`) — keep the emoji; it's the search anchor in Missive.
3. Recipient-vs-sender visibility (sender sees their own redacted text) — preserve at the SQL level via RLS.
4. Strikes are passive-decay (never deleted) — port the count-with-where pattern, not a delete cron.

---

## 13. Test Fixtures

All fixtures are written to be loadable into a single seed file. UIDs are placeholders.

### 13.1 Pricing — normal listing (NO anomaly)
```json
{
  "case": "pricing_normal",
  "input": { "price": 300, "category": "phone", "condition": "good", "isStore": false },
  "expected": { "isSuspicious": false, "scoreIncrease": 0, "addStrike": false, "shouldHold": false, "newScore": 0 }
}
```
Reasoning: `phone_good.min = 100`. `300 > 100 * 0.5 = 50`. Returns the no-op path.

### 13.2 Pricing — mild anomaly (+15, no strike)
```json
{
  "case": "pricing_mild",
  "input": { "price": 40, "category": "phone", "condition": "good", "isStore": false },
  "expected": { "isSuspicious": true, "scoreIncrease": 15, "addStrike": false, "shouldHold": false, "newScore": 15, "reason": "pricing_anomaly" }
}
```
Reasoning: `40 < 100 * 0.5 = 50` but `40 >= 100 * 0.3 = 30` → +15. `15 < 20` → no strike.

### 13.3 Pricing — severe anomaly (+25, strike)
```json
{
  "case": "pricing_severe",
  "input": { "price": 20, "category": "phone", "condition": "good", "isStore": false },
  "expected": { "isSuspicious": true, "scoreIncrease": 25, "addStrike": true, "shouldHold": false, "newScore": 25, "reason": "pricing_anomaly" }
}
```
Reasoning: `20 < 100 * 0.3 = 30` → +25. `25 >= 20` → strike. Not >= 80 → no hold (matches today's behavior — would only hold cumulatively).

### 13.4 Pricing — store exempt
```json
{
  "case": "pricing_store_exempt",
  "input": { "price": 1, "category": "phone", "condition": "good", "isStore": true },
  "expected": { "isSuspicious": false, "scoreIncrease": 0, "addStrike": false, "shouldHold": false, "newScore": 0 }
}
```

### 13.5 Pricing — unmapped category (silent exempt)
```json
{
  "case": "pricing_unmapped",
  "input": { "price": 1, "category": "laptop", "condition": "good", "isStore": false },
  "expected": { "isSuspicious": false, "scoreIncrease": 0, "addStrike": false, "shouldHold": false, "newScore": 0 },
  "note": "Current behavior. Migration TODO: add PRICE_RANGES['laptop_good']."
}
```

### 13.6 Reports — private listing crosses threshold (2 in 24h)
```json
{
  "case": "report_private_threshold",
  "seed": { "listing": { "id": "L1", "isStore": false, "reportCount24h": 1, "lastReportAt": "<now - 1h>", "fraudScore": 0, "isActive": true } },
  "action": "POST /api/listings/L1/report",
  "expected": {
    "listing": { "reportCount24h": 2, "lastReportAt": "<now>", "isActive": false, "fraudScore": 10 },
    "userStrike": { "userId": "<seller>", "reason": "Listing reported: L1" },
    "missiveDraft": { "subject_contains": "Fraud Hold: listing", "label": "Mobile Unit Leads" },
    "response": { "success": true, "autoHidden": true }
  }
}
```

### 13.7 Reports — store listing needs 5
```json
{
  "case": "report_store_four_not_hidden",
  "seed": { "listing": { "id": "L2", "isStore": true, "reportCount24h": 3, "lastReportAt": "<now - 30m>", "fraudScore": 0, "isActive": true } },
  "action": "POST /api/listings/L2/report",
  "expected": {
    "listing": { "reportCount24h": 4, "isActive": true, "fraudScore": 10 },
    "userStrike": "added (one per report regardless of threshold)",
    "missiveDraft": "NOT created",
    "response": { "success": true, "autoHidden": false }
  }
}
```

### 13.8 Reports — window reset
```json
{
  "case": "report_window_reset",
  "seed": { "listing": { "id": "L3", "isStore": false, "reportCount24h": 1, "lastReportAt": "<now - 25h>", "isActive": true } },
  "action": "POST /api/listings/L3/report",
  "expected": { "listing": { "reportCount24h": 1, "isActive": true } }
}
```

### 13.9 Chat — URL stripped
```json
{
  "case": "chat_url",
  "input": "check this https://example.com/foo and www.bar.com",
  "expected": {
    "sanitizedContent": "check this [Link removed for safety] and [Link removed for safety]",
    "isHidden": true,
    "flaggedReason": "url",
    "showSenderTooltip": true
  }
}
```

### 13.10 Chat — phone number
```json
{
  "case": "chat_phone",
  "input": "call me +306971234567",
  "expected": {
    "sanitizedContent": "call me [Link removed for safety]",
    "isHidden": true,
    "flaggedReason": "off_platform"
  }
}
```

### 13.11 Chat — WhatsApp handle pattern
```json
{
  "case": "chat_whatsapp_handle",
  "input": "@johnny on whatsapp",
  "expected": {
    "sanitizedContent": "[Link removed for safety]",
    "isHidden": true,
    "flaggedReason": "off_platform"
  }
}
```

### 13.12 Chat — Telegram link
```json
{
  "case": "chat_telegram_link",
  "input": "join t.me/secretgroup",
  "expected": {
    "sanitizedContent": "join [Link removed for safety]",
    "isHidden": true,
    "flaggedReason": "off_platform",
    "note": "t.me/secretgroup also matches URL_PATTERNS[2] (...).me — so flaggedReason latches to 'url' first. Telegram regex then runs against already-sanitized content and matches nothing. Net effect: isHidden=true, reason='url'."
  }
}
```

> Verify with a unit test: depending on the exact ordering of `URL_PATTERNS` vs `OFF_PLATFORM_PATTERNS` evaluation, `t.me/...` will most likely flag as `"url"` (the third URL pattern matches the `.me` TLD). Both reasons hide the message; only the label differs.

### 13.13 Chat — image spam (third distinct recipient)
```json
{
  "case": "image_spam",
  "seed": [
    { "message": { "senderId": "U1", "recipientId": "R1", "imageHash": "h1", "createdAt": "<now - 2m>" } },
    { "message": { "senderId": "U1", "recipientId": "R2", "imageHash": "h1", "createdAt": "<now - 1m>" } },
    { "message": { "senderId": "U1", "recipientId": "R3", "imageHash": "h1", "createdAt": "<now - 30s>" } }
  ],
  "action": "POST /api/messages from U1 to R4 with imageHash=h1",
  "expected": {
    "message": { "isHidden": true, "flaggedReason": "image_spam" },
    "detectImageSpam": { "isSuspicious": true, "reason": "image_spam" }
  }
}
```

### 13.14 Chat — report flow
```json
{
  "case": "message_report",
  "seed": { "message": { "id": "M1", "senderId": "U1", "recipientId": "U2", "isHidden": false } },
  "action": "POST /api/messages/report by U2 with reason='harassment'",
  "expected": {
    "chatReport": { "messageId": "M1", "reporterId": "U2", "reason": "harassment" },
    "message": { "isHidden": true, "flaggedReason": "reported" },
    "userStrike": { "userId": "U1", "reason": "Reported: harassment" },
    "missiveDraft": "NOT created"
  }
}
```

### 13.15 Fraud hold — listing 80 threshold (synthetic — call `applyListingFraudHold` directly)
```json
{
  "case": "listing_fraud_hold",
  "action": "applyListingFraudHold(db, 'L9', 85, 'pricing_anomaly')",
  "expected": {
    "listing": { "fraudScore": 85, "isHeld": true, "isActive": false },
    "fraudHold": { "entityType": "listing", "entityId": "L9", "fraudScore": 85, "reason": "pricing_anomaly" }
  }
}
```

### 13.16 Fraud hold — user side effects
```json
{
  "case": "user_fraud_hold",
  "action": "applyFraudHold(db, 'U9', 80, 'listing_fraud')",
  "expected": {
    "user": { "fraudScore": 80, "isHeld": true, "restrictedMode": true, "tokensDisabled": true, "restrictedUntil": "<now + 7d>" },
    "fraudHold": { "entityType": "user", "entityId": "U9", "fraudScore": 80, "reason": "listing_fraud" }
  }
}
```

### 13.17 Held user — listing POST rejected
```json
{
  "case": "held_user_rejected",
  "seed": { "user": { "id": "U9", "isHeld": true } },
  "action": "POST /api/listings (any valid body)",
  "expected": { "status": 403, "body": { "error": "Account is restricted. Contact support." } }
}
```

### 13.18 Strikes — passive decay
```json
{
  "case": "strikes_decay",
  "seed": [
    { "userStrike": { "userId": "U1", "reason": "x", "createdAt": "<now - 89d>", "expiresAt": "<now + 1d>" } },
    { "userStrike": { "userId": "U1", "reason": "y", "createdAt": "<now - 91d>", "expiresAt": "<now - 1d>" } }
  ],
  "call": "getActiveStrikes(db, 'U1')",
  "expected": 1
}
```

### 13.19 Conversation ID symmetry
```json
{
  "case": "conversation_id_symmetric",
  "input": [["alice", "bob"], ["bob", "alice"]],
  "expected": ["alice_bob", "alice_bob"]
}
```

### 13.20 Idempotency — repeated severe pricing doesn't double-strike on same listing
```json
{
  "case": "no_double_strike_on_same_post",
  "note": "POST /api/listings runs performFraudCheck exactly once per request. Repeated POSTs (different listings, same price) will each yield one strike — this is intentional. There is no listing-level addStrike dedupe.",
  "expected_behavior": "1 strike per POST"
}
```

---

## 14. Migration Risk Punch List

| # | Risk | Where | Action |
|---|---|---|---|
| 1 | `currentFraudScore` hard-coded `0` in POST listing call | `routes/listings.ts:165` | Load `user.fraudScore` and pass it in so cumulative holds work |
| 2 | `PRICE_RANGES` missing `laptop_*` and `*_parts` | `lib/fraud-scoring.ts:9-22` | Add rows; otherwise these categories are silently exempt |
| 3 | `ModerationConfig` table never read | nowhere | Wire `getConfig()` lookup; cache for 60s |
| 4 | `AutoActionLog` never written | all auto-action sites | Add `db.autoActionLog.create` in 5 places (see §7.3) |
| 5 | `AuditLog` never written | admin routes (not in repo) | Implement admin routes on Supabase port; write here |
| 6 | `getActiveStrikes` never called | `lib/chat-moderation.ts:106` | Build ladder (e.g., 3 strikes → user hold) |
| 7 | No per-reporter dedupe | listing + message reports | Add `UNIQUE(entity_id, reporter_id)` indexes |
| 8 | Single-counter 24h window slides at boundary | `routes/listings.ts:296-303` | Replace with per-report timestamp table |
| 9 | Missive draft only on listing path | `routes/listings.ts`, not `messages.ts` | Decide whether chat reports also draft (likely yes for harassment) |
| 10 | `flaggedReason` "url" wins over "off_platform" | `lib/chat-moderation.ts:43-57` | Either document or add a combined enum like `"url+off_platform"` |
| 11 | `isStore` hard-coded `false` on POST listings | `routes/listings.ts:163` | Compute from seller role / listing flag |
| 12 | `RESTRICTED_COOLDOWN_DAYS` not enforced server-side | `lib/fraud-scoring.ts:6` | Add `restrictedUntil` check to POST listings and token issuance |

---

## 15. Glossary (single source of truth)

- **Held**: `User.isHeld = true` → Account locked. `Listing.isHeld = true` → listing hidden + inactive. Requires Super Admin release.
- **Restricted**: `User.restrictedMode = true` with `restrictedUntil`. UI-driven limitation; not strictly server-enforced today.
- **Tokens disabled**: appointment-token issuance refused. Set together with `isHeld` in `applyFraudHold`.
- **Strike**: a 90-day-decaying `UserStrike` row. Currently emitted but not consumed.
- **Fraud score**: integer 0–100 per user and per listing. Hold trigger at 80.
- **Report count (24h)**: per-listing rolling counter, threshold 2 (private) / 5 (store).
- **Auto-hide**: `Listing.isActive = false`, no FraudHold row.
- **Fraud hold**: `FraudHold` row + `User.isHeld` / `Listing.isHeld = true`. Tracked for Super Admin release.

---

End of export.
