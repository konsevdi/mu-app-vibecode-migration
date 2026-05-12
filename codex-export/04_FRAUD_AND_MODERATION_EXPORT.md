# 04 — Fraud and Moderation Export

All numbers, thresholds, regex, and logic verbatim from source. Do not change without product sign-off.

## Configuration constants

From `backend/src/lib/fraud-scoring.ts:3-22`:

```ts
const FRAUD_THRESHOLD = 80;
const PRIVATE_REPORT_LIMIT = 2;
const STORE_REPORT_LIMIT = 5;
const RESTRICTED_COOLDOWN_DAYS = 7;

const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  "phone_new":         { min: 200, max: 1500 },
  "phone_like_new":    { min: 150, max: 1200 },
  "phone_good":        { min: 100, max: 800 },
  "phone_fair":        { min:  50, max: 400 },
  "tablet_new":        { min: 150, max: 1200 },
  "tablet_like_new":   { min: 100, max: 900 },
  "tablet_good":       { min:  80, max: 600 },
  "tablet_fair":       { min:  40, max: 300 },
  "accessory_new":     { min:   5, max: 200 },
  "accessory_like_new":{ min:   3, max: 150 },
  "accessory_good":    { min:   2, max: 100 },
  "accessory_fair":    { min:   1, max:  50 },
};
```

**MISSING**: `laptop_*`, `*_parts` ranges. Add when rebuilding.

`ModerationConfig` defaults (also seeded in DB):

```
privateReportThreshold = 2
storeReportThreshold   = 5
cooldownDays           = 7
limitedStateDays       = 7
strikeDecayDays        = 90
fraudHoldThreshold     = 80
```

## Pricing anomaly check

`checkPricingAnomaly(price, category, condition, isStore)`:

```ts
// Store listings: never anomalous
if (isStore) return { isSuspicious: false, scoreIncrease: 0 };

// Key into PRICE_RANGES
const key = `${category}_${condition}`;
const range = PRICE_RANGES[key];
if (!range) return { isSuspicious: false, scoreIncrease: 0 };  // category/condition not mapped

if (price < range.min * 0.3)  return { isSuspicious: true, scoreIncrease: 25 };  // <30% of min: severe
if (price < range.min * 0.5)  return { isSuspicious: true, scoreIncrease: 15 };  // <50% of min: mild
return { isSuspicious: false, scoreIncrease: 0 };
```

`addStrike` triggered when `scoreIncrease >= 20` (so the 25-point bucket adds a strike, the 15-point bucket does not — `fraud-scoring.ts:91-94`).

## Fraud check pipeline

`performFraudCheck(db, listingId, price, category, condition, isStore, currentFraudScore, reportCount24h)`:

```ts
let scoreIncrease = 0;
let reason = null;
let addStrike = false;

const priceCheck = checkPricingAnomaly(...);
if (priceCheck.isSuspicious) {
  scoreIncrease += priceCheck.scoreIncrease;
  reason = "pricing_anomaly";
  addStrike = priceCheck.scoreIncrease >= 20;
}

const newScore = Math.min(100, Math.max(0, currentFraudScore + scoreIncrease));
const shouldHold = newScore >= FRAUD_THRESHOLD;           // 80
const shouldAutoHide = reportCount24h >= (isStore ? 5 : 2);

return { newScore, shouldHold, shouldAutoHide, reason, addStrike };
```

## Fraud hold side-effects

When `shouldHold=true` (listing create flow, `backend/src/routes/listings.ts:180-194`):

1. `applyListingFraudHold(db, listingId, newScore, reason)`
   - `UPDATE listing SET fraudScore=$score, isHeld=true, isActive=false WHERE id=$id`
   - `INSERT INTO fraud_hold (entityType='listing', entityId, fraudScore, reason)`
2. `applyFraudHold(db, userId, FRAUD_THRESHOLD, "listing_fraud")`
   - `UPDATE user SET fraudScore=80, isHeld=true, restrictedMode=true, restrictedUntil=now()+7d, tokensDisabled=true WHERE id=$userId`
   - `INSERT INTO fraud_hold (entityType='user', entityId=userId, fraudScore=80, reason='listing_fraud')`
3. `createMissiveFraudDraft({ entityType, entityId, fraudScore, reason, userEmail, listingTitle })`
4. Response: `202 { error: "Listing under review", held: true }`

User stays in restricted state for 7 days OR until a super_admin sets `isHeld=false`.

## Report → auto-hide flow

`backend/src/routes/listings.ts:282-338`:

```ts
const now = new Date();
const twentyFourHoursAgo = new Date(now.getTime() - 24*60*60*1000);

let newReportCount = listing.reportCount24h + 1;
if (listing.lastReportAt && listing.lastReportAt < twentyFourHoursAgo) {
  newReportCount = 1;  // window reset
}

const threshold = listing.isStore ? 5 : 2;
const shouldAutoHide = newReportCount >= threshold;

await db.listing.update({
  where: { id },
  data: {
    reportCount24h: newReportCount,
    lastReportAt: now,
    isActive: shouldAutoHide ? false : listing.isActive,
    fraudScore: { increment: 10 },  // +10 per report
  },
});

await addStrike(db, listing.sellerId, `Listing reported: ${id}`);
if (shouldAutoHide) await createMissiveFraudDraft({ ... });
```

**Note**: report count is on the listing row, NOT separate `ChatReport`-style rows for listings. That means multi-reporter de-dup is **MISSING** — same reporter can fire 2 reports and trip the threshold. Add reporter-uniqueness in rebuild: `INSERT INTO listing_report(listing_id, reporter_id) ON CONFLICT DO NOTHING` and aggregate counts in a 24h window.

## Strike system

From `backend/src/lib/chat-moderation.ts:98-115`:

```ts
export async function addStrike(db, userId, reason): Promise<void> {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await db.userStrike.create({ data: { userId, reason, expiresAt } });
}

export async function getActiveStrikes(db, userId): Promise<number> {
  return db.userStrike.count({
    where: { userId, expiresAt: { gt: new Date() } },
  });
}
```

**Decay**: rolling 90 days from `createdAt`. No automatic deletion — expired rows just stop being counted. **DECIDE**: add nightly cleanup or leave for audit history.

**MISSING**: nowhere in source does `getActiveStrikes` drive an automated action (auto-restrict, auto-ban). The function is defined but never read. The rebuild should wire it into: 3 active strikes → 7-day restricted mode; 5 active strikes → permanent hold pending super_admin review.

## Chat moderation

`backend/src/lib/chat-moderation.ts:4-23` — exact regex patterns:

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
  /\+\d{10,}/g,                                          // Phone numbers ≥10 digits
  /@[a-zA-Z0-9_]+\s*(on\s*)?(insta|telegram|whatsapp)/gi,
];

const LINK_REMOVED_TEXT = "[Link removed for safety]";
const SENDER_TOOLTIP = "Links are blocked for safety. Please share details without links.";
```

`moderateMessage(content)` returns `{ sanitizedContent, isHidden, flaggedReason, showSenderTooltip }`. If any URL pattern matches → `flaggedReason='url'`. If any off-platform pattern matches → `flaggedReason='off_platform'` (URL wins precedence).

**Important**: `isHidden = flaggedReason !== null`. The current behavior: any flagged message is soft-hidden from recipient but visible to sender (sender doesn't know they were silently blocked unless `showSenderTooltip` triggers UI).

**MISSING**: Greek-specific patterns. Source regex is English-centric (`@user on insta`, `whatsapp`). Add Greek transliterations: `μου στείλε`, `στείλε μου viber`, etc. — left as PARTIAL until launch.

## Image spam detection

`backend/src/lib/chat-moderation.ts:69-96`:

```ts
export async function detectImageSpam(
  db, senderId, imageHash,
  timeWindowMinutes = 5,
  recipientThreshold = 3,
): Promise<{ isSuspicious: boolean; reason: string | null }> {
  if (!imageHash) return { isSuspicious: false, reason: null };

  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentSameImage = await db.message.findMany({
    where: { senderId, imageHash, createdAt: { gte: timeWindow } },
    select: { recipientId: true },
    distinct: ["recipientId"],
  });

  if (recentSameImage.length >= recipientThreshold) {
    return { isSuspicious: true, reason: "image_spam" };
  }
  return { isSuspicious: false, reason: null };
}
```

**Hashing strategy**: source uses an `imageHash` field on the request but **MISSING** — there's no upload-time hashing implementation in the codebase. Client is expected to compute and send. In the rebuild, compute a perceptual hash (`blockhash-core` or similar) server-side on Supabase Storage write, store on `messages.image_hash` automatically.

## Missive integration (fraud alerts)

`backend/src/lib/missive.ts:15-67`:

```ts
const apiKey = process.env.MISSIVE_API_KEY;
const orgId  = process.env.MISSIVE_ORG_ID;
if (!apiKey || !orgId) {
  console.log("[Missive] API key or org ID not configured, skipping draft");
  return null;  // SILENT NOOP if env vars unset
}

const subject = `🚨 Fraud Hold: ${entityType} ${entityId.slice(0,8)}`;
const body = `
Fraud Score: ${fraudScore}/100
Entity Type: ${entityType}
Entity ID: ${entityId}
Reason: ${reason}
${userEmail ? `User Email: ${userEmail}` : ""}
${listingTitle ? `Listing: ${listingTitle}` : ""}

Action Required: Super Admin approval needed to release hold.
Tokens and redemptions are blocked until cleared.
`.trim();

await fetch("https://public.missiveapp.com/v1/drafts", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    drafts: { subject, body, organization: orgId, add_shared_labels: ["Mobile Unit Leads"] },
  }),
});
```

**Behavior**: silent no-op if `MISSIVE_API_KEY` or `MISSIVE_ORG_ID` are missing. Listing creation still succeeds and fraud hold still applies — only the human notification is dropped. Log line `[Missive] API key or org ID not configured, skipping draft` is the only signal.

**Rebuild**: keep contract. If iRepair doesn't have Missive, fall back to `Resend` → `trust-and-safety@APP_DOMAIN`.

## Pricing bands (display only, not enforced)

`shared/contracts.ts:28-34` and `mobile/src/lib/constants.ts:1-8` (identical):

```ts
export const PRICING_BANDS = {
  new:      { min: 85, max: 95 },
  like_new: { min: 75, max: 88 },
  good:     { min: 60, max: 75 },
  fair:     { min: 40, max: 60 },
  parts:    { min: 10, max: 35 },
} as const;
```

**Note**: these are advisory ranges shown in the Sell flow's pricing-guide modal (% of new price). They are **NOT** used in the fraud check — that uses absolute `PRICE_RANGES` above. The two are independent constants. **DECIDE**: in rebuild, derive `PRICE_RANGES` from `PRICING_BANDS × category-baseline-prices` so they cannot drift.

## Grade multipliers

`shared/contracts.ts:37-42`:

```ts
export const GRADE_MULTIPLIERS = {
  A: 1.00,   // ΑΡΙΣΤΗ
  B: 0.93,   // ΚΑΛΗ
  C: 0.85,   // ΜΕΤΡΙΑ
  D: 0.60,   // ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ
} as const;
```

Also seeded into `grade_config` table — admin-configurable per-store, with `store_id=NULL` = global default. The source app code reads from constants, not from DB. **DECIDE**: rebuild reads from `grade_config` row at request time, falls back to constants on miss.
