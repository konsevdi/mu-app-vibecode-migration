# 25 — Testing Strategy

## Pyramid

```
              /\
             /e2\        Playwright — 10–20 happy paths
            /----\
           / int  \      bun test + real Postgres — 50–80 scenarios
          /--------\
         /   unit   \    bun test — pure functions, 200+
        /------------\
```

## Tooling

- **Unit + integration**: `bun test` (built-in, fast, no extra deps).
- **E2E**: `@playwright/test`. Chromium + WebKit, mobile viewport variants.
- **Visual regression**: `@playwright/test` `toHaveScreenshot()` for 5–6 high-traffic pages (home, browse, listing detail, sell form, waitlist). Updated by reviewer when intentional.
- **Type-level tests**: `tsd` or just `tsc --noEmit` covers it via strict mode.

## Folder layout

```
tests/
├── unit/                — pure-function tests
│   ├── pricing.test.ts
│   ├── conditions.test.ts
│   ├── fraud-score.test.ts
│   ├── moderation-patterns.test.ts
│   └── verification.test.ts
├── integration/         — hits real Postgres (CI runs against supabase local)
│   ├── listings.test.ts
│   ├── messages.test.ts
│   ├── waitlist.test.ts
│   ├── appointments.test.ts
│   ├── rls.test.ts      — RLS enforcement
│   └── auth.test.ts
├── e2e/                 — Playwright
│   ├── waitlist-flow.spec.ts
│   ├── onboarding-rhodes.spec.ts
│   ├── onboarding-non-rhodes.spec.ts
│   ├── create-listing.spec.ts
│   ├── browse-and-filter.spec.ts
│   ├── chat-flow.spec.ts
│   ├── book-appointment.spec.ts
│   └── i18n-switch.spec.ts
└── fixtures/
    ├── users.ts
    ├── listings.ts
    └── factories.ts
```

## Unit tests — what's worth covering

The high-leverage targets are the rules-encoded modules. Each has a deterministic input → output relationship and would silently regress otherwise.

| Module | Why test | Example test |
|---|---|---|
| `lib/pricing.ts` (PRICING_BANDS) | Pricing guide UI depends on bands matching constants | `bandFor('like_new', 1000)` returns `{ min: 750, max: 880 }` |
| `lib/conditions.ts` | Mapping condition slug ↔ label, enum integrity | All 5 conditions resolve in both locales |
| `lib/fraud/score.ts` | Fraud score arithmetic must match policy doc | New listing with 3 reports + verified seller → expected score |
| `lib/moderation/patterns.ts` | Regex regressions are easy and bad | Greek phone variants all flagged, false-positives don't fire on common words |
| `lib/verification.ts` | "Verified after 2+ trust events" rule | 1 event → not verified, 2 events → verified, 5 events → still verified |
| `lib/i18n/casing.ts` | Greek UPPERCASE accent-stripping helper, if any | `toLocaleUpperCase('el-GR')` correct for terminal sigma |
| Zod schemas in `shared/contracts.ts` | Schema drift = runtime crash | Every schema has a positive + negative case |
| Pure formatters (price, date) | Locale-specific | `formatPrice(1234.5, 'el')` → `1.234,50€` |

## Integration tests — RLS focus

The single highest-risk surface in the rebuild is **RLS policies**. A bug here can expose private messages or let one user edit another's listing. Cover every policy explicitly:

```ts
test('RLS: user cannot read other users private listings (pending)', async () => {
  const alice = await createUser('alice');
  const bob = await createUser('bob');
  const aliceListing = await createListing(alice.id, { status: 'pending' });
  const bobClient = supabaseFor(bob);
  const { data, error } = await bobClient
    .from('listings')
    .select('*')
    .eq('id', aliceListing.id)
    .single();
  expect(data).toBeNull();
  expect(error?.code).toBe('PGRST116'); // not found per RLS
});
```

Cover the full matrix per table: anon, user-self, user-other, moderator, admin, super_admin, store_manager (where applicable). One test per row per allowed action.

## Integration — API routes

Spin up a Next.js test server (or call route handlers directly) and exercise:

- `POST /api/waitlist` — valid + duplicate email + bot honeypot.
- `POST /api/listings` — happy path, missing photos, profanity in title, rate-limited.
- `GET /api/listings` — filter combinations match docs.
- `POST /api/messages` — happy path, off-platform URL flagged, rate-limited.
- `POST /api/appointments` — happy path, store closed, duplicate slot.
- `POST /api/tokens/[code]` — valid, expired, already redeemed, wrong store.

## E2E — golden paths

Each spec runs in both `el` and `en` locale (parameterize). Run on Chromium + WebKit. Mobile viewport (iPhone 14) is the default; desktop covered in fewer specs.

1. **`waitlist-flow.spec.ts`** — non-Rhodes user → sees city gate → enters waitlist form → success page → copies referral link.
2. **`onboarding-rhodes.spec.ts`** — new user → onboarding → city gate (Rhodes) → browse loads with listings.
3. **`onboarding-non-rhodes.spec.ts`** — new user → city gate (Athens) → redirected to waitlist.
4. **`create-listing.spec.ts`** — logged-in user → /sell → fill form, attach 3 photos (use Playwright `setInputFiles`) → submit → "submitted for approval" toast → listing shows `pending` in profile.
5. **`browse-and-filter.spec.ts`** — browse → filter by category (phones), condition (like_new), verified-only → URL updates → results count matches.
6. **`chat-flow.spec.ts`** — two browser contexts (buyer + seller) → buyer clicks "contact seller" → opens conversation → exchange 3 messages → URL pasted by seller is auto-flagged.
7. **`book-appointment.spec.ts`** — listing detail → "book appointment" → pick date + morning slot → confirmation → token appears in /token/[code] view.
8. **`i18n-switch.spec.ts`** — landing page in `el` → switch to `en` → URL prefix changes → key strings present in both languages → switching preserved across navigation.

## Auth in E2E

Don't drive the real Supabase email flow in CI. Use the admin API in a `beforeEach` to create users with `email_confirm: true`, then call `supabase.auth.admin.generateLink({ type: 'magiclink' })` and hit the link directly. Faster and deterministic.

## Database state for E2E + integration

Each test gets a clean slice:

- Integration: per-suite Postgres schema (transactional rollback in `afterEach`).
- E2E: dedicated CI Supabase project with `pg_dump` + `pg_restore` between specs, OR per-spec namespacing (user emails like `playwright-{nanoid}@test.local`).

Per-spec namespacing is simpler — go with it for V1.

## Performance budgets

Vercel Speed Insights tracks Core Web Vitals automatically. Budgets (PROPOSED, fail PR if exceeded):

- LCP < 2.5s on browse/listing pages
- INP < 200ms across all flows
- CLS < 0.1
- TTFB < 600ms (Edge runtime helps)

Lighthouse CI runs on PR via Vercel preview URLs. Out of scope for V1 hard-fail; advisory.

## Accessibility tests

`@axe-core/playwright` runs on the same E2E suites. Fail on any **serious** or **critical** violation. Common catches: missing form labels, color contrast on disabled buttons, focus traps in modals.

```ts
import AxeBuilder from '@axe-core/playwright';
test('listing detail is accessible', async ({ page }) => {
  await page.goto('/el/listing/example-id');
  const results = await new AxeBuilder({ page }).analyze();
  const blockers = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(blockers).toEqual([]);
});
```

## Load testing — PROPOSED for V1.1

`k6` or `Artillery`. Target scenarios:

- Browse spike: 100 concurrent users hitting `/el/browse` for 5 minutes.
- Waitlist surge: 500 signups/minute (post-PR / press push).
- Chat thread: 50 conversations with 2 msgs/sec each.

Run against staging Supabase. Establish baselines now; failure modes (RLS lock contention, Realtime fanout cost) tend to surface only above 50 concurrent.

## Manual QA checklist

Before each `staging → production` promotion, a human runs a checklist:

```
[ ] Greek UI: all UPPERCASE strings render without accents
[ ] English UI: no untranslated Greek leaking through
[ ] Locale toggle preserves current URL
[ ] Create listing → admin approves → buyer can see it (live with Realtime)
[ ] Chat from buyer + seller in two browsers
[ ] Off-platform URL flagged in chat
[ ] Appointment booking confirms; token rotates every 60s
[ ] Forgot password email arrives within 1 minute
[ ] Mobile (iPhone 14 + Pixel 7 real device): tap targets ≥ 44px, no overflows
[ ] Dark-mode-system, light-mode-system, forced-colors all readable
[ ] Cookie consent appears on first visit, persists across pages
[ ] Sentry test event from staging routes correctly
```

## Coverage targets

V1 minimum: unit + integration tests cover every export in `lib/fraud/`, `lib/moderation/`, `lib/pricing.ts`, `lib/verification.ts`, `lib/conditions.ts`, and every API route's happy + error paths. E2E covers all 8 golden specs above.

No hard coverage % gate — coverage as a number is gameable. Focus on the categories above.

## CI run time targets

- Unit: < 30s
- Integration: < 3 min
- E2E: < 8 min (Chromium only on PR; full matrix on main)
- Total PR cycle: < 12 min

## Flakiness policy

A test that fails twice within a week without code changes is **quarantined** (skipped with a `// FLAKY` comment + Linear ticket). Don't keep retrying.
