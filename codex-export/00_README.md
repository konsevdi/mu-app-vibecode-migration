# Mobile Unit → Codex Production Export

Concrete handoff bundle for rebuilding **Mobile Unit** as a Next.js 15 + Supabase web app in Codex.

**Source app**: Expo SDK 54 mobile (`/mobile`) + Hono/Bun/Prisma/SQLite backend (`/backend`).
**Shared contracts**: `/shared/contracts.ts` (Zod schemas, mirrored to mobile).

Every fact in this bundle is grounded in actual source. Inferred or absent items are tagged **PARTIAL**, **MOCKED**, or **MISSING** — never invented.

## Files

| # | File | Purpose |
|---|---|---|
| 01 | `01_SOURCE_CODE_INVENTORY.md` | Every source file with size, role, and Expo/native dependencies to strip |
| 02 | `02_PRISMA_SCHEMA_EXPORT.md` | Verbatim Prisma schema with model-by-model rebuild notes |
| 03 | `03_BACKEND_ROUTES_EXPORT.md` | Every Hono route, mapped 1:1 to Next.js Route Handler equivalents |
| 04 | `04_FRAUD_AND_MODERATION_EXPORT.md` | Exact fraud thresholds, regex patterns, strike decay, hold logic |
| 05 | `05_CHAT_AND_MESSAGES_EXPORT.md` | Conversation-ID derivation, URL/off-platform regex, image-spam detector |
| 06 | `06_APPOINTMENTS_AND_INSPECTIONS_EXPORT.md` | Booking flow, token rotation (60s/72h), inspection schema |
| 07 | `07_WAITLIST_AND_REFERRALS_EXPORT.md` | 8-char code generator, +3 score per referral, masked email lookup |
| 08 | `08_AUTH_AND_SESSION_EXPORT.md` | Better Auth → Supabase Auth mapping; session/account/verification tables |
| 09 | `09_IMAGE_UPLOAD_AND_STORAGE_EXPORT.md` | Local disk → Supabase Storage; 10 MB cap, MIME allowlist, 3–10 photos |
| 10 | `10_I18N_COPY_EXPORT.md` | Greek UPPERCASE no-accent rule, key inventory, next-intl mapping |
| 11 | `11_SEED_DATA_EXPORT.md` + `seed-data.json` | 15 cities, 1 store, grade + moderation config |
| 12 | `12_UI_REFERENCE_PACK.md` | Screen list + key visual primitives observed in source |
| 13 | `13_COMPONENT_INVENTORY.md` | Mobile components → shadcn/ui replacements |
| 14 | `14_SUPABASE_SCHEMA.md` | Postgres tables, enums, RLS posture |
| 15 | `15_SQL_MIGRATIONS.md` + `sql/001-006_*.sql` | 6-file migration set (schema, RLS, storage, indexes, seed, admin) |
| 16 | `16_API_CONTRACTS.md` | Zod schemas + request/response pairs ready to drop into `shared/contracts.ts` |
| 17 | `17_ADMIN_AND_STAFF_SPEC.md` | Roles, staff table, audit log, fraud queue |
| 18 | `18_BUSINESS_LOGIC_AND_EDGE_CASES.md` | Listing approval, pricing bands, grade multipliers, edge paths |
| 19 | `19_CANONICAL_BUILD_DECISIONS.md` | The non-negotiable tech and product choices for the rebuild |
| 20 | `20_AGENTS.md` | Codex agent setup (root + per-area) |
| 21 | `21_PLANS.md` | Ordered work plan, week-by-week |
| 22 | `22_IMPLEMENTATION_TICKETS.md` | Atomic tickets, each ≤1 day |
| 23 | `23_TEST_PLAN.md` | Unit/integration/E2E coverage targets |
| 24 | `24_SECURITY_REVIEW.md` | RLS gaps, secrets, abuse vectors observed in current code |
| 25 | `25_ENV_EXAMPLE.md` + `.env.example` | All required env vars with notes |
| 26 | `26_FINAL_CODEX_STARTER_PROMPT.md` | Single prompt to paste into Codex to kick off the build |

## Conventions used in this bundle

- **VERBATIM** — pasted directly from source, line-numbered when useful
- **PARTIAL** — exists in source but unfinished
- **MOCKED** — placeholder/hardcoded value masquerading as real data
- **MISSING** — referenced or implied but not implemented
- **DECIDE** — Codex must pick a path before coding
- File paths use `mobile/src/…`, `backend/src/…`, `shared/…` relative to repo root

## What this bundle is NOT

- Strategy. Motivational copy. Generic "best practices."
- Speculative architecture for features that don't exist in the source.
- A rewrite spec — it preserves Mobile Unit's existing business rules exactly.
