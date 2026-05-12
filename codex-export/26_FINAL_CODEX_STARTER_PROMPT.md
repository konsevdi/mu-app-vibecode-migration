# 26 — Final Codex Starter Prompt

The single prompt to hand Codex to begin the rebuild. Self-contained; references this bundle. Paste verbatim into the Codex session.

---

```
You are building Mobile Unit as a production web app.

CONTEXT
- Mobile Unit is a peer-to-peer marketplace for used phones, tablets, laptops, and accessories.
- V1 is launching in Rhodes, Greece, with iRepair as the partner store for diagnostics, grading, and safe meetups.
- I am migrating from an existing Expo SDK 54 + Hono/Bun/Prisma/SQLite + Better Auth stack to Next.js 15 + Supabase + Vercel.

YOUR INPUTS
The repository contains a `codex-export/` folder with 26 markdown documents, six SQL migration files, `seed-data.json`, and a `.env.example`. Read them in this order before writing any code:

1. `00_README.md` — bundle index and conventions
2. `19_CANONICAL_BUILD_DECISIONS.md` — locked stack and open decisions
3. `01_SOURCE_CODE_INVENTORY.md` — what existed in source and what becomes of each file
4. `02_PRISMA_SCHEMA_EXPORT.md` and `14_SUPABASE_SCHEMA.md` — schema target
5. `15_SQL_MIGRATIONS.md` and the six SQL files — apply these to Supabase first
6. `16_API_CONTRACTS.md` — every server action / route handler signature
7. `04_FRAUD_AND_MODERATION_EXPORT.md` — verbatim thresholds, regex, pipeline
8. `05_CHAT_AND_MESSAGES_EXPORT.md`, `06_APPOINTMENTS_AND_INSPECTIONS_EXPORT.md`, `07_WAITLIST_AND_REFERRALS_EXPORT.md`, `08_AUTH_AND_SESSION_EXPORT.md`, `09_IMAGE_UPLOAD_AND_STORAGE_EXPORT.md` — feature-level details
9. `10_I18N_COPY_EXPORT.md` and `11_SEED_DATA_EXPORT.md` — copy and seed
10. `12_UI_REFERENCE_PACK.md` and `13_COMPONENT_INVENTORY.md` — UI structure
11. `17_ADMIN_AND_STAFF_SPEC.md` — admin surface
12. `18_BUSINESS_LOGIC_AND_EDGE_CASES.md` — every rule and edge case
13. `20_AGENTS.md` — Anthropic Claude assistant integration
14. `21_PLANS.md` and `22_IMPLEMENTATION_TICKETS.md` — execution plan
15. `23_TEST_PLAN.md` — test requirements
16. `24_SECURITY_REVIEW.md` — threat model
17. `25_ENV_EXAMPLE.md` — environment variables

NON-NEGOTIABLES
- Stack: Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui, Supabase (Postgres/Auth/Storage/Realtime), next-intl, Anthropic Claude haiku-4-5, Resend, Upstash Redis, Missive (optional), Vercel, GitHub Actions.
- Default locale el (Greek). Greek UPPERCASE strings strip ALL accents. CI lint enforces this — see `10_…`.
- Verified-after-2-trust-events is the trust contract; `isUserVerified(n) = n >= 2`.
- All fraud thresholds, chat moderation regex, referral code generation, image spam detection are listed VERBATIM in the bundle. Port them as-is. Do not rewrite.
- RLS is enabled on every table. Service-role client used only in server-side route handlers with explicit role check.
- The assistant is Claude streaming via SSE. Replace the source's keyword-matching switch entirely; do not preserve fallback behaviour.

WHERE THE SOURCE IS PARTIAL / MOCKED / MISSING
The bundle marks each. Specifically:
- `getActiveStrikes` exists but is never read in source — wire it into `addStrike` post-hook for auto-restriction.
- `trustEventCount` exists but is never incremented — wire trigger on `trust_events` insert.
- `assistant.ts` is keyword-matching only — replace with Claude.
- `appointments.ts` is missing approve/cancel/check-in/redeem endpoints — build them per `06_…`.
- `laptop_*` and `*_parts` PRICE_RANGES are missing — pick values with product before launch.
- Image hashing is client-expected but unimplemented — compute server-side post-upload.
- Greek-specific chat moderation patterns are missing — add in V1.2.
- Account deletion / data export / password reset UI / OAuth / MFA all absent — build per `08_…` and `21_…`.

EXECUTION
Work through `22_IMPLEMENTATION_TICKETS.md` in epic order. EPIC 1 (foundation) before EPIC 2 (auth+i18n) before everything else. Within an epic, follow ticket order — they're dependency-sorted.

PRINCIPLES
- Schema before code. Migrations before features.
- Server-first. Default to RSC; `'use client'` only when needed.
- Zod at every boundary; share schema between client and server in `lib/contracts.ts`.
- Cursor pagination, never offset.
- Audit log every admin action.
- No background queues in V1 — pg_cron for scheduled work; inline for everything else.
- Tests on every PR. CI gates: typecheck, lint, vitest (60% line coverage), supabase db lint, chromatic.

OPEN DECISIONS
`19_…` lists 16 open product decisions. Default behaviours are documented; if a default is acceptable, proceed. If not, ask me before implementing.

DELIVERABLES PER FEATURE
Each ticket is "done" when:
1. Server action / route handler returns the contract-typed shape and passes zod validation
2. RLS verified with positive + negative integration tests
3. Storybook stories cover empty/loading/error/populated states
4. i18n keys exist in `el` and `en` (lint passes)
5. Audit log row written for staff/admin mutations
6. E2E happy path passes in CI
7. Lighthouse ≥ 90 on the route

When you start, confirm by:
1. Listing the 16 open decisions from `19_…` and your default plan for each
2. Producing a Week-1 schedule from `21_…` plan A and the ticket order in `22_…`
3. Asking which Supabase plan you should provision (Pro recommended for pg_cron + edge functions)

Then begin EPIC 1, T-001.
```

---

## Notes for the human handler

After Codex starts:

1. **Provision Supabase** (Pro plan minimum for pg_cron) and provide URL + keys.
2. **Provision Vercel** project linked to the GitHub repo. Connect environment variables per `25_…`.
3. **Buy domain** `mobileunit.gr` (or confirm ownership) and add to Vercel.
4. **Create Anthropic API key** with budget cap (~$50/mo dev, $200/mo prod).
5. **Create Resend account** and verify the sending domain. Add DKIM/SPF/DMARC.
6. **Create Upstash Redis instance** (free tier sufficient for V1).
7. **Set up Sentry project**.
8. **Make Missive decision**: keep the API as-is (silent no-op if unset) or wire `iRepair` Slack/Email as alternative for fraud alerts.
9. **Decide on the 16 open items** in `19_…` or accept defaults.
10. **Schedule penetration test** for day 25 of the plan.

## Validation checklist before handing off

- [ ] All 26 markdown docs exist in `codex-export/`
- [ ] `seed-data.json` exists and is valid JSON
- [ ] `.env.example` exists with all required variables
- [ ] Six SQL migration files exist in `codex-export/sql/`
- [ ] Repo is pushed to `mu-app-vibecode-migration` GitHub repo

Done — hand the starter prompt to Codex and proceed.
