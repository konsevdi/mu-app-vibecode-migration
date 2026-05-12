# 22 — Implementation Tickets

Atomic, copy-pasteable tickets for the Codex agent. Each has acceptance criteria. Estimated in points (1=trivial, 2=half-day, 3=full-day, 5=multi-day).

## EPIC 1 — Project foundation

**T-001 [2] Initialize Next.js 15 + TS strict + Tailwind + shadcn**
- Run `npx create-next-app@latest mobile-unit-web --typescript --app --tailwind --eslint`
- Install shadcn: `npx shadcn@latest init` with neutral palette + Inter font
- Configure `tsconfig.json` with `strict:true` and `noUncheckedIndexedAccess:true`
- AC: `npm run build` succeeds with empty home page

**T-002 [1] Configure next.config.mjs**
- Add CSP headers as in `19_…` Security section
- Enable `experimental.serverActions`
- Configure `images.remotePatterns` to allow Supabase project domain
- AC: deploys to Vercel preview with correct headers

**T-003 [2] Provision Supabase projects**
- Create dev, staging, prod projects
- Copy URL + anon key + service-role key to `.env.local`, Vercel env, GitHub secrets
- Enable pg_cron extension on each
- AC: `supabase status` shows three linked projects

**T-004 [3] Write migration 001_initial_schema.sql**
- All enums + tables + FKs + indexes per `14_SUPABASE_SCHEMA.md`
- AC: `supabase db reset` succeeds; `supabase db lint` zero warnings

**T-005 [3] Write migration 002_rls_policies.sql**
- RLS policies for every table per `15_SQL_MIGRATIONS.md` table
- AC: integration test asserts unauthorized requests are denied; authorized requests succeed

**T-006 [2] Write migration 003_storage_policies.sql**
- Bucket creation + policies per `09_…`
- AC: signed-URL upload succeeds for owner; denied for non-owner

**T-007 [3] Write migration 004_indexes_triggers_functions.sql**
- All helper functions + triggers + pg_cron jobs
- AC: `select cron.job` lists 5 jobs; insert into `auth.users` creates `profiles` row

**T-008 [2] Configure CI workflow**
- GitHub Actions: lint, typecheck, vitest, supabase db lint, chromatic
- AC: PRs run all checks; main branch protected

**T-009 [1] Set up Storybook 8**
- Init Storybook with Vite builder
- Configure shadcn theme tokens
- AC: `npm run storybook` shows a single Button story

## EPIC 2 — Auth + i18n

**T-010 [2] Wire @supabase/ssr clients**
- `lib/supabase/server.ts`, `browser.ts`, `service.ts`
- AC: server client picks up auth cookie; browser client subscribes to auth state

**T-011 [2] Auth middleware**
- `middleware.ts` per `08_…` — refresh session, capture `?ref=`, next-intl integration
- AC: session refreshes silently; protected route redirects to `/auth/login`

**T-012 [2] Sign-in + sign-up + sign-out server actions**
- `app/[locale]/auth/login/page.tsx` + actions
- Form via react-hook-form + zod
- AC: signup creates `auth.users` + `profiles` row; signin sets session cookie

**T-013 [1] Password reset flow**
- `/[locale]/auth/forgot-password` + `/[locale]/auth/reset-password/confirm`
- Resend email template
- AC: full happy path tested in Playwright

**T-014 [2] next-intl setup**
- `i18n/routing.ts`, `messages/el.json`, `messages/en.json`
- Port all keys from `mobile/src/lib/languageStore.ts` per `10_…`
- AC: `/el` and `/en` routes render translated content

**T-015 [1] Greek-uppercase-no-accents lint**
- `scripts/check-greek-uppercase.ts`
- Wire into CI
- AC: introducing an accented uppercase string fails CI

## EPIC 3 — Listings

**T-016 [2] Contracts file `lib/contracts.ts`**
- Port zod schemas from `shared/contracts.ts`
- AC: re-exports match source schemas for backward compatibility checks

**T-017 [3] `createListing` server action**
- Validate via zod
- Image upload via signed URL flow
- Fraud check (port `performFraudCheck`, `checkPricingAnomaly`, `applyListingFraudHold`, `applyFraudHold` verbatim from `backend/src/lib/fraud-scoring.ts`)
- Missive draft (port `createMissiveFraudDraft`)
- Audit log
- AC: 100 random submissions: anomalous → held; normal → approved-pending

**T-018 [2] Browse page RSC**
- `/[locale]/browse` reads searchParams (category, condition, verifiedOnly, minPrice, maxPrice, city, search)
- Cursor pagination
- Renders `listing_card_view`
- AC: filters compose correctly; pagination works without dupes/skips

**T-019 [2] Listing detail page RSC**
- `/[locale]/listing/[slug]`
- Carousel of signed URLs
- Seller card with `<VerifiedBadge>` if `trust_event_count >= 2`
- Contact CTA → opens chat
- Report flow
- AC: report increments `report_count_24h`; threshold auto-hides

**T-020 [3] Sell wizard `/[locale]/sell`**
- 5-step wizard with localStorage draft
- ImageDropzone (3-10), drag reorder
- Pricing guide modal (PRICING_BANDS × GRADE_MULTIPLIERS)
- Submit → server action; held vs approved branch
- AC: full submission renders new listing on profile

**T-021 [1] My listings on profile**
- `/[locale]/profile` shows user's listings (any status)
- Inline edit / mark sold / delete
- AC: state transitions match `18_…`

## EPIC 4 — Messages

**T-022 [2] Conversation derivation + RLS**
- `getConversationId(u1,u2) = [u1,u2].sort().join('_')` (verbatim port)
- RLS policy `messages` per `05_…`
- AC: third party cannot read; sender sees own flagged content; recipient does not

**T-023 [3] `sendMessage` server action**
- Port `moderateMessage` (URL + off-platform regex verbatim)
- Port `detectImageSpam`
- Sanitize content, persist
- Return `{ message, showSenderTooltip, senderTooltip }`
- AC: 12 chat-moderation tests pass (see `23_TEST_PLAN.md`)

**T-024 [2] Messages list + conversation page**
- `/[locale]/messages` lists conversations
- `/[locale]/messages/[conversationId]` renders thread with Realtime subscribe
- AC: new message appears in <2s without page refresh

**T-025 [1] Report message**
- Server action inserts `chat_reports`, hides message, adds strike
- AC: max 5 reports per reporter per 24h enforced

## EPIC 5 — Appointments + tokens + inspections

**T-026 [2] `bookAppointment` server action + slot conflict check**
- Unique (`store_id`,`date`,`time_slot`) partial index on non-cancelled
- AC: concurrent double-book → second returns 409

**T-027 [2] Admin appointment approval flow**
- `/[locale]/admin/appointments` queue
- Approve action issues token row (`is_active=true`, `expires_at=now()+72h`, initial code)
- AC: token row appears with `code != null`

**T-028 [2] pg_cron token rotation job**
- 60s schedule
- Updates `code`, `code_rotated_at`
- AC: 5-minute observation shows ~5 rotations

**T-029 [2] Token display screen + Realtime**
- `/[locale]/appointments/[id]/token`
- Subscribes to `tokens` UPDATE filtered by id
- AC: rotation visible in real time without polling

**T-030 [2] Token redemption (staff)**
- Route handler `app/api/admin/tokens/redeem/route.ts`
- Checks role + store match + active + not redeemed + not expired
- Transitions appointment → `checked_in`, token → `is_redeemed=true`
- AC: held/disabled users return 403; wrong store returns 403

**T-031 [2] Inspection form + trust event trigger**
- `/[locale]/admin/inspections/new`
- Form fields per checklistJson schema in `06_…`
- AC: insert triggers `trust_events`, bumps `trust_event_count`, sets listing `grade` + `checklist_complete`

## EPIC 6 — Waitlist + referrals

**T-032 [2] Waitlist route handler**
- Port verbatim:
  - `generateReferralCode` (MU + 6 chars from 32-char alphabet)
  - Collision retry (10 attempts)
  - Self-referral guard
  - Idempotent by email
- Upstash Redis rate limit (3/hour by email)
- AC: 1000 signups, zero collisions, idempotency preserved

**T-033 [1] Waitlist check + referral lookup endpoints**
- Email masking format `ja***@example.com`
- Case-insensitive code lookup
- AC: lookups return masked email; no PII leak

**T-034 [1] Deep-link referral capture**
- middleware sets `refCode` cookie from `?ref=`
- Sign-up reads cookie, sends as `referredByCode`
- AC: cookie set + cleared after first use

**T-035 [1] Waitlist welcome email (Resend)**
- React Email template
- Localized via `language_pref`
- AC: email arrives in test inbox

## EPIC 7 — Admin

**T-036 [3] Admin queue page**
- `/[locale]/admin/queue` lists pending listings, holds, chat reports, listing reports
- Keyboard shortcuts (J, A, R)
- AC: 100-item queue scrolls smoothly; actions resolve <500ms

**T-037 [2] Audit log helper + admin actions**
- `audit(action, entityType, entityId, diff)` util
- Wired to all admin mutations
- AC: every admin write produces an audit row

**T-038 [2] Admin settings page**
- `/[locale]/admin/settings` (super_admin only)
- Forms for moderation_config, grade_config, stores
- AC: changes write to DB + audit log

**T-039 [2] Staff management page**
- `/[locale]/admin/staff` (super_admin only)
- Add / deactivate staff via Supabase admin RPC
- AC: deactivated staff cannot access admin

**T-040 [2] Moderator chat reports queue**
- `/[locale]/admin/reports/chat`
- Confirm / dismiss flow
- AC: confirmed report → strike added; dismissed → message unhidden

## EPIC 8 — Assistant

**T-041 [3] Assistant route handler with Claude haiku streaming**
- `app/api/assistant/route.ts`
- SSE response
- Three tools (`lookup_listing`, `current_pricing_band`, `store_status`)
- Rate limit 60/hr auth, 10/hr anon
- AC: stream renders token-by-token in client; tools invoked when contextually appropriate

**T-042 [2] Assistant client component**
- Floating "?" affordance globally
- Side panel with input + streamed reply
- Conversation in-memory only (V1)
- AC: open/close/send/receive happy path

## EPIC 9 — Storage + image processing

**T-043 [2] Signed-URL upload route + ImageDropzone**
- See `09_…`
- AC: 10 MB JPG uploads succeed; 11 MB rejected

**T-044 [2] Post-process job (EXIF strip + WebP + pHash + blurhash)**
- Triggered after upload via separate `/api/upload/process`
- AC: image_metadata row inserted; raw upload deleted

## EPIC 10 — Compliance + polish

**T-045 [2] Account deletion (soft + hard)**
- `/[locale]/profile/delete` typed-confirmation
- Server action sets `deleted_at`, anonymizes
- pg_cron job hard-deletes after 30 days
- AC: typed `DELETE` proceeds; other text doesn't

**T-046 [2] GDPR data export**
- `/[locale]/profile/data-export` triggers JSON archive
- 1 export/24h rate limit
- AC: archive contains profile + listings + own messages + appointments + waitlist + filed reports

**T-047 [1] Cookie consent + privacy + terms**
- `/[locale]/legal/*` pages
- Cookie banner: strictly necessary by default
- AC: lighthouse scores 100 a11y

**T-048 [2] Sentry + Vercel Analytics wiring**
- Source map upload in CI
- AC: forced error captured in Sentry; web vitals appear in analytics

**T-049 [2] Resend email templates (React Email)**
- Listing approved/rejected
- Waitlist welcome
- Account warning (≥2 strikes)
- AC: previewed in `react-email dev`

**T-050 [3] Playwright E2E**
- 3 user journeys: listing happy path, appointment happy path, waitlist happy path
- AC: all three pass in CI on every PR

**T-051 [2] Load test with k6**
- 50 RPS sustained, 200 RPS spike
- AC: p95 latency < 1.2s; zero 5xx

**T-052 [1] Domain + production deploy**
- `mobileunit.gr` + Vercel
- Supabase prod migrations
- AC: smoke test passes on prod URL

## Sequencing within epics

Within each epic, tickets are listed in dependency order. Across epics, EPIC 1 must finish first. EPIC 2 must finish before 3-8. EPIC 9 must finish before 3 (sell wizard).

## Total estimate

50 tickets × ~2.4 avg = ~120 points ≈ 3.5 dev-weeks with 4 devs in parallel, matching the V1 plan.
