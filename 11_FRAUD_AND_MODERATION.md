# 11 — Fraud & Moderation

Source: Prisma models `FraudHold`, `UserStrike`, `AutoActionLog`, `AuditLog`, `ModerationConfig` + fraud fields on `User`, `Listing`, `Message`.

## Goals

Keep marketplace quality high enough to maintain trust in the eligible city without manually reviewing every listing. The rules are deliberately simple — three signals trip thresholds, an admin makes the final call.

## Three fraud signals

### 1. Listing-level

- `fraud_score` per listing (0-100). Heuristics on creation + edit:
  - **+30** if title or description contains URL patterns (`/https?:\/\/|www\./i`).
  - **+25** if price is < 10% of `PRICING_BANDS[condition].min` * an inferred "new price" estimate (only when brand+model match a known model).
  - **+20** if seller created the account < 24 hours ago AND has 0 trust events.
  - **+25** if any image hash matches another listing's image hash (cross-account image reuse).
  - **+15** if description length < 30 chars.
- If `fraud_score >= moderation_configs.fraud_hold_threshold` (default 80) → `is_held=true` and `fraud_holds` row created (`entity_type='listing'`).
- Held listings: not visible in browse; owner sees a banner "Η αγγελια σου εκκρεμει ελεγχο" / "Your listing is pending review".

### 2. User-level

- `fraud_score` per user (0-100). Updated by:
  - **+15** for each listing held in 30d (cap +60).
  - **+10** for each message strike in 90d (cap +50).
  - **+30** for any chargeback / disputed payment (V2).
- `is_held=true` if `fraud_score >= fraud_hold_threshold`. Held users cannot create listings, send messages, or book appointments.

### 3. Chat-level

- Each message's `flagged_reason` is `'url'`, `'off_platform'`, `'image_spam'`, or `'reported'`.
- Three flags in 24h from same sender → `restricted_mode=true` for 7 days. Insert `user_strikes` row with `expires_at = now() + interval '90 days'`.
- Three strikes in 90 days → escalate to `is_held=true` until admin reviews.

## Moderation config

`moderation_configs` is a single global row (no per-store override in V1). Defaults from Prisma:

```ts
{
  private_report_threshold: 2,     // auto-hide listing after 2 reports/24h
  store_report_threshold: 5,
  cooldown_days: 7,                // post-strike cooldown
  limited_state_days: 7,           // restricted_until window
  strike_decay_days: 90,           // user_strikes expiry
  fraud_hold_threshold: 80,        // is_held trip line
}
```

Admin can edit via `/admin/settings` (PROPOSED) or directly in Supabase SQL editor.

## Auto-action log

Every automated action writes a row:

```ts
{
  entity_type: 'listing' | 'user' | 'message',
  entity_id,
  action: 'auto_hide' | 'auto_restrict' | 'strike_added' | 'fraud_hold',
  reason: 'report_threshold' | 'fraud_score' | 'url_detected' | 'cross_account_image' | ...,
  details: { ... },  // contextual JSON
}
```

This is the forensics trail. Never delete rows. Admin UI surfaces it for any held entity.

## Audit log

Manual admin actions go to `audit_logs`:

```ts
{
  actor_id: <admin profile id>,
  actor_role: 'admin' | 'staff',
  action: 'approve_listing' | 'reject_listing' | 'release_fraud_hold' | 'ban_user' | ...,
  entity_type, entity_id, details, ip_address,
}
```

Render on `/admin/audit` (PROPOSED) sorted by `created_at desc`, paginated.

## Admin workflows

### `/admin/listings`

Default filter: `status='pending'`. Columns: title, seller, fraud_score, images count, created. Actions: **Approve** / **Reject** (with reason).

Approving:
- Sets `status='approved'`.
- If `is_held=true`, also clears `is_held=false` and resolves any open `fraud_holds`.
- Writes audit log.

Rejecting:
- Sets `status='rejected'`.
- Optional reason saved to `audit_logs.details.reason` and emailed to seller.
- Owner can edit and resubmit (→ `status='pending'`).

### `/admin/fraud`

Lists open `fraud_holds` (where `resolved_at IS NULL`), joined to the referenced entity. Columns: type, entity ID, fraud_score, reason, created.

Actions per row:
- **Release** → `resolved_at=now()`, `resolved_by=admin.id`, clear `is_held=false` on entity, audit log.
- **Confirm hold** → leave hold, optionally ban (sets `profiles.is_held=true` permanently).
- **Open in entity view** → deep link to the held entity for context.

### `/admin/users` (PROPOSED V2)

Search users by email/name/handle. Per-user view:
- Listings count by status.
- Strikes (`user_strikes` not yet expired).
- Recent messages flagged.
- Actions: clear strikes, untoggle restricted_mode, ban (is_held), restore.

## Email notifications

Admin email (`ADMIN_EMAIL`) gets:
- New fraud hold (within 60s).
- Spike in reports (> 10 reports/hour across the platform).

User email gets:
- Listing approved / rejected.
- Account restricted (with reason and unlock date).
- Account held (must contact support).

All via Resend, `react-email` templates.

## URL / off-platform regex (verbatim source patterns)

```ts
// for messages.content moderation
const URL_RX = /https?:\/\/[^\s]+|www\.[^\s]+/i;
const PHONE_RX = /\b\+?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/;
const OFF_PLATFORM_RX = /\b(whatsapp|viber|telegram|signal|instagram|messenger|fb\.me)\b/i;
```

## Cross-account image reuse detection

When a listing image is uploaded, compute a perceptual hash (`pHash`) client-side (use `blockhash-core` or compute Sha256 of resized 8×8 grayscale image — pHash is more robust to crops). Store on `listing_images.image_hash` (PROPOSED column).

On listing create, query for any other listings (different seller) with the same hash. If found → `fraud_score += 25` and write `auto_action_logs` with details.

## Restricted-mode UX

When `profiles.restricted_mode=true AND restricted_until > now()`:
- Sticky banner on every authed page: "Ο λογαριασμος σου εχει περιορισμους εως `<date>`. Δες πληροφοριες." (link to `/support`).
- Action endpoints reject with `423 HELD`. UI shows toast.
- Browsing remains available.

## Permanent hold UX

When `profiles.is_held=true`:
- Banner: "Ο λογαριασμος σου εχει ανασταλει. Επικοινωνησε με την υποστηριξη: `SUPPORT_EMAIL`."
- Sign-in still works (so user can read the banner) but all write APIs reject.

## Test cases

1. Listing with `http://`: fraud_score += 30 → admin sees in queue.
2. User creates 4 listings in 24h: rate limited at 10/day, no fraud trigger.
3. Two reports on a listing within 24h: auto `is_active=false`, written to `auto_action_logs`. Owner sees rejection banner.
4. User receives 3 message strikes in 90d: `is_held=true`. Email sent.
5. Admin releases a hold: hold resolved, entity unhalted, audit log written.
