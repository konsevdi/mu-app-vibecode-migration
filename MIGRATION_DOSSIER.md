# Mobile Unit — Migration Dossier (Vibecode → Codex Web App)

Source: Expo SDK 54 + Hono/Bun/Prisma/SQLite app in `/mobile` and `/backend`.
Target: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres + Auth + Storage) on Vercel, with GitHub-based CI.

---

## 1. Product Summary

**What it does**
Mobile Unit is a peer-to-peer marketplace for used phones, tablets, laptops, and accessories with a built-in **trust/verification layer**: sellers can have their device graded (A/B/C/D) and inspected by a partner repair shop ("iRepair") before sale. Buyers see condition grades, inspection dates, and verified-seller badges. All transactions are **pickup-only** at trusted iRepair stores (no shipping in V1). A rule-based AI assistant chat helps users price, vet, and buy safely.

**Who it's for**
- **Buyers**: people in Rhodes, Greece who want to buy second-hand devices but distrust private sellers. Bilingual (Greek/English).
- **Sellers**: individuals listing used devices who want to maximize price by getting verified.
- **iRepair stores**: partner location for inspection, pickup handoff, and diagnostics — they get foot traffic and lead fees.

**The main user problem**
Used-device marketplaces (Facebook Marketplace, etc.) are full of scams, stolen goods, and no objective way to assess condition. Buyers can't trust private sellers; sellers can't prove their device works.

**The desired user outcome**
A safer transaction: the device is verified by a real shop, both parties meet at the shop for pickup, and there's a fraud-monitoring layer (chat moderation, fraud-score holds, strikes) protecting both sides. Buyers walk away with a graded device; sellers convert at higher prices.

---

## 2. Current App Structure

### 2.1 Navigation Tree (Expo Router)

```
RootLayout (Stack)
├─ /onboarding              (headerShown: false) — 3-step welcome
├─ /(tabs)                  Tab Navigator (4 tabs)
│  ├─ index                 Home (featured + recent)
│  ├─ browse                Search + filter listings
│  ├─ sell                  Create listing
│  └─ profile               Account + my listings
├─ /listing/[id]            Listing detail (no header)
├─ /login                   Auth modal
├─ /modal                   Generic modal placeholder
├─ /legal                   Terms / liability
├─ /support                 Help / contact
├─ /book-appointment        Book grading appointment
├─ /stores                  iRepair locations (map + call + book)
├─ /token                   Check-in token display
├─ /waitlist                Pre-launch signup form
├─ /waitlist-success        Post-signup with referral code
└─ /demo-browse             Locked demo for non-eligible cities
```

### 2.2 Screens — Detailed Inventory

#### Home (`/(tabs)/index.tsx`)
- **Purpose**: Browse featured and recent listings.
- **Components**: Category carousel chips, Featured listing horizontal scroll, Recent listings grid (2-col), AssistantChat FAB.
- **Actions**:
  - Tap category chip → filter (navigates to Browse).
  - Tap featured/recent listing card → `/listing/[id]`.
  - Tap AssistantChat FAB → open chat panel.
- **States**:
  - Loading: skeleton cards.
  - Empty: "No listings yet" placeholder.
  - Error: retry button.
  - Success: lists render.

#### Browse (`/(tabs)/browse.tsx`)
- **Purpose**: Search + filter all listings.
- **Components**: Search bar (debounced), Category filter chips, Condition filter, Min/Max price inputs, Verified-only toggle, 2-column results grid (FlashList).
- **Actions**:
  - Type in search → debounced refetch.
  - Toggle category/condition chip → refetch.
  - Toggle "verified only" → refetch with `verifiedOnly=true`.
  - Tap card → `/listing/[id]`.
  - Pull to refresh.
- **States**: Loading, Empty (no matches), Error, Success.

#### Sell (`/(tabs)/sell.tsx`)
- **Purpose**: Create a new listing.
- **Components / Form Fields**:
  - Photo carousel (3 min / 10 max images, image picker + camera)
  - Title input (3-100 chars)
  - Description textarea (10-2000 chars)
  - Category picker (phone / tablet / laptop / accessory)
  - Condition picker (new / like_new / good / fair / parts)
  - Brand dropdown (optional)
  - Model dropdown (optional)
  - Price input (number ≥ 0)
  - Location input (free text)
  - City (locked to "rhodes" in V1)
  - "Book inspection" CTA → `/book-appointment`
- **Actions**:
  - Add photo → image-picker or camera.
  - Remove photo → confirms then removes.
  - Submit → POST `/api/listings`.
- **States**:
  - Idle (form), Validating (per-field), Submitting (button spinner), Success (navigate to listing), Error (inline + toast), Held (202 fraud hold message).
- **Auth gate**: redirects to `/login` if no session.

#### Profile (`/(tabs)/profile.tsx`)
- **Purpose**: Account + own listings.
- **Components**: Avatar, name/email, stats (listing count + total views), my-listings grid, Sign-in/Sign-out button, language toggle, link to Legal/Support.
- **Actions**:
  - Tap my listing → `/listing/[id]`.
  - Sign in → `/login` modal.
  - Sign out → confirm + `authClient.signOut()`.
  - Toggle language → updates `useLanguageStore`.
- **States**: Logged-out (CTA only), Loading session, Logged-in (full view), Empty (no listings yet), Error.

#### Listing Detail (`/listing/[id]`)
- **Components**: Image gallery (horizontal scroll), price, title, brand/model, condition badge, grade badge (if verified), inspection date, description, seller card (name, trust count, avatar), Contact Seller button, Report listing button, Safety tips block, iRepair grading CTA (if not verified), Store meetup map preview.
- **Actions**:
  - Tap image → fullscreen viewer.
  - Tap Contact Seller → open chat (or login).
  - Tap Report → POST `/api/listings/:id/report`.
  - Tap "Get verified" → `/book-appointment?listingId=...`.
  - Tap store pin → `/stores`.
- **States**: Loading, Not found (404), Removed (held), Success, Auth-required.

#### Onboarding (`/onboarding`)
- **3 steps**:
  1. Welcome splash.
  2. Value-prop carousel (3 slides: Verified, Safe Pickup, Local).
  3. City gate selector → city + country → routes eligible users to `/(tabs)`, ineligible to `/waitlist` or `/demo-browse`.
- **Persists**: `useOnboardingStore`, `useCityStore`, calls `PATCH /api/users/onboarding`.

#### Login (`/login` modal)
- Email + password form, sign in / sign up toggle, name field (signup only).
- Calls `authClient.signIn.email` / `authClient.signUp.email`.
- Error message inline.

#### Waitlist (`/waitlist`)
- **Fields**: email (required), city (required), country (required), interestType (buyer / seller / both), phone (optional), socialHandle (optional), notes (optional, ≤500), languagePref, referredByCode (optional), consent checkbox (required).
- **Validation**: Zod, all min-length checks.
- **Submit**: POST `/api/waitlist`. On 201, navigate to `/waitlist-success`.
- **Rate limit**: 3 attempts per email/hour (server-side).

#### Waitlist Success (`/waitlist-success`)
- Display generated 8-char referral code, share button (system share sheet), copy-to-clipboard, referral count.

#### Book Appointment (`/book-appointment`)
- **Fields**: date picker (next 14 days, Sundays excluded), time slot (morning / afternoon), optional listing context, notes.
- **Submit**: POST `/api/appointments`. Returns appointment with status "pending".

#### Stores (`/stores`)
- 2 Rhodes locations rendered, with name (Greek + English), address, phone (tap-to-call), hours, map preview (react-native-maps), Book Appointment CTA.

#### Support / Legal / Demo Browse
- Static informational pages with contact info and disclaimers.

### 2.3 Global States
| State | Treatment |
|------|-----------|
| Loading | Skeleton cards or spinner; React Query `isLoading`. |
| Empty | Friendly empty-state with icon and helper text. |
| Error | Inline error + "Try again" button; Zod validation errors per field. |
| Success | Render content; toast for action confirmations. |
| Auth-required | Redirect to `/login` modal; preserve return path. |
| Held / under review | 202 response from server → display "Your listing is being reviewed" banner. |
| Fraud-restricted user | Disable Sell/Book CTAs; show "Account in review" banner. |

---

## 3. Features

### 3.1 Implemented (functional today)
1. Email/password auth (Better Auth + Expo Secure Store).
2. Listings CRUD: create, list with filters (category, condition, search, price, featured, verifiedOnly, sellerId), detail, update, delete.
3. View counter on listing detail.
4. Listing report endpoint (auto-hide thresholds: 2 reports / 24 h for private, 5 for store).
5. Fraud scoring on listing create (price anomaly detection vs. PRICING_BANDS).
6. Fraud holds with Missive draft generation for super admin.
7. User strikes with 90-day decay.
8. P2P chat with URL/off-platform-link moderation and image-spam detection.
9. Chat report endpoint.
10. Appointments: book + list.
11. Waitlist signup with referral code (`MU` + 6 random chars), referrer bonuses, position score.
12. Onboarding flow (city gate, language preference).
13. Image upload (multipart, 10 MB max, JPEG/PNG/GIF/WebP) saved to `uploads/` and served as `/uploads/*`.
14. Bilingual UI (Greek default, English toggle) via `useLanguageStore`.
15. Rule-based assistant chat (`/api/assistant/chat` and `/api/assistant/suggestions`) — keyword-routed responses, not an LLM call.
16. Tab-based mobile navigation with magenta-on-black aesthetic.

### 3.2 Partially implemented
1. **iRepair store directory** — hardcoded to 2 Rhodes locations in client; `Store` table exists in DB but not seeded/managed via API.
2. **Staff/admin roles** — `Staff`, `AuditLog`, `AutoActionLog`, `ModerationConfig`, `GradeConfig` schemas exist; **no admin UI/endpoints** to drive them.
3. **Inspection workflow** — `Inspection` and `Token` (rotating 6-digit code) schemas exist but no inspector-facing UI/endpoints to create them.
4. **RevenueCat IAP** — wired in mobile (`react-native-purchases@9.6.7`) but no actual paywall/SKU flow on screen.
5. **Onboarding city gate** — UI exists; only Rhodes is eligible.
6. **AssistantChat** — keyword-based; no real LLM behind it.
7. **Email verification** — Better Auth supports it; no UI flow.

### 3.3 Missing but implied
1. Real **payments / escrow** (currently pickup-only and off-platform).
2. **Order / reservation lifecycle** (no record of who-bought-what; held/sold state on listing not modeled).
3. **Push notifications** for: new message, listing approved, appointment confirmed, fraud hold resolution.
4. **Admin moderation dashboard** to release fraud holds, approve listings, view audit log, manage stores/staff.
5. **Inspector / staff app or web UI** for performing inspections and validating token codes.
6. **Saved searches / favorites / watchlist.**
7. **Pagination cursor / infinite scroll** — current API uses offset/limit which is fine but UI doesn't load more.
8. **Email transactional sends** (currently only Missive drafts for fraud).
9. **Stripe / Greek payment gateway** for diagnostic fee redemption.
10. **Analytics** (no event tracking).
11. **Conversations list screen** — `POST /api/messages` + `GET /api/messages/:recipientId` exist but no inbox UI.
12. **Listing edit screen** — `PUT /api/listings/:id` exists but no UI.

### 3.4 Should NOT be rebuilt (drop)
1. **Expo-specific modules** (`expo-camera`, `expo-image-picker`, `expo-secure-store`, `expo-location`, `expo-haptics`, `expo-image-manipulator`, RevenueCat) — not portable; use web equivalents (`<input type="file">`, browser geolocation, HTTP-only cookies).
2. **NativeWind** — replace with plain Tailwind.
3. **react-native-maps** — replace with Mapbox GL JS or Google Maps Embed.
4. **Bottom-tab navigator** — replace with a top nav bar + responsive sidebar on desktop.
5. **`/modal` and `/token` placeholder routes** — empty in current app; remove.
6. **Demo-browse "locked city" screen** — V1 web should just route ineligible users to `/waitlist` directly.
7. **Greek-specific copy hardcoded in components** — move to `next-intl` message catalogs.
8. **Fraud detection's hardcoded PRICING_BANDS** — keep, but expose admin UI to tune `ModerationConfig` and `GradeConfig`.
9. **`moment` dependency** — already replaced by `date-fns`; drop `moment`.
10. **Custom file storage in `uploads/`** — replace with Supabase Storage.
11. **`token.tsx` and `modal.tsx` route stubs** — drop.

---

## 4. Data Model

> Migrate from SQLite/Prisma to **Postgres/Supabase**. Below are the entities, fields, types, relations, validations, and sample records.

### 4.1 `users` (combines Better Auth `user` + onboarding/fraud fields)
| Field | Type | Default | Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| email | text | — | UNIQUE, lowercased |
| name | text | null | |
| email_verified | bool | false | |
| image | text | null | avatar URL (Supabase Storage) |
| default_city | text | null | e.g. "rhodes" |
| onboarding_completed | bool | false | |
| selected_city | text | null | |
| selected_country | text | null | |
| is_eligible_city | bool | false | |
| language_pref | text | 'el' | "el" \| "en" |
| trust_event_count | int | 0 | verified transactions; 2+ = trusted |
| fraud_score | int | 0 | 0–100 |
| is_held | bool | false | account frozen |
| restricted_mode | bool | false | |
| restricted_until | timestamptz | null | |
| tokens_disabled | bool | false | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | trigger to auto-update |

**Validations**: email format, language_pref ∈ {el,en}, fraud_score ∈ [0,100].
**Relations**: 1:N listings, 1:N appointments, 1:N strikes, 1:N sessions.
**Example**:
```json
{
  "id": "8f1...",
  "email": "maria@example.com",
  "name": "Maria K.",
  "language_pref": "el",
  "selected_city": "rhodes",
  "is_eligible_city": true,
  "trust_event_count": 2,
  "fraud_score": 0
}
```

### 4.2 `listings`
| Field | Type | Default | Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| seller_id | uuid | — | FK users.id, ON DELETE CASCADE |
| title | text | — | 3–100 chars |
| description | text | — | 10–2000 chars |
| price | numeric(10,2) | — | ≥ 0 |
| category | text | — | enum(phone, tablet, laptop, accessory) |
| condition | text | — | enum(new, like_new, good, fair, parts) |
| brand | text | null | |
| model | text | null | |
| images | jsonb | '[]' | array of URLs, length 3–10 |
| location | text | null | free-text pickup hint |
| city | text | 'rhodes' | only "rhodes" in V1 |
| grade | text | null | enum(A,B,C,D) |
| checklist_complete | bool | false | |
| inspection_date | timestamptz | null | |
| status | text | 'pending' | enum(pending, approved, rejected) |
| is_active | bool | true | |
| is_featured | bool | false | |
| is_store | bool | false | "Sold by iRepair" |
| views | int | 0 | |
| fraud_score | int | 0 | |
| is_held | bool | false | |
| report_count_24h | int | 0 | |
| last_report_at | timestamptz | null | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**Indexes**: category, seller_id, city, status, (is_active, is_held, status) compound for the public-list query.
**Validations**: `length(images) BETWEEN 3 AND 10`, price ≥ 0, fraud_score ∈ [0,100].
**Pricing bands** (% of new for anomaly detection): new 85–95, like_new 75–88, good 60–75, fair 40–60, parts 10–35.
**Grade multipliers**: A=1.00, B=0.93, C=0.85, D=0.60.
**Example**:
```json
{
  "id": "lst_01J...",
  "seller_id": "8f1...",
  "title": "iPhone 13 Pro 128GB",
  "description": "Excellent condition, battery 91%, includes box and cable.",
  "price": 549.00,
  "category": "phone",
  "condition": "like_new",
  "brand": "Apple",
  "model": "iPhone 13 Pro",
  "images": ["https://.../1.jpg","https://.../2.jpg","https://.../3.jpg"],
  "city": "rhodes",
  "grade": "B",
  "checklist_complete": true,
  "inspection_date": "2026-05-01T10:00:00Z",
  "status": "approved",
  "is_active": true,
  "is_featured": true,
  "views": 124
}
```

### 4.3 `messages`
| Field | Type | Default | Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| conversation_id | text | — | sorted(`${a}_${b}`) |
| sender_id | uuid | — | FK users.id |
| recipient_id | uuid | — | FK users.id |
| content | text | — | 1–2000 chars, post-moderation |
| image_url | text | null | |
| image_hash | text | null | for spam detection |
| is_hidden | bool | false | soft-hidden from recipient |
| flagged_reason | text | null | url \| off_platform \| image_spam \| reported |
| listing_id | uuid | null | context FK |
| created_at | timestamptz | now() | |

**Indexes**: conversation_id, sender_id, recipient_id.
**Validations**: content non-empty after sanitization; recipient ≠ sender.

### 4.4 `chat_reports`
id, message_id (FK), reporter_id (FK users), reason (1–500), created_at.

### 4.5 `user_strikes`
id, user_id (FK), reason text, created_at, expires_at (= created_at + 90 days). Index on user_id.

### 4.6 `fraud_holds`
id, entity_type ∈ {user, listing, chat, service, appointment}, entity_id, fraud_score, reason, missive_draft_id (nullable), resolved_at, resolved_by, created_at. Index on entity_id.

### 4.7 `appointments`
| Field | Type | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| user_id | uuid | FK users.id |
| listing_id | uuid | null, FK listings.id |
| store_id | uuid | null, FK stores.id |
| date | timestamptz | — |
| time_slot | text | enum(morning, afternoon) |
| status | text | 'pending' (pending, approved, checked_in, completed, cancelled) |
| token_id | uuid | UNIQUE, FK tokens.id |
| diagnostic_redeemed | bool | false |
| turnaround_hours | int | null |
| notes | text | null |
| created_at, updated_at | timestamptz | |

**Rules**: date must be future, not on Sunday, ≤ 14 days out.

### 4.8 `stores`
id, name, name_el, address, address_en, phone, hours, hours_note, lat, lng, is_primary, visible_in_app (default true), promo_enabled, partner_status enum(owned, partner), lead_fee_per_checkin, lead_fee_per_redeem, created_at, updated_at.
**Seed**: 2 Rhodes locations (currently hardcoded in mobile).

### 4.9 `staff`
id, user_id, store_id, role enum(super_admin, admin, store_manager, moderator), is_active, created_at, updated_at. UNIQUE(user_id, store_id).

### 4.10 `inspections`
id, listing_id, store_id, inspector_id (user_id), grade enum(A,B,C,D), checklist_json jsonb, notes, inspected_at.

### 4.11 `tokens`
id, type enum(appointment, reservation), entity_id, user_id, store_id, code (6-digit, rotates every 60s), code_rotated_at, is_active, is_redeemed, redeemed_at, redeemed_by_id, expires_at (72h after approval), created_at. UNIQUE(entity_id, type). Index on code.

### 4.12 `audit_logs`
id, actor_id, actor_role, action, entity_type, entity_id, details jsonb, ip_address, created_at. Index on actor_id, (entity_type, entity_id), created_at.

### 4.13 `auto_action_logs`
id, entity_type, entity_id, action (auto_hide, auto_restrict, strike_added), reason, details jsonb, created_at.

### 4.14 `grade_configs`
id, store_id (nullable; null = global), grade_a numeric (1.00), grade_b (0.93), grade_c (0.85), grade_d (0.60), updated_by, created_at, updated_at.

### 4.15 `moderation_configs`
id, private_report_threshold (2), store_report_threshold (5), cooldown_days (7), limited_state_days (7), strike_decay_days (90), fraud_hold_threshold (80), updated_by, created_at, updated_at.

### 4.16 `waitlist_signups`
id, email UNIQUE, city, country, interest_type enum(buyer, seller, both), consent (must be true), phone, social_handle, notes (≤500), language_pref, referral_code UNIQUE (format `MU` + 6 chars), referred_by_code (nullable), referral_count (default 0), position_score (default 0), created_at. Index on referral_code, referred_by_code.

### 4.17 `profiles` (optional)
id, handle UNIQUE, user_id UNIQUE FK — only needed if we want public handles. Otherwise drop and put `handle` on `users`.

---

## 5. Business Logic

### 5.1 Pricing & Grading
- **Price anomaly check** at listing-create time:
  - Lookup `PRICING_BANDS[condition]` → minimum % of new (e.g., `good.min = 60`).
  - Compute floor for the device using a baseline new price (currently from hardcoded ranges per category).
  - If listed price < 30% of floor → +25 fraud, **add strike**.
  - If listed price < 50% of floor → +15 fraud, no strike.
- **Grade multipliers** (applied for suggested-price display): A=1.00, B=0.93, C=0.85, D=0.60. Configurable per store via `grade_configs`.

### 5.2 Fraud Holds
- Threshold (default 80) → set `is_held=true`, `is_active=false`; on user: `is_held=true`, `restricted_mode=true`, `restricted_until = now + 7 days`, `tokens_disabled=true`.
- Create `fraud_holds` row + Missive draft "🚨 Fraud Hold: ...".
- Endpoint returns 202 to client.

### 5.3 Reporting & Auto-Hide
- POST `/api/listings/:id/report` → increment `report_count_24h` (reset if last report > 24 h), set `last_report_at = now`, add 10 to fraud_score.
- Auto-hide threshold: 2 reports/24h for **private**, 5 for **store**. On hide, add strike to seller, create Missive draft.

### 5.4 Strike Decay
- All strikes expire 90 days after creation; active count = strikes with `expires_at > now`.

### 5.5 Chat Moderation
- Strip & replace URLs (`http://`, `https://`, `www.`, common domains) with "[Link removed for safety]" → flag `url`.
- Detect off-platform terms: WhatsApp, Telegram, Instagram, Messenger, Signal, Viber, WeChat, `wa.me`, `t.me`, `@handle` near social terms → flag `off_platform`.
- Phone numbers (10+ digits with optional `+`) → flag `off_platform`.
- Image spam: same `image_hash` to ≥3 recipients within 5 min → flag `image_spam`, hide.
- Flagged messages: `is_hidden=true` (hidden from recipient, visible to sender) + tooltip to sender.

### 5.6 Permissions
- **Listing CRUD**: only `seller_id == auth.uid` can update/delete.
- **Listing visible to public**: `is_active=true AND is_held=false AND status='approved'`.
- **Held user**: cannot create listings, cannot redeem tokens.
- **Restricted user**: same as held (until `restricted_until`).
- **Staff** (`staff.role`): super_admin can release holds, edit moderation/grade configs; store_manager can manage their store's staff and inspections; moderator can hide listings & messages, can't ban users.
- **Auth-required endpoints**: all `POST/PUT/DELETE` except `/api/upload/image`, `/api/waitlist`, `/api/assistant/*`.

### 5.7 Waitlist Referrals
- On signup, generate `MU` + 6 random alphanumeric uppercase → `referral_code`.
- If `referred_by_code` matches an existing row AND `referred_by_code !== referral_code`: increment referrer's `referral_count += 1`, `position_score += 3`.
- Self-referral and invalid codes are silently ignored.
- Rate limit: 3 attempts per email per hour (server-side, in Redis/Upstash on Vercel).

### 5.8 Appointment Rules
- Date: must be a future date ≤ 14 days out, not Sunday.
- Time slot: morning or afternoon.
- After approval (admin), a `tokens` row is created with rotating 6-digit code and 72 h `expires_at`.

### 5.9 Trust Display
- `trust_event_count >= 2` → show "Trusted Seller" badge.
- `grade != null AND checklist_complete = true` → show "iRepair Verified" badge with grade.

### 5.10 Edge Cases to Handle
- Listing detail of a held listing returned for the seller themselves; 404 for others.
- Deleted user → cascade deletes listings (CASCADE), but messages remain (display as "Deleted user").
- Image upload that exceeds 10 MB → 400 with explicit message.
- Same email signs up to waitlist twice → return existing row (200) rather than 409.
- Concurrent fraud holds → idempotent: re-running the check on a held listing must not double-strike.

---

## 6. Integrations

| Concern | Current | Web rebuild |
|---|---|---|
| **Auth** | Better Auth + Expo Secure Store (cookie-based session) | **Supabase Auth** (email/password + magic link). Sessions via HTTP-only cookies on Vercel. |
| **DB** | Prisma + SQLite (file: dev.db) | **Supabase Postgres** with RLS policies. Use `@supabase/supabase-js` server-side; consider Prisma + Postgres if you want the existing schema preserved as-is. |
| **File storage** | Local `uploads/` directory served statically | **Supabase Storage** bucket `listings` (public-read, authenticated-write). Use Supabase signed-upload URLs from client. |
| **Email / fraud alerts** | Missive Drafts API (`https://public.missiveapp.com/v1/drafts`) | Keep Missive integration as-is (server-side `fetch`). Add **Resend** (or Supabase SMTP) for user-facing transactional emails (welcome, waitlist confirmation, appointment confirmation). |
| **Payments** | None (RevenueCat wired but unused) | **Stripe** for diagnostic-fee deposits / future order escrow. |
| **Maps** | `react-native-maps` (Google) | **Mapbox GL JS** or `@vis.gl/react-google-maps` for store locations. |
| **AI assistant** | Rule-based keyword router on backend (no LLM) | **Anthropic Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) via `@anthropic-ai/sdk` with prompt caching. Falls back to rule-based suggestions for cold start. |
| **Push / notifications** | None | **Resend** email + **Vercel Cron** for digest. Optional: web push later. |
| **Analytics** | None | **PostHog** (open-source friendly) or **Vercel Analytics**. |
| **Rate limiting** | In-process (single Bun instance) | **Upstash Redis** rate limiter (`@upstash/ratelimit`) — necessary because Vercel functions are stateless. |
| **i18n** | `useLanguageStore` + ad-hoc strings | **next-intl** with `el` (default) and `en` locales, route prefix `/el` and `/en`. |
| **Image handling** | `expo-image-manipulator` (resize/crop client-side) | **Next.js Image** + Supabase Storage transform URLs (`?width=800&quality=80`). |
| **Search** | LIKE on title/description/brand/model | Postgres full-text search (`tsvector` with `simple` + `greek` dictionaries) or Supabase pg_trgm extension. |
| **CI / hosting** | None (Vibecode container) | **GitHub Actions** (typecheck, test, build) + **Vercel** deploy on push to main; PR preview deployments. |

### Environment variables (web rebuild)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only
DATABASE_URL=                       # Supabase Postgres connection string (server-only)
ANTHROPIC_API_KEY=                  # server-only
RESEND_API_KEY=                     # server-only
MISSIVE_API_KEY=                    # server-only
MISSIVE_ORG_ID=                     # server-only
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=                  # later
STRIPE_WEBHOOK_SECRET=              # later
NEXT_PUBLIC_MAPBOX_TOKEN=           # client-safe (scope-restricted)
NEXT_PUBLIC_APP_URL=
```

---

## 7. Design System

### 7.1 Colors (mobile today)

| Token | Hex | Role |
|---|---|---|
| `--brand-primary` | `#FF00FF` | Magenta — primary CTAs, tab highlight |
| `--brand-secondary` | `#00FF88` | Emerald — success, "verified" |
| `--brand-accent-cyan` | `#00BFFF` | Secondary actions |
| `--brand-accent-gold` | `#FFD700` | Featured / info badges |
| `--state-error` | `#FF6B6B` | Destructive / warning |
| `--bg-base` | `#000000` | Pure black background |
| `--bg-elev-1` | `#0a0a0a` | Tab bar / surface |
| `--bg-elev-2` | `#1a1a2e` | Card |
| `--bg-elev-3` | `#0f0f23` | Nested card |
| `--border` | `#333333` | 1–2px borders |
| `--text-primary` | `#FFFFFF` | Body / heading |
| `--text-secondary` | `#9CA3AF` | Captions, meta |

**Recommendation for web**: keep the magenta/emerald accents but tone the background to `#0B0B12` (less pure black, easier on desktop monitors) and add a **light theme** (white surface + magenta accents) for daytime browsing. shadcn/ui ships with a CSS-variable theming system — define both themes in `globals.css` and use the `next-themes` toggle.

### 7.2 Typography

| Role | Mobile | Web (proposed) |
|---|---|---|
| Display | `text-4xl font-black` | Geist Sans, 48/56, 800 |
| H1 | `text-3xl font-black` | 36/44, 800 |
| H2 | `text-2xl font-bold` | 28/36, 700 |
| H3 | `text-xl font-bold` | 22/30, 700 |
| Body | `text-base font-medium` | 16/24, 500 |
| Caption | `text-sm` | 14/20, 500 |
| Label | `text-xs uppercase font-bold` | 12/16, 700, tracking 0.06em |

Default sans: **Geist Sans** (via `next/font/google`), fallback system. Numbers tabular for prices.

### 7.3 Components catalog (rebuild list)

shadcn/ui primitives to install: `button`, `card`, `input`, `textarea`, `select`, `dialog`, `sheet`, `dropdown-menu`, `tabs`, `toast`, `tooltip`, `avatar`, `badge`, `separator`, `skeleton`, `form`, `popover`, `command`, `pagination`, `scroll-area`, `alert`, `accordion`.

Project-specific components:
- `ListingCard` — image, price, title, condition badge, grade chip, verified badge, view count.
- `ListingGrid` — responsive grid (1 col mobile, 2 tablet, 3 desktop, 4 wide).
- `CategoryChip`, `ConditionChip`, `GradeBadge`, `VerifiedBadge`, `TrustedSellerBadge`.
- `PhotoUploader` — drag-drop + paste, 3–10 images, preview reorder.
- `PriceInput` — currency-formatted (EUR), tabular numerals.
- `FilterSidebar` — desktop sidebar with category/condition/price/verified toggle; collapses to bottom `Sheet` on mobile.
- `SearchBar` — debounced (300 ms) with Cmd+K opener.
- `AssistantPanel` — slide-over `Sheet` from right on desktop, full-screen modal on mobile.
- `StoreCard` — name, address, phone, hours, embedded map.
- `AppointmentPicker` — date grid (14 days, Sundays disabled) + slot toggle.
- `LanguageSwitcher` — el / en pill toggle in header.
- `MessageBubble` (for inbox/chat).
- `SafetyTipsCard`.
- `EmptyState` — icon + title + helper + CTA.
- `ErrorBoundary` with retry.

### 7.4 Modals & overlays
- `Dialog` for confirms (delete, sign-out, report).
- `Sheet` (right) for filters, assistant chat, conversation drawer on desktop.
- `Sheet` (bottom) for mobile filter/sort.
- `Toast` (top-right) for inline feedback.

### 7.5 Navigation patterns

- **Desktop (≥1024 px)**: top bar (logo left, search center, language + sign-in right). Secondary left rail on `/dashboard` and `/account` only.
- **Tablet (640–1023 px)**: top bar; filters collapse into sheet trigger.
- **Mobile (<640 px)**: top bar + bottom nav with 4 destinations (Home, Browse, Sell, Account). This preserves the iOS-style affordance for repeat users.

### 7.6 Layout patterns
- Max content width `1280 px`, gutters `24 px` desktop / `16 px` mobile.
- Card radius `16 px` (`rounded-2xl`), buttons `12 px` (`rounded-xl`).
- Spacing scale: Tailwind defaults (4-px base).
- Elevation: subtle border (`border-white/10` on dark, `border-zinc-200` on light) + soft shadow (`shadow-lg shadow-fuchsia-500/10`).

---

## 8. Web App Rebuild Recommendation

### 8.1 What should change from mobile

| Mobile | Web change | Reason |
|---|---|---|
| 4 bottom tabs | Top nav + (mobile only) bottom nav | Desktop users expect top nav; bottom nav preserved <640 px. |
| Photo carousel for listing | Image gallery + thumbnail strip on desktop, swipe gallery on mobile | More real estate on desktop. |
| One-card-at-a-time "Featured" carousel on Home | Hero featured row + multi-row dashboard (Recent, Verified, By Category) | Density matters on desktop. |
| Login as modal | Dedicated `/sign-in` and `/sign-up` pages | Better SEO + password manager support. |
| Sell as full-screen form | Multi-step wizard with stepper (Photos → Details → Price → Pickup → Review) | Reduces overwhelm; matches user mental model. |
| Assistant FAB | Right-aligned slide-over panel with Cmd+J shortcut | Keyboard-driven discovery on desktop. |
| Hidden inbox (no UI) | First-class `/inbox` route with 2-pane layout (conversations list + active thread) | Implied feature finally built. |
| iOS-style modals | shadcn `Dialog`/`Sheet` | Web idioms. |
| Bilingual via store | `next-intl` with locale prefix `/el`/`/en` | Better SEO + share-able URLs. |

### 8.2 Routes / Pages

```
/                                  Marketing home (anonymous) → redirects to /browse if signed-in
/[locale]/sign-in
/[locale]/sign-up
/[locale]/onboarding               Multi-step city + language gate
/[locale]/browse                   Filterable listings grid; SSR with searchParams
/[locale]/listings/[id]            Listing detail, SSR
/[locale]/sell                     New listing wizard (auth-required)
/[locale]/sell/[id]/edit           Edit listing (auth-required, owner-only)
/[locale]/inbox                    Conversations list (auth-required)
/[locale]/inbox/[conversationId]   Active thread
/[locale]/appointments             My appointments list
/[locale]/appointments/new         Book appointment (?listingId=)
/[locale]/stores                   iRepair locations with map
/[locale]/account                  Profile + my listings (tabs)
/[locale]/account/settings        Language, password, danger zone
/[locale]/waitlist                 Pre-launch signup (for non-eligible cities)
/[locale]/waitlist/success
/[locale]/legal
/[locale]/support
/admin                             Admin shell (super_admin / moderator only)
/admin/holds                       Fraud holds review
/admin/listings                    Listing approval queue
/admin/users                       Search / restrict / unrestrict
/admin/stores                      Store + staff CRUD
/admin/audit                       Audit log viewer
/admin/config                      Moderation + grade configs
```

API routes (Next.js Route Handlers, all server-side):
```
/api/listings (GET, POST)
/api/listings/[id] (GET, PUT, DELETE)
/api/listings/[id]/report (POST)
/api/messages (POST)
/api/messages/[recipientId] (GET)
/api/messages/report (POST)
/api/appointments (GET, POST)
/api/users/me (GET)
/api/users/onboarding (PATCH)
/api/upload/image (POST)            → returns Supabase signed upload URL
/api/waitlist (POST)
/api/waitlist/check/[email] (GET)
/api/waitlist/referral/[code] (GET)
/api/assistant/chat (POST, streams)
/api/assistant/suggestions (GET)
/api/admin/* (protected by role)
```

### 8.3 Dashboard structure (signed-in `/browse` + `/account`)

**Desktop `/browse`** (3-column):
- Left rail (240 px): filter sidebar.
- Center (fluid): results grid (3 cards/row at 1280, 4 at 1536).
- Right (320 px, optional): "Need help?" assistant + safety tips block.

**Desktop `/account`** (tabs):
- Overview (avatar, stats, sign-out)
- My Listings (grid with edit/delete actions)
- My Appointments (timeline)
- Inbox link
- Settings (language, password)

**Admin `/admin`** (super_admin/moderator):
- Sidebar nav + content area; data tables (TanStack Table + shadcn) with pagination, filtering, and bulk actions.

### 8.4 Layouts

| Breakpoint | Width | Listing grid | Nav |
|---|---|---|---|
| Mobile | < 640 px | 1 col | Top bar + bottom tabs |
| Tablet | 640–1023 px | 2 col | Top bar only |
| Desktop | 1024–1535 px | 3 col | Top bar + optional left rail on browse |
| Wide | ≥ 1536 px | 4 col | Top bar + left rail |

---

## 9. Technical Rebuild Spec for Codex

### 9.1 Stack pin

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Runtime | Node.js | 22 LTS |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui (Radix primitives) | latest |
| Forms | react-hook-form + zod | latest |
| Server state | TanStack Query | 5.x |
| Client state | Zustand (where needed) | 5.x |
| DB | Supabase Postgres | — |
| Auth | Supabase Auth | — |
| Storage | Supabase Storage | — |
| i18n | next-intl | latest |
| Email | Resend | — |
| AI | `@anthropic-ai/sdk` (Claude Haiku 4.5 `claude-haiku-4-5-20251001`) | latest |
| Rate limit | `@upstash/ratelimit` + Upstash Redis | latest |
| Maps | `mapbox-gl` + `react-map-gl` | latest |
| Analytics | PostHog JS | latest |
| Hosting | Vercel | — |
| CI | GitHub Actions | — |
| Lint | ESLint + `eslint-config-next` + Prettier | — |
| Test | Vitest (unit) + Playwright (e2e) | latest |

### 9.2 Repo layout

```
.
├── app/
│   ├── (marketing)/page.tsx
│   ├── [locale]/
│   │   ├── (auth)/sign-in/page.tsx
│   │   ├── (auth)/sign-up/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── browse/page.tsx
│   │   ├── listings/[id]/page.tsx
│   │   ├── sell/page.tsx
│   │   ├── sell/[id]/edit/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── inbox/[conversationId]/page.tsx
│   │   ├── appointments/page.tsx
│   │   ├── appointments/new/page.tsx
│   │   ├── stores/page.tsx
│   │   ├── account/page.tsx
│   │   ├── account/settings/page.tsx
│   │   ├── waitlist/page.tsx
│   │   ├── waitlist/success/page.tsx
│   │   ├── legal/page.tsx
│   │   └── support/page.tsx
│   ├── admin/
│   │   └── ...
│   ├── api/
│   │   └── ...
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn primitives
│   ├── listing/
│   ├── filters/
│   ├── chat/
│   ├── assistant/
│   ├── maps/
│   └── layout/
├── lib/
│   ├── supabase/        # browser, server, admin clients
│   ├── auth.ts          # session helpers
│   ├── ratelimit.ts
│   ├── moderation.ts    # chat + fraud logic
│   ├── pricing.ts       # PRICING_BANDS + grade multipliers
│   ├── missive.ts
│   ├── anthropic.ts
│   ├── email.ts         # Resend
│   ├── i18n/
│   └── shared/contracts.ts  # ported from mobile shared/
├── messages/
│   ├── el.json
│   └── en.json
├── supabase/
│   ├── migrations/      # SQL migrations
│   └── seed.sql
├── tests/
│   ├── unit/
│   └── e2e/
├── public/
├── .github/workflows/ci.yml
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

### 9.3 Auth & RLS

Use Supabase Auth with email/password. **All tables protected by RLS**:

```sql
-- listings: anyone can read approved+active listings; owner can read/update/delete their own.
alter table listings enable row level security;
create policy "public can read approved" on listings
  for select using (status = 'approved' and is_active = true and is_held = false);
create policy "owner can read own" on listings
  for select using (auth.uid() = seller_id);
create policy "owner can insert" on listings
  for insert with check (auth.uid() = seller_id);
create policy "owner can update" on listings
  for update using (auth.uid() = seller_id);
create policy "owner can delete" on listings
  for delete using (auth.uid() = seller_id);
-- (similar policies for messages, appointments, etc.)
```

Server-side mutations that need elevated access (fraud holds, audit logs, admin actions) use the **service role key** only inside Route Handlers, never exposed to the browser.

### 9.4 AI assistant (Claude Haiku 4.5)

- Model id: `claude-haiku-4-5-20251001`.
- Use `messages.stream` from `@anthropic-ai/sdk` for streaming responses to `/api/assistant/chat`.
- Add **prompt caching** on the system prompt (which contains the marketplace rules, pricing bands, safety tips, store info) with `cache_control: { type: "ephemeral" }`. Expect ~90% cache-hit rate.
- Keep a rule-based suggestions endpoint (`/api/assistant/suggestions`) as a static fallback for cold start.
- Auth/abuse: tie chat to Supabase session and rate-limit 30 messages/hour/user via Upstash.

### 9.5 Image upload flow

1. Client requests a signed upload URL from `POST /api/upload/sign` (server validates auth + content-type + size).
2. Client `PUT`s file directly to Supabase Storage.
3. Client posts the resulting URL into the listing's `images[]` on `POST /api/listings`.
This avoids streaming bytes through Vercel functions and stays under the 4.5 MB body limit.

### 9.6 Search

Add `tsvector` column on listings:
```sql
alter table listings add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(brand,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(model,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'C')
  ) stored;
create index listings_search_idx on listings using gin(search_vector);
```

### 9.7 i18n

- `next-intl` with `locales: ['el', 'en']`, `defaultLocale: 'el'`.
- Greek-default URLs: `/el/browse`, `/en/browse`.
- All UI strings in `messages/el.json` and `messages/en.json`.
- Dates via `Intl.DateTimeFormat` with locale.
- Prices: `Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })`.

### 9.8 CI / CD

`.github/workflows/ci.yml`:
- Triggers: `pull_request`, `push: main`.
- Jobs: install (with cache), `lint`, `typecheck` (`tsc --noEmit`), `test:unit` (Vitest), `build` (`next build`).
- Block merge on red.
- Vercel auto-deploys: preview per PR, production on `main`.
- Branch protection: require ≥1 review, require status checks green.

### 9.9 Performance budgets
- LCP < 2.5 s on mobile (4G throttled).
- Total JS < 200 KB gzipped on `/browse`.
- Server response < 300 ms p95 on listings list (Supabase index + Vercel Edge cache `revalidate: 60`).

### 9.10 Migration of existing data

Provide a one-shot script (`scripts/import-sqlite.ts`) that:
1. Opens the existing `prisma/dev.db` (Bun: `import { Database } from 'bun:sqlite'`).
2. For each table, transforms rows and bulk-inserts via Supabase REST or `pg` client.
3. Maps `images` from JSON string to `jsonb`.
4. Re-uploads images from `uploads/` to Supabase Storage and rewrites URLs.
5. Issues should be idempotent (`on conflict do nothing` on `id`/`email`).

---

## 10. MVP Scope

### 10.1 MUST-HAVE (V1 ship)
1. Email/password auth with email verification.
2. Onboarding (city gate + language).
3. Browse with filters: category, condition, price range, search, verified-only.
4. Listing detail page with image gallery, badges, contact-seller button.
5. Create listing (multi-step wizard) with 3–10 image upload.
6. Edit/delete own listings.
7. Listing report endpoint + auto-hide thresholds.
8. Fraud scoring at create-time + holds + Missive draft.
9. P2P chat with moderation (URL/off-platform blocking, image spam).
10. Inbox UI.
11. Appointments: book + list own.
12. iRepair stores page with 2 Rhodes locations + map + tap-to-call.
13. Waitlist signup with referral code (for ineligible-city visitors).
14. AI assistant chat (Claude Haiku 4.5) with streaming + rule-based fallback suggestions.
15. Bilingual UI (Greek default, English toggle) via `next-intl`.
16. Responsive layout (mobile / tablet / desktop).
17. Light + dark theme.
18. Image upload via Supabase Storage signed URLs.
19. Basic admin queue: `/admin/holds`, `/admin/listings` (approve/reject), `/admin/audit`.
20. Rate limiting on auth, waitlist, chat, assistant.

### 10.2 NICE-TO-HAVE (post-launch)
1. Saved searches / favorites.
2. Push/web notifications for new messages and appointment status.
3. Listing share OG images (`/og` route).
4. Multi-city expansion (add Athens, Thessaloniki to `city` enum).
5. Inspector-facing screens for grading.
6. Rotating-token check-in flow at the store.
7. Public seller profile pages (`/seller/[handle]`).
8. CSV export for admin reporting.

### 10.3 FUTURE
1. Stripe deposits / escrow.
2. Shipping enablement (V2 — schema has the comment already).
3. White-label support (the `VERIFICATION_LABEL` constant exists for this).
4. Native iOS/Android wrappers via Capacitor (if you want app-store presence later).
5. Recommendation engine (collaborative filtering on viewed/contacted listings).
6. Trust score V2 (combine `trust_event_count`, reviews, dispute outcomes).
7. Internationalization beyond el/en.

### 10.4 REMOVE (don't port)
1. RevenueCat / IAP wiring.
2. NativeWind, gesture-handler, reanimated, all Expo modules.
3. `moment` (use only date-fns).
4. `/modal` and `/token` placeholder routes.
5. `/demo-browse` (route ineligible cities to `/waitlist` instead).
6. Mobile bottom-tab navigator (replaced by top nav + responsive bottom nav).
7. Local-disk `uploads/` storage (replaced by Supabase Storage).
8. Better Auth (replaced by Supabase Auth).
9. SQLite (replaced by Postgres).
10. Hono backend in a separate process (replaced by Next.js Route Handlers).

---

## 11. Acceptance Criteria

The V1 rebuild is **shippable** when **all** of the following are true:

### 11.1 Functional
- [ ] A first-time visitor in Greece can: open `/`, switch to English, complete onboarding, land on `/browse`, see ≥10 seeded listings, open a listing detail, and tap "Contact Seller" — which prompts sign-in.
- [ ] A new user can sign up with email/password, verify their email, and reach `/account` with no console errors.
- [ ] An authenticated user can post a listing through the wizard with 3 uploaded images and see it appear in `/browse` within 60 s after admin approval.
- [ ] A listing with a price ≥ 50% below the floor for its (category, condition) triggers a fraud hold (202 response) and creates a Missive draft.
- [ ] A user can send a message containing `https://example.com` — the message is delivered with the URL replaced by `[Link removed for safety]` and the sender sees a tooltip explaining.
- [ ] Sending the same image-hash to 3 different recipients within 5 minutes hides the third message.
- [ ] A user can book an appointment for any non-Sunday date in the next 14 days and see it in `/appointments`.
- [ ] Reporting a listing 2× from different accounts within 24 h auto-hides it.
- [ ] A waitlist signup with a valid referral code increments the referrer's `referral_count` and `position_score`.
- [ ] The assistant chat streams a Claude Haiku 4.5 response for "πόσο αξίζει το iPhone 13 Pro;" with prompt caching enabled (verify `cache_read_input_tokens > 0` on the 2nd+ request).
- [ ] Admin can release a fraud hold from `/admin/holds`, which unsets `is_held` on the entity and writes an `audit_logs` row.
- [ ] An ineligible-city visitor on onboarding is routed to `/waitlist` (not `/demo-browse`).

### 11.2 Non-functional
- [ ] Lighthouse mobile Performance ≥ 85 on `/browse` and `/listings/[id]`.
- [ ] LCP < 2.5 s on 4G Slow throttle for `/browse`.
- [ ] All public pages render meaningful content via SSR (view-source contains listing titles, no flash of empty content).
- [ ] WCAG 2.1 AA color contrast on all text (verified with Axe).
- [ ] All forms have keyboard navigation, labelled fields, and visible focus states.
- [ ] Zero TypeScript errors (`tsc --noEmit` passes).
- [ ] Zero ESLint errors on `eslint .`.
- [ ] CI green: lint, typecheck, unit tests, e2e smoke (sign-up → post listing → message), build.
- [ ] Both `/el` and `/en` routes render with no missing translation keys.
- [ ] No client-side bundle includes the service-role key or `MISSIVE_API_KEY` (verified by grepping `.next` output).
- [ ] RLS enabled on every table; an `anon` Postgres session **cannot** read held listings or another user's messages (verified by integration test).
- [ ] Rate limit returns 429 after the threshold on `/api/auth/*`, `/api/waitlist`, `/api/assistant/chat`.

### 11.3 Operational
- [ ] One-command bootstrap: `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`.
- [ ] `README.md` lists every required env var with a description and example.
- [ ] Production deploy on Vercel succeeds and is reachable on a custom domain (e.g., `mobileunit.gr`).
- [ ] Vercel preview deploys created on every PR.
- [ ] Migration script `scripts/import-sqlite.ts` runs idempotently against the existing `prisma/dev.db` and produces a clean Supabase database with images rehosted.
- [ ] At least one admin user (super_admin) is seeded.

### 11.4 Content & Compliance
- [ ] Greek and English copy reviewed by a native speaker (no machine-translation artifacts).
- [ ] `/legal` and `/support` pages updated to match new payment/handling reality (still pickup-only, iRepair partnership).
- [ ] Privacy notice on `/waitlist` explains consent for marketing emails.
- [ ] All seller-facing fraud messaging is generic and non-accusatory ("Your listing is under review" — never "We think you are a scammer").

---

## Appendix A — Constants to port verbatim

```ts
// shared/contracts.ts
export const PRICING_BANDS = {
  new:      { min: 85, max: 95 },
  like_new: { min: 75, max: 88 },
  good:     { min: 60, max: 75 },
  fair:     { min: 40, max: 60 },
  parts:    { min: 10, max: 35 },
} as const;

export const GRADE_MULTIPLIERS = {
  A: 1.00, B: 0.93, C: 0.85, D: 0.60,
} as const;

export const VERIFICATION_LABEL = "iRepair";
export const PANDAS_PRICING_URL =
  "https://pricing-v2.pandas.io/el-GR/irepair/smartphone";

export const MODERATION_DEFAULTS = {
  privateReportThreshold: 2,
  storeReportThreshold:   5,
  cooldownDays:           7,
  limitedStateDays:       7,
  strikeDecayDays:        90,
  fraudHoldThreshold:     80,
} as const;
```

## Appendix B — Seed iRepair stores (Rhodes)

```sql
insert into stores (name, name_el, address, address_en, phone, hours, lat, lng, is_primary, partner_status)
values
('iRepair Rhodes — Rhodes Town', 'iRepair Ρόδος — Ρόδος Πόλη',
  '<street>, Ρόδος', '<street>, Rhodes',
  '+30 22410 XXXXX', 'Mon–Sat 09:00–21:00',
  36.4341, 28.2176, true, 'owned'),
('iRepair Rhodes — Ialysos', 'iRepair Ρόδος — Ιαλυσός',
  '<street>, Ιαλυσός', '<street>, Ialysos',
  '+30 22410 XXXXX', 'Mon–Sat 09:00–21:00',
  36.4196, 28.1597, false, 'owned');
```
*(Replace placeholder address/phone with the values currently hardcoded in `mobile/src/app/stores.tsx`.)*

---

**End of dossier.**
