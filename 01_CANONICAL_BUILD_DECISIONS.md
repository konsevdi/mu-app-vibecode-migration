# 01 — Canonical Build Decisions

Ten decisions that the rest of the bundle builds on. These are the answers to ambiguities in the original Expo source. Treat them as locked unless the product owner explicitly overrides one — every other doc assumes them.

---

## D1 — Reservation / order lifecycle (V1 = NO)

**Decision:** V1 ships with **chat + pickup only**. No reservation, escrow, payment, or order state machine.

**Why:** The original source has zero reservation code. There's no `Order`, `Reservation`, or `Transaction` table in `prisma/schema.prisma`. Buyer/seller communication is plain `Message` rows. Building a lifecycle now would block launch and require payment provider integration that isn't scoped.

**What this means in practice:**
- Buyer hits "Contact seller" → opens chat (or mailto fallback).
- They arrange pickup over chat. Money changes hands offline.
- Listing stays `status="approved", isActive=true` until the seller manually marks it sold (post-V1) or deletes it.

**V2 backlog:** introduce `reservations(id, listing_id, buyer_id, seller_id, status: pending|accepted|rejected|completed|cancelled, hold_expires_at, created_at)`. Listings get a soft-lock when reserved.

---

## D2 — Inspector / staff screens (V1 = NO)

**Decision:** No staff-facing UI in V1. Admin uses the **Supabase Dashboard SQL editor** for everything, plus a thin `/admin` route gated by `role=admin`.

**Why:** The source has `Store`, `Staff`, `Inspection`, `Token` Prisma models but **no UI** for any of them. Building those screens now would 2-3× the scope. The partner (iRepair) inspects devices on-site and records grades manually; the marketplace just renders the grade.

**Admin route scope (V1):**
- `/admin` — overview cards (pending listings, fraud holds, waitlist count).
- `/admin/listings` — table of `status='pending'` listings with Approve / Reject actions (PATCH `/api/listings/:id/status`).
- `/admin/fraud` — table of `FraudHold` rows with Release action.
- `/admin/waitlist` — table + CSV export.

That's it. Grading is captured by a simple form post-launch.

---

## D3 — Images: JSONB column vs separate table

**Decision:** **Separate `listing_images` table.**

```sql
create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,                -- public Supabase Storage URL
  storage_path text not null,       -- bucket path for cleanup on delete
  sort_order int not null default 0,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index on listing_images(listing_id, sort_order);
```

**Why over JSONB:**
- Original Prisma stores `images String` (a JSON-stringified array) — ugly to query, no FK integrity, can't enforce per-image rules.
- We need to delete blobs from Storage when a listing is deleted (`on delete cascade` + a Postgres trigger or app-side cleanup).
- Sort order matters (the first image is the cover) and is much cleaner as a column.

The `images` field on the listing schema in `shared/contracts.ts` stays `string[]` for the API — derive it on read via a join + ordered aggregation.

---

## D4 — Rule-based vs LLM assistant

**Decision:** **Hybrid.** Keep the rule-based keyword router from `backend/src/routes/assistant.ts` as the fast path; fall through to **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) via `@anthropic-ai/sdk` with prompt caching for anything the keyword router doesn't match.

**Why:** The original source is pure-rule-based and works well for the top 6 intents (pricing, safety, iRepair, recommendations, selling, conditions). But anything off-script gets a generic "Πες μου περισσοτερα..." reply which is bad UX. Claude Haiku is cheap (~$1/M input, $5/M output) and prompt-caching the system prompt + knowledge base brings per-message cost to fractions of a cent.

**Caps:**
- Anonymous users: **0 LLM calls** — keyword router only.
- Signed-in users: **20 LLM calls per day** (Redis/Upstash counter, key = `user:${id}:assistant:${YYYY-MM-DD}`).
- Hard ceiling: 2000 tokens of output per response.

**System prompt:** see `12_AI_ASSISTANT.md` — built from the existing `KNOWLEDGE_BASE` so Greek answers stay tonality-correct (uppercase = no accents, lowercase = with accents).

---

## D5 — Admin UI scope

**Decision:** see D2. Scope is locked at four routes: `/admin`, `/admin/listings`, `/admin/fraud`, `/admin/waitlist`. Behind `role IN ('admin', 'staff')` Supabase RLS check. No GraphQL, no fancy dashboard charts — server components + a data table.

---

## D6 — City: hardcoded vs `cities` table

**Decision:** **`cities` table** with an `is_eligible` boolean.

```sql
create table cities (
  slug text primary key,                   -- 'rhodes', 'athens', 'london', etc.
  name_en text not null,
  name_el text not null,
  country_code text not null,              -- ISO-3166 alpha-2 ('GR', 'GB', ...)
  country_name_en text not null,
  country_name_el text not null,
  lat double precision,
  lng double precision,
  is_eligible boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
```

**Why:** The mobile code already encodes 15 cities (9 Greek + 6 European) in `mobile/src/lib/onboardingStore.ts`. Hardcoding now means every "add a city" requires a code deploy + app store review. A table lets ops flip `is_eligible=true` and the gate opens without a release. The current shared contract has `citySchema = z.enum(["rhodes"])` — drop the enum, accept any slug, validate it exists in `cities`.

**Migration plan:** seed the 15 cities verbatim from the Expo source (see `seed-data.json`).

---

## D7 — Better Auth → Supabase Auth

**Decision:** Replace Better Auth entirely with **Supabase Auth** (`@supabase/ssr` for Next.js App Router).

**Why:** Better Auth is great for Bun/Hono but the rewrite is Next.js + Vercel + Supabase. Using Supabase Auth removes a service to operate, gives row-level security out of the box, and ships email/password + Google OAuth without custom plumbing. The `Session`, `Account`, `Verification` Prisma models are deleted — Supabase Auth owns `auth.users` and `auth.sessions`.

**What carries over:**
- `email + password` flow (V1).
- Google OAuth (V2 — env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are commented in `backend/src/auth.ts`).
- The `User` table becomes `public.profiles` keyed by `auth.users.id` (UUID).

See `19_SUPABASE_SETUP.md` for the SQL and RLS policies.

---

## D8 — Conversation ID: deterministic string vs `conversations` table

**Decision:** Keep the **deterministic string** for V1. `getConversationId(userA, userB) = [userA, userB].sort().join("_")`. Optionally add a `conversations` SQL view for query convenience.

**Why:** `backend/src/routes/messages.ts` already implements this exact pattern. It works, it's simple, no migration needed. Adding a `conversations` table just to satisfy normalization adds writes on every first message. The view gives us the convenience without the writes:

```sql
create view conversations as
select
  conversation_id,
  min(created_at) as started_at,
  max(created_at) as last_message_at,
  count(*) as message_count,
  -- participants derived from any message in the conversation
  (array_agg(distinct sender_id) || array_agg(distinct recipient_id)) as participant_ids
from messages
group by conversation_id;
```

V2: promote to a real table once we add read receipts, typing indicators, or per-conversation muting.

---

## D9 — Inspection tokens (V1 = NO)

**Decision:** **Defer to V2.** The `Token` Prisma model and any "scan to verify" QR flow stay out of V1.

**Why:** The source has `Token` and `Inspection` models but no UI uses them. The current grade display on `mobile/src/app/listing/[id].tsx` just reads `listing.grade` and `listing.checklistComplete` directly off the listing row. That's enough for V1. Tokens become useful when the inspector partner needs a tamper-evident link between a physical inspection and a marketplace listing — a fraud-prevention feature we don't need until volume grows.

**V1 keeps:** `grade` (A/B/C/D enum) + `checklist_complete` (bool) + `inspection_date` directly on the listing.

---

## D10 — Pickup-only private listings (V1 = LOCKED)

**Decision:** Private listings are **PICKUP ONLY** in V1. No shipping. No address collection beyond a free-text `location` field.

**Why:** The source explicitly comments `// V1: Private listings are PICKUP ONLY. Shipping disabled until V2.` in `shared/contracts.ts` line 125. Honor it. Shipping introduces address validation, courier integration, tracking, returns — out of scope.

**UI:** every listing card and detail page shows a `ΠΑΡΑΛΑΒΗ ΜΟΝΟ` / `PICKUP ONLY` chip. Already in source.

---

## D11 — ORM choice (bonus decision)

**Decision:** **Drop Prisma.** Use `@supabase/supabase-js` for queries + raw SQL migration files in `supabase/migrations/`. Use `zod` for runtime validation of the rows that come back.

**Why:** Prisma + Postgres + Supabase is doable but doubles your migration story (Prisma migrations AND Supabase migrations) and the Prisma client doesn't play well with Edge runtime. Supabase JS is type-generated from your schema (`supabase gen types typescript`) and runs everywhere. We lose the Prisma DX for complex relations but gain Edge compatibility, RLS, and one less tool.

If the team strongly prefers an ORM: use **Drizzle** with `drizzle-orm/postgres-js` — also Edge-compatible. Do NOT use Prisma.
