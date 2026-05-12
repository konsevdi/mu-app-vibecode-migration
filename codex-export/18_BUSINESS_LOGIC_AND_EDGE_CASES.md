# 18 — Business Logic and Edge Cases

Every rule extracted from source code that a rebuild must preserve, plus the edge cases each rule implies.

## 1. Listings

### Creation

- 3 ≤ images ≤ 10 (`shared/contracts.ts:listingSchema`).
- `title` 3..100 chars, `description` 10..1500 (source: 2000 — DECIDE: tighten).
- `price >= 0`. Free items (`price=0`) legal — they appear in browse but not in "verified only" filter unless graded.
- New listing always `status='pending'`. Becomes `approved` via admin queue OR auto-approves after a passing inspection.
- New listing fraud-checked synchronously (`backend/src/routes/listings.ts:124-194`):
  - `performFraudCheck` may set `shouldHold=true` if `fraud_score >= 80`. Listing saved with `is_held=true, is_active=false`, response `202 { held: true }`.
  - 24h report window: same listing reported ≥ threshold (2 private / 5 store) triggers auto-hide and listing-side `+10 fraud_score` per report.

**Edge cases:**
- Seller is `is_held=true` already → return 403 before fraud check.
- Seller's `tokens_disabled=true` → can still list (tokens are for appointments). Don't gate listing create on this.
- 11th image submitted → reject at zod; client should never let user select more, but server is the source of truth.
- Image array contains duplicate paths → dedupe server-side, warn if it drops below 3 after dedup.
- Decimal price with > 2 decimals → round half-to-even before insert.

### Reporting

- Source has a race: report row goes into `Listing.reportCount24h`, not a separate `listing_reports` table → same reporter can report twice. Rebuild adds `public.listing_reports (listing_id, reporter_id) unique` table; aggregate count is `count distinct reporter_id where created_at > now() - 24h`.
- Threshold 2 (private) / 5 (store) per 24h → auto-hide.
- Reporter cannot report own listing — 400.
- A listing already `is_active=false` cannot be reported — 410.

### Pricing anomaly

- Source: `<30% of min` → +25 fraud + strike; `<50% of min` → +15.
- Categories not in `PRICE_RANGES`: laptop_*, *_parts → no anomaly check applied. **DECIDE**: derive ranges from `PRICING_BANDS × baseline_prices_per_model` for V1.1.

### Status transitions

```
draft → pending (user submits)
pending → approved (admin OR passing inspection)
pending → rejected (admin)
approved → sold (user marks sold)
approved → removed (user OR admin)
any → removed via admin "force remove"
```

Enforced by `enforce_listing_status_transitions` trigger.

## 2. Messages

### Send

- Length 1..2000 chars.
- Recipient ≠ self (RLS check policy).
- URL regex matches → `flagged_reason='url'`, content sanitized, message `is_hidden=true` (recipient cannot see).
- Off-platform regex matches → `flagged_reason='off_platform'`, sanitized.
- ImageHash + same sender + 3 distinct recipients in 5 min → `flagged_reason='image_spam'`.
- Sender always sees their own message even if hidden (UX: pretend it went through; `senderTooltip` is the only signal).

**Edge cases:**
- Greek URL like `https://παράδειγμα.com` — current regex misses non-ASCII domains. Fix: enable `u` flag and accept Unicode in URL regex.
- Phone with spaces `+30 698 123 4567` — current regex `/\+\d{10,}/g` won't catch this. Fix: strip spaces before applying regex.
- Reply to a hidden message → conversation still works because sender sees own + recipient sees nothing of the hidden one.
- Image attached with no `imageHash` → skip image-spam check entirely (`detectImageSpam` returns `isSuspicious:false`). Server post-processor should compute and backfill.

### Report

- Max 5 reports per reporter per 24h (NEW — not in source).
- One report per (`message_id`, `reporter_id`) via unique constraint.
- Reporting auto-adds strike to sender (source) — keep.

## 3. Fraud holds

- Listing fraud hold sets `is_held=true, is_active=false` on listing AND propagates to user (`fraud_score=80, is_held=true, restricted_mode=true, restricted_until=now()+7d, tokens_disabled=true`).
- User stays restricted 7 days OR until super_admin sets `is_held=false`.
- `restricted_mode` blocks: posting new listings, redeeming tokens, posting messages with images. It DOES NOT block plaintext chat (a user under review can still respond to inquiries on existing listings).

**Edge cases:**
- Time passes `restricted_until` but `is_held=true` — `is_held` wins; user stays restricted until super_admin manually releases.
- Two holds raised concurrently on the same user — second hold's row inserts; `restricted_until` becomes `max(existing, new)`.

## 4. Appointments

- Slot conflict (NOT enforced in source). Add: unique on (`store_id`, `date`, `time_slot`) with `status not in ('cancelled')` partial index.
- Date must be today + 1d ≤ date ≤ today + 60d.
- Cancellation by user only while `status='pending'`. After `approved`, user must contact store.
- Token issued ONLY when admin approves (`is_active=true` flips). Until then `tokens` row may not exist or has `is_active=false`.
- Token rotates every 60s; redemption checks `expires_at > now()` (72h after approval).
- No-show: `pg_cron` job daily flips `approved` appointments with `date < now() - 24h` to `cancelled` and adds a soft strike (`partner_complaint` reason, 30-day decay instead of 90).

## 5. Waitlist

- Max 3 signups per email per hour (rate limit). Same email → returns existing row (idempotent).
- `referredByCode` self-referral (same email as referrer) → ignored, set null.
- `referralCount += 1`, `positionScore += 3` for the referrer. No cap in source — **DECIDE**: cap at +30 (10 valid referrals) to prevent gaming.
- Referral lookup is case-insensitive (source uppercases code at lookup time).
- Email masking: first 2 chars of local part, then `***`, then domain (`ja***@example.com`).

## 6. Trust events

- `trust_event_count` increments only via `trust_events` insert (with unique constraint on `(user_id, event_type, source_entity_*)` to prevent double-counting).
- `isUserVerified = trust_event_count >= 2`. Used to show a "trusted seller" badge on listings.
- Events to log:
  - `completed_grade` — inspection insert trigger
  - `completed_appointment` — appointment status → `completed`
  - `partner_vouch` — manual admin
  - V2: `completed_transaction`

## 7. Strikes

- 90-day rolling decay (`expires_at = created_at + interval '90 days'`).
- Active strike count = `count(*) where expires_at > now()`.
- 3 active strikes → 7-day restricted mode (NEW automation — wire `getActiveStrikes` into `addStrike` post-hook).
- 5 active strikes → permanent hold pending super_admin review.

## 8. Tokens

- 6 digits, rotated every 60s by `pg_cron`.
- TTL 72h from approval.
- Cannot be issued to a user with `tokens_disabled=true`.
- Redemption requires staff at the appointment's `store_id`. Front_office at iRepair Spot CANNOT redeem an appointment booked at iRepair Rhodes.
- Once redeemed, token is dead — no re-use, no fresh issuance for the same appointment.

## 9. Grading

- Multipliers from `grade_config` (per-store overrides global default).
- Verified-only filter: `grade IS NOT NULL AND checklist_complete = true`.
- Grading is **post-listing**: a listing can be approved and live without a grade; the inspection adds the grade later. `verifiedOnly` query just adds the grade-not-null clause.

## 10. Pricing guide (display)

`PRICING_BANDS × GRADE_MULTIPLIERS` produces a suggested price band shown to seller on the sell form. Not used in fraud check. The fraud check uses absolute `PRICE_RANGES` (different table). **DECIDE**: derive PRICE_RANGES from bands × baseline so they cannot drift.

## 11. Cities

- V1: only `Rhodes` is `is_eligible=true`. Sign-up, listing, appointment booking all gate on `selected_city = 'Rhodes'`.
- If user picks a non-eligible city → routed to waitlist.
- Tourist mode flag `TOURIST_MODE_ENABLED=false` in source — keep off until product approves V2.

## 12. i18n

- Default `el`. Sign-up trigger sets `language_pref='el'`.
- Switching language in profile updates both cookie and `profiles.language_pref` (auth users).
- Anonymous users — cookie only.
- Greek UPPERCASE strings strip accents (lint enforced).

## 13. Image processing

- Max 10 MB pre-process; normalized to WebP at 2048px max width.
- pHash computed server-side; stored on `image_metadata.phash`.
- Listings store paths only — render with signed URL TTL 1h, refresh client-side as needed.
- Blurhash stored for placeholder rendering.

## 14. Assistant (replace MOCKED)

Source `backend/src/routes/assistant.ts:1-393` is a keyword-matching switch with hardcoded markdown. NO LLM. Knowledge base:

- iRepair Rhodes address
- €10 diagnostic fee (refunded on purchase)
- Pandas pricing URL
- Safety tips

Replace with Anthropic Claude haiku-4-5 streaming. System prompt includes the same knowledge base injected from a single source (`lib/assistant-knowledge.ts`). See `20_AGENTS.md`.

## 15. Diagnostic fee

- €10 hardcoded in source. V1: not collected by the app. Store staff marks `appointment.diagnostic_redeemed=true` when the customer's purchase consumes the fee.
- V2: integrate Stripe Connect — collect on booking, refund on purchase via the same row.

## 16. Demo data

- `is_demo=true` listings shown on `/demo` and as featured on `/` for fresh visitors.
- Demo listings are not editable from the UI — only via seed script.
- `irepair.demo@mobileunit.gr` is the demo seller — its `auth.users` row is real but the account is internal-only.

## 17. Edge cases not in source

| Case | Rule |
|---|---|
| User deletes account while having open appointment | Soft-delete profile; appointment auto-cancels via trigger; messages remain (sender shown as "deleted user") |
| Listing seller is deleted | Listing auto-removed (`status='removed'`) via cascade trigger |
| User tries to message themselves | RLS blocks (`recipient_id <> sender_id` check) |
| Conversation between sender + their own deleted account self-message | Cannot exist — see above |
| User joins waitlist with `@vibecodeapp.com` email | Accepted; no special handling |
| Same `referredByCode` used by multiple signups | Allowed — that's the whole point of the program |
| Token expires mid-redemption | Check `expires_at > now()` in the redemption RPC, return 410 if expired |
| User changes email | Supabase Auth flows handle this; `profiles.email` is kept in sync via trigger on `auth.users` update |
| Image upload succeeds but post-process fails | Background job retries; UI shows blurhash placeholder until ready |
| Realtime channel disconnects mid-conversation | Client reconnects; on resubscribe fetch latest 50 messages to fill any gap |
