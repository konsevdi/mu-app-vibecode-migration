# Mobile Unit — Codex Handoff Bundle

This bundle is the complete, self-contained spec for rebuilding **Mobile Unit** (Greek/English trusted marketplace for used phones, tablets, laptops, accessories) as a Next.js 15 web app on Supabase + Vercel. It is generated from the actual Expo SDK 54 + Hono/Bun/Prisma/SQLite source. Where source is incomplete, files are marked **PARTIAL** or **PROPOSED**.

> The Vibecode mobile project is being abandoned. Codex must build from this bundle alone. Do not assume access to the original repo.

## How to read this bundle

Read in this order:

1. **01_CANONICAL_BUILD_DECISIONS.md** — the 10 architecture decisions that everything else builds on. Read this first.
2. **02_PRODUCT_OVERVIEW.md** — what the product is, who it serves, why this exists.
3. **03_TECH_STACK.md** — the target Next.js + Supabase stack and the packages to install.
4. **04_DATA_MODEL.md** — Postgres schema (translated from Prisma SQLite).
5. **05_API_ENDPOINTS.md** — every endpoint, request/response Zod schema, status codes.
6. **06–17** — feature-by-feature spec (auth, onboarding, waitlist, listings, chat, fraud, AI assistant, inspection, appointments, stores, i18n, design).
7. **18_NEXT_JS_PROJECT_STRUCTURE.md** — file/folder layout.
8. **19–22** — infrastructure (Supabase setup, CI/CD, third-party integrations, rate-limiting & security).
9. **23_MIGRATIONS_FROM_PRISMA_SQLITE.md** — concrete SQL DDL for Postgres.
10. **24_SEED_DATA.md** + **seed-data.json** — initial cities, stores, grade config.
11. **25_TESTING_STRATEGY.md** — test setup.
12. **26_OPEN_QUESTIONS.md** + **27_PARTIAL_AND_MISSING.md** — items needing product decisions.

## Config placeholders used throughout

Every brand/region-specific value is a placeholder so this bundle is white-label-ready. Resolve in `.env.local` and `lib/config.ts`:

| Placeholder | V1 Value | Where |
|---|---|---|
| `APP_NAME` | `Mobile Unit` | UI titles, emails, meta |
| `APP_DOMAIN` | `mobile-unit.example` | Email links, OG, sitemap |
| `SUPPORT_EMAIL` | `support@mobile-unit.example` | Footer, error pages |
| `ADMIN_EMAIL` | `admin@mobile-unit.example` | Internal alerts |
| `PARTNER_NAME` | `iRepair` | Verification badges, inspector partner |
| `PRIMARY_CITY` | `rhodes` | Default eligible city slug |
| `PRIMARY_COUNTRY` | `Greece` | Default country |
| `CURRENCY` | `EUR` (symbol `€`) | All price formatters |
| `DEFAULT_LOCALE` | `el` | next-intl default |
| `STORAGE_BUCKET_LISTINGS` | `listings` | Supabase Storage bucket |
| `MAP_PROVIDER` | `google` (embed) or `mapbox` | Store cards, listing pickup hints |

## Markers used in this bundle

- **VERBATIM** — copy character-for-character. UI strings, regex patterns, numeric thresholds, prompt text.
- **PARTIAL** — partially implemented in source; spec lists what's done + what to finish.
- **PROPOSED** — not in source; recommended for the rewrite. Skippable for V1 if scope is tight.
- **MISSING** — referenced somewhere in the source but never implemented. Decision required.

## What this bundle does NOT include

- App Store / TestFlight assets — the rebuild is **web-first**. Add mobile (Expo or PWA) post-launch.
- The original RevenueCat wiring — present in mobile package.json but never used. Drop it.
- Vibecode-specific packages (`@vibecodeapp/backend-sdk`, `@vibecodeapp/cloud-studio`, `@vibecodeapp/proxy`) — local to the Vibecode runtime. Replace with standard Next.js / Vercel patterns.
- Better Auth — replaced by Supabase Auth (decision **D7**).
- Prisma — replaced by Supabase JS + raw SQL migrations (decision **D11**).

## Counts (snapshot of the source)

- Backend routers: **8** (`listings`, `messages`, `waitlist`, `assistant`, `appointments`, `users`, `upload`, `auth`)
- Prisma models: **20** (User, Session, Account, Verification, Profile, Listing, Message, ChatReport, UserStrike, FraudHold, Appointment, Store, Staff, Inspection, Token, AuditLog, AutoActionLog, GradeConfig, ModerationConfig, WaitlistSignup)
- Mobile screens: **15+** (onboarding, tabs/index, tabs/browse, tabs/sell, tabs/profile, listing/[id], login, modal, legal, support, stores, book-appointment, waitlist, waitlist-success, demo-browse, token)
- i18n keys: **~210** in `el` and `en` (full set in `16_I18N_AND_COPY.md`)
- Zod schemas: **30+** in `shared/contracts.ts`

## Token in this conversation

The user has explicitly authorized using a GitHub PAT for upload. Do **not** reproduce it inside any file in this bundle.
