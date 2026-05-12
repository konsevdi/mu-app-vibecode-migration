# 23 — Test Plan

Three layers: unit (`vitest`), integration with real Postgres (`vitest` + Testcontainers + Supabase local stack), and end-to-end (`playwright`). Visual regression via Storybook + Chromatic. Load test via k6 once before launch.

## Layer 1 — Unit tests (vitest)

Target: `lib/**` and `app/**/actions.ts` files that have no DB or network deps.

### lib/fraud-scoring.test.ts

- `checkPricingAnomaly` returns `{isSuspicious:false}` for store listings (`isStore=true`)
- Phone good condition, price=10 (under 30% of min=100) → `{isSuspicious:true, scoreIncrease:25}`
- Phone good condition, price=40 (under 50% of min=100) → `{isSuspicious:true, scoreIncrease:15}`
- Phone good condition, price=120 (within range) → `{isSuspicious:false, scoreIncrease:0}`
- Unknown category/condition combo (`laptop_new`) returns no anomaly
- `performFraudCheck` aggregates: pricing anomaly 25 + currentScore 60 = 85 → `shouldHold=true`
- `performFraudCheck` clamps score to 100 max, 0 min
- Report threshold: private 2, store 5 — verify both paths

### lib/chat-moderation.test.ts

Inputs and expected `flaggedReason`:

| Input | Reason |
|---|---|
| `"hey, want to meet up at the cafe?"` | null |
| `"check this https://example.com/listing"` | `url` |
| `"see www.example.com"` | `url` |
| `"meet me at example.com tomorrow"` | `url` |
| `"can we talk on whatsapp"` | `off_platform` |
| `"WhatsApp me"` | `off_platform` (case-insensitive) |
| `"my insta is @user"` | `off_platform` |
| `"@user on telegram"` | `off_platform` |
| `"call me +306981234567"` | `off_platform` |
| `"+30 698 123 4567"` | `off_platform` (after whitespace strip) |
| `"https://παράδειγμα.com"` | `url` (Unicode flag enabled) |
| `"στείλε μου viber"` | `off_platform` (Greek pattern added in V1.2) |

- `addStrike` creates a row with `expires_at = now() + 90 days`
- `getActiveStrikes` returns count where `expires_at > now()`
- `detectImageSpam`: 2 distinct recipients in 5 min → not suspicious
- `detectImageSpam`: 3 distinct recipients in 5 min → suspicious
- `detectImageSpam`: 3 same recipients in 5 min → not suspicious (distinct count)
- `detectImageSpam`: empty `imageHash` → not suspicious

### lib/verification.test.ts

- `isUserVerified(0)`, `(1)` → false
- `isUserVerified(2)`, `(3)`, `(100)` → true
- `gradeLabels.A === "ΑΡΙΣΤΗ"`, etc.

### lib/waitlist.test.ts

- `generateReferralCode` returns 8 chars starting with `"MU"`
- 10000 generated codes — verify no duplicates
- All chars from the 32-char unambiguous alphabet
- Email masking: `"jane.doe@example.com"` → `"ja***@example.com"`
- Position score formula: `+3` per validated referral

### lib/conditions.test.ts

- `normalizeConditionKey('Σαν καινουργιο')` → `like_new`
- `normalizeConditionKey('Like New')` → `like_new`
- `calculateSuggestedPrice(condition='good', newPrice=500)` returns `{min,max}` within PRICING_BANDS

## Layer 2 — Integration tests (vitest + Testcontainers)

Spin up Postgres 15 + Supabase local stack via Testcontainers. Apply all migrations. Run tests with real RLS.

### RLS policies — every table

Pattern per table:

```ts
describe('listings RLS', () => {
  it('anon can read approved active not-held listings', async () => { ... });
  it('anon cannot read pending listings', async () => { ... });
  it('owner can read own pending', async () => { ... });
  it('staff admin can read everything', async () => { ... });
  it('non-owner authenticated cannot update', async () => { ... });
  it('owner can update own pending', async () => { ... });
  it('owner cannot mark own listing approved (admin only)', async () => { ... });
});
```

Negative tests are critical. For each policy, write at least one row the user MUST NOT see.

### Trigger tests

- Insert into `auth.users` → `profiles` row exists with `email`, `language_pref='el'`
- Insert into `trust_events` → `profiles.trust_event_count += 1`
- Updating `listings.status` outside allowed transitions → trigger raises exception
- Soft-delete profile → cascades to listings, messages owner

### pg_cron jobs

- Manually call `select * from cron.job` — assert 5 scheduled jobs exist
- Manually invoke each job function — assert side-effects (tokens rotate, mv refreshes, expired profiles deleted)

### Signed-URL storage

- Owner upload to `listing-images/owner_uid/...` succeeds
- Non-owner upload to `listing-images/owner_uid/...` fails (RLS)
- Owner signed read URL works; another authed user's signed read URL also works (policy is `authed_read`)
- Anonymous cannot read

### Listing create end-to-end

- Service-role insert listing with anomalous pricing → `is_held=true`, `fraud_holds` row created, profile updated
- Normal listing → `status='pending'`, no fraud_hold
- Insert with images=[] → constraint error
- Insert with images=11 elements → constraint error

### Waitlist idempotency

- Same email submitted twice within 1 hour → second returns existing row, no duplicate

### Message moderation

- Insert message with URL → row has `is_hidden=true`, `flagged_reason='url'`
- Insert image-spam scenario → row flagged

### Token redemption

- Active token redemption by correct store staff → state transitions
- Token redemption by wrong store → 403 (test the route handler)
- Token redemption after `expires_at` → 410
- Token redemption when user `is_held=true` → 403

## Layer 3 — E2E (Playwright)

Three critical journeys:

### Journey 1 — Sell + Browse + Report

```
seller signs up
seller completes onboarding for Rhodes
seller submits a listing with 3 images, normal price
admin approves listing
buyer (anonymous) browses, sees listing
buyer reports listing
admin sees report in queue
admin hides listing
listing no longer visible to buyer
```

### Journey 2 — Appointment + Token

```
buyer signs in
buyer books an appointment at iRepair Rhodes (afternoon)
store_manager approves the appointment
buyer opens the token screen
code displays, rotates after ~60s (use clock manipulation in test)
front_office redeems the displayed code via admin route
appointment status flips to checked_in in real-time on the buyer's screen
```

### Journey 3 — Waitlist + Referral

```
visitor lands on /?ref=MUABCDEF (existing referrer code)
visitor opens city gate, picks Athens
visitor enters waitlist form, submits
welcome email arrives (test inbox)
referrer's position_score incremented by 3 in DB
visitor lands on success page, sees own referral code
```

Each journey runs against a freshly seeded preview environment.

## Visual regression — Chromatic

Stories under coverage:

- `<ListingCard>` × 3 variants × 4 grades × store/private (24 stories)
- `<GradeBadge>` × 4 grades × 2 locales (8)
- `<EmptyState>` × 4 contexts (4)
- `<TokenDisplay>` static + animated (2)
- `<FilterBar>` empty / filtered / over-filtered / mobile (4)
- `<ImageDropzone>` empty / 1 / 5 / 10 / 11 (5)
- `<MessageBubble>` self/other × normal/flagged/reported (6)
- All shadcn primitives × dark mode toggle (later)

Chromatic baseline established on `main`; PR fails on visual diff > threshold without approval.

## Accessibility

Run `@axe-core/playwright` on every E2E page visit. Zero serious / critical violations allowed.

Manual checklist:

- All forms keyboard navigable (Tab order matches visual order)
- Color contrast ≥ AA on all interactive states
- Focus rings visible on dark and light backgrounds
- Greek and English screen reader announcements correct (`lang` attribute)
- All images have alt text (i18n keyed for `alt`)

## Load test — k6

Single run before launch in staging:

```js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m',  target: 50 },   // ramp to 50 RPS
    { duration: '5m',  target: 50 },   // sustain
    { duration: '30s', target: 200 },  // spike
    { duration: '1m',  target: 50 },   // recover
    { duration: '1m',  target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  http.get(`${__ENV.STAGE_URL}/el/browse?category=phone`);
  sleep(1);
}
```

Targets: `/`, `/browse`, `/listing/[slug]`, `/api/assistant`. Pass: p95 < 1200ms, error rate < 1%.

## Manual QA checklist

Run before each production deploy:

- [ ] Greek and English language switch updates UI without page reload (auth) / with reload (anon)
- [ ] All Greek UPPERCASE strings have no accents (visual check on top 10 pages)
- [ ] Listing photos load with blurhash placeholder
- [ ] Token screen updates without polling visible in network tab
- [ ] Reset password email arrives
- [ ] Account deletion shows 30-day grace warning
- [ ] Cookie banner appears on first visit
- [ ] Sitemap and robots.txt include `el` + `en` versions
- [ ] OG image renders on social share preview tool

## Coverage targets

- `lib/` unit: ≥ 80% lines
- `app/**/actions.ts` unit + integration: ≥ 70%
- Critical paths (listing create, sendMessage, bookAppointment, waitlist signup, token redeem): 100% branch
- Overall: ≥ 60%

CI fails if coverage drops below threshold.
