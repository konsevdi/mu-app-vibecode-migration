# 21 — Plans

Two plans: a 4-week MVP plan to a Rhodes V1 launch, and a 12-week extended roadmap.

## Plan A — V1 launch (4 weeks, ~120 dev hours)

### Week 1 — Foundation

- Init Next.js 15 app with App Router, TypeScript strict, Tailwind, shadcn/ui base components
- Provision Supabase project (dev + staging + prod)
- Write migrations 001-004 (schema, RLS, storage, triggers/cron); apply to dev
- Set up next-intl with `el` (default) + `en` and the lint rule for Greek UPPERCASE
- Wire Supabase Auth (email/password) — server/browser/middleware clients
- Stand up Storybook 8 + Chromatic
- Configure GitHub Actions: lint, typecheck, vitest, supabase db lint, chromatic
- Deploy first scaffold to Vercel preview
- Decision deadline: items 1-10 from `19_…`

**Deliverable**: deployable empty shell with auth login + middleware session refresh.

### Week 2 — Core CRUD

- Listings: schema → contracts → server actions (create/update/delete/report) → browse RSC with searchParams filtering → listing detail RSC
- ImageDropzone + signed-URL upload + post-process job
- Messages: schema → conversation derivation → moderation pipeline (lift verbatim regex from source) → server actions
- Realtime channel for conversation
- Waitlist: schema → public route handler + middleware capture for `?ref=`
- Run migration 005 (seed cities/stores/configs)
- Run `scripts/seed.ts` (demo users + listings)

**Deliverable**: end-to-end browse + sell + chat working in preview.

### Week 3 — Appointments + admin + assistant

- Appointments schema + state machine + booking server action + slot conflict check
- Tokens: pg_cron rotation job + Realtime channel + admin redemption flow
- Inspections form + trust event trigger
- Admin queue + listing detail with actions + audit log writes
- Moderator chat reports queue
- Super_admin settings page (moderation_config, grade_config, stores)
- Claude assistant integration (streaming via SSE, three tools)
- Resend integration + email templates: listing approved/rejected, waitlist welcome, account warning

**Deliverable**: full workflow including staff side.

### Week 4 — Hardening, testing, launch

- Account deletion (soft+hard) + GDPR data export
- Pen-test of RLS policies (Testcontainers integration tests)
- E2E Playwright: listing happy path, appointment happy path, waitlist happy path
- Load test (k6, 50 RPS sustained)
- Lighthouse pass, accessibility audit
- Privacy policy + Terms + Cookie consent banner
- Sentry wired
- Production env vars + Supabase production migration
- Smoke test in production with internal team
- Soft launch (Mobile Unit team + iRepair staff invited)
- Public launch announcement

**Deliverable**: V1 in production at `mobileunit.gr`.

## Plan B — Extended roadmap (12 weeks)

### Weeks 1-4: Plan A (V1 launch)

### Week 5-6 — V1.1: OAuth + MFA + assistant memory + dark mode

- Google OAuth via Supabase Auth
- Apple Sign In (requires Apple Developer account)
- Staff MFA (enforce `aal2` for `staff_role IN ('admin','super_admin','store_manager')`)
- Assistant threads persisted to Postgres
- Dark mode (Tailwind dark variant, shadcn dark tokens)

### Week 7 — V1.2: Profanity filter + Greek pattern coverage

- Add Greek transliterations to chat moderation regex
- Profanity filter for listings (el+en)
- NSFW image classifier (Cloudflare AI or Replicate) on listing images

### Week 8-9 — V1.3: Notifications + reputation

- Push notifications via Web Push (PWA)
- In-app notification center (`/notifications`)
- User reputation page (`/u/[handle]`) with listing count, trust events, joined date
- Seller report cards: avg response time, % of listings sold, returns/disputes

### Week 10 — V1.4: Multi-city pilot

- Athens added as second eligible city
- Geofencing: listings in Athens cannot be booked at Rhodes stores
- Add second partner store entry (or "partner-less" listing flow for cities without iRepair presence)
- Decision: Athens uses iRepair Athens or independent partner

### Week 11-12 — V2 scoping + Stripe Connect spike

- Stripe Connect spike for in-app payments (diagnostic fee + commission)
- Escrow flow design (charge buyer at checkout, release to seller after handoff)
- KYC requirements via Stripe Identity for sellers above €1000/month volume
- VAT handling (used-goods VAT exempt in EU — VAT margin scheme for stores)
- Write V2 spec for product review

## Sequencing principles

1. **Schema before code**. Run migrations to dev before touching React.
2. **Auth before features**. Sign-up/sign-in must work before listing create.
3. **RLS before service-role**. Build with anon/authenticated until forced to use service-role.
4. **Real data before designs**. Seed early so every screen renders with real records, not lorem ipsum.
5. **Server actions before route handlers**. Only escalate to a route handler when the action needs a stable URL or streaming response.
6. **End-to-end thin slice before depth**. Get listing create→approve→browse→message→report→hide working end-to-end before polishing any one slice.

## Parallelization

Tracks that can move in parallel after Week 1:

- A: Listings + browse + sell (1 dev)
- B: Messages + Realtime (1 dev)
- C: Auth + profile + admin scaffold (1 dev)
- D: Storybook + design tokens + i18n lint + CI (1 dev)

Week 3-4 converge for appointments and admin queue.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| RLS misconfiguration leaks PII | Medium | Critical | Integration tests against real Postgres in CI; Supabase log review weekly |
| pg_cron not available on Supabase plan | Low | High | Verify on day 1; fall back to Vercel Cron if unavailable |
| Greek regex misses common transliterations | High | Medium | Manual QA pass by Greek speaker; iterate in V1.2 |
| Assistant cost runaway | Medium | Medium | max_tokens cap + Redis daily budget tracking + alert |
| Vercel function timeout on large image post-process | Medium | Low | Offload post-process to a Supabase Edge Function; or trigger queue worker |
| iRepair backs out of partner agreement | Low | Critical | white-label `VERIFICATION_LABEL` env var already supports swap |
| Supabase price scaling | Low | Medium | Monitor monthly; consider self-host Postgres if MAU > 50k |

## Definition of done

A feature is done when:

- Server action / route handler returns expected shape under zod validation
- RLS policy verified (positive + negative tests in Testcontainers)
- UI renders in Storybook with empty / loading / error / populated states
- i18n keys present in both `el` and `en`; CI lint passes
- Audit log row written if it's an admin or staff mutation
- Telemetry event logged
- E2E happy path passes in CI
- Lighthouse score ≥ 90 on the route
