# 11 — Seed Data Export

All seed data is in `seed-data.json` alongside this file. The JSON drives both Postgres seeding (`migrations/005_seed_demo_data.sql` + `006_seed_admin_user.sql`) and Storybook fixtures.

## Source-of-truth files

| Data | Source |
|---|---|
| Cities | `mobile/src/lib/onboardingStore.ts:125-144` (9 GR + 6 EU) |
| Stores | `mobile/src/lib/stores.ts:1-23` (2 stores) |
| Categories | `shared/contracts.ts:9` `["phone","tablet","laptop","accessory"]` |
| Conditions | `shared/contracts.ts:18` `["new","like_new","good","fair","parts"]` |
| Grades | `shared/contracts.ts:37-42` (A/B/C/D + multipliers) |
| Verification label | `shared/contracts.ts:47` `"iRepair"` |
| Pandas URL | `shared/contracts.ts:46` `"https://pandas.io/pricing"` |
| ModerationConfig | `backend/prisma/seed.ts` defaults (PRIVATE=2, STORE=5, COOLDOWN=7, LIMITED=7, DECAY=90, HOLD=80) |

## Cities table

```sql
create table public.cities (
  name        text primary key,        -- canonical English name
  name_el     text not null,
  country     text not null,
  country_el  text not null,
  is_eligible boolean not null default false,
  display_order integer not null
);
```

Eligibility flag drives the "Coming soon" badge in city gate UI. **Only Rhodes** is `is_eligible=true` for V1.

## Stores table

Source has 2 entries (iRepair Rhodes primary + iRepair Spot satellite). Each with full Greek address, lat/lng, external URL. Schema:

```sql
create table public.stores (
  id              text primary key,
  name            text not null,
  subtitle        text,
  address         text not null,
  city            text not null references public.cities(name),
  store_page_url  text,
  lat             numeric(10,6) not null,
  lng             numeric(10,6) not null,
  is_primary      boolean not null default false,
  hours_json      jsonb not null default '{}'::jsonb,  -- MISSING in source — fill default
  services        text[] not null default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
```

Default `hours_json` (use for both stores until store provides):
```json
{
  "monday":    {"open": "09:30", "close": "21:00"},
  "tuesday":   {"open": "09:30", "close": "21:00"},
  "wednesday": {"open": "09:30", "close": "21:00"},
  "thursday":  {"open": "09:30", "close": "21:00"},
  "friday":    {"open": "09:30", "close": "21:00"},
  "saturday":  {"open": "10:00", "close": "20:00"},
  "sunday":    null
}
```

Default `services`: `['diagnostic','repair','grading','sales']` — matches i18n keys.

## Grade config

```sql
create table public.grade_config (
  id            uuid primary key default gen_random_uuid(),
  store_id      text references public.stores(id),  -- NULL = global default
  grade_a_mult  numeric(4,3) not null default 1.000,
  grade_b_mult  numeric(4,3) not null default 0.930,
  grade_c_mult  numeric(4,3) not null default 0.850,
  grade_d_mult  numeric(4,3) not null default 0.600,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id),
  unique (store_id)  -- single row per store, NULL row = global
);
```

Seed one global row + one per-store override row (initially identical to global). Per-store overrides let iRepair tweak grades if their pricing drifts.

## Moderation config

```sql
create table public.moderation_config (
  id                        uuid primary key default gen_random_uuid(),
  private_report_threshold  integer not null default 2,
  store_report_threshold    integer not null default 5,
  cooldown_days             integer not null default 7,
  limited_state_days        integer not null default 7,
  strike_decay_days         integer not null default 90,
  fraud_hold_threshold      integer not null default 80,
  updated_at                timestamptz not null default now(),
  updated_by                uuid references auth.users(id)
);
-- exactly one row
insert into public.moderation_config (id) values (gen_random_uuid())
on conflict do nothing;
```

## Demo listings

15 hand-curated listings for the iRepair-Rhodes seller (a single staff "showroom" account). Distribution:

- 10 `phone` (mix of conditions/grades, prices €120-€780)
- 3 `tablet` (€220-€520)
- 2 `accessory` (€20-€85)

All `is_store=true`, `is_demo=true`, `is_active=true`, `status='approved'`, valid `grade`, `checklist_complete=true`, `images` array with 4-6 storage paths each. **Demo images** stored under `listing-images/demo/{listing-id}/{idx}.webp` and seeded via a separate node script that uploads sample assets from `seeds/demo-images/` to Supabase Storage.

`title`, `description`, `brand`, `model` are realistic device names — see `seed-data.json` for the full list.

## Demo users

| Email | Role | Purpose |
|---|---|---|
| `super.admin@mobileunit.gr` | super_admin | platform owner |
| `admin@mobileunit.gr` | admin | second admin |
| `store.manager@irepair.gr` | store_manager (irepair-rhodes) | store ops |
| `inspector@irepair.gr` | inspector (irepair-rhodes) | inspections + grading |
| `staff@irepair.gr` | front_office (irepair-rhodes) | scanning tokens |
| `moderator@mobileunit.gr` | moderator | chat moderation only |
| `seller@mobileunit.gr` | regular user | seeds 5 demo non-store listings |
| `buyer@mobileunit.gr` | regular user | seeds 3 demo messages / appointment |
| `irepair.demo@mobileunit.gr` | regular user (is_store=true on listings) | owner of 15 store listings |

Passwords for all demo users: `MobileUnit2026!` — **change before production**. Set via Supabase Auth admin API in `006_seed_admin_user.sql`.

## Demo waitlist

3 signups (Athens, Thessaloniki, London) so the admin waitlist page is never empty. Includes one referral chain: `signup #1` referred `signup #2`.

## Categories / conditions / interest types

These are **PostgreSQL enums**, not seed rows. Defined in `001_initial_schema.sql`:

```sql
create type listing_category   as enum ('phone','tablet','laptop','accessory');
create type listing_condition  as enum ('new','like_new','good','fair','parts');
create type listing_status     as enum ('pending','approved','sold','removed','draft');
create type grade_letter       as enum ('A','B','C','D');
create type appointment_status as enum ('pending','approved','checked_in','completed','cancelled');
create type appointment_timeslot as enum ('morning','afternoon');
create type token_type         as enum ('appointment','reservation');
create type interest_type      as enum ('buyer','seller','both');
create type ui_language        as enum ('el','en');
create type staff_role         as enum ('super_admin','admin','store_manager','inspector','front_office','moderator');
create type strike_reason      as enum ('chat_url','chat_offplatform','image_spam','listing_reported','pricing_anomaly','partner_complaint');
```

## Pandas pricing link

Hard-coded constant `PANDAS_PRICING_URL = "https://pandas.io/pricing"` (`shared/contracts.ts:46`). Keep as env-var override: `NEXT_PUBLIC_PANDAS_PRICING_URL` defaults to that value.

## TOURIST_MODE flag

`mobile/src/lib/onboardingStore.ts:159`: `TOURIST_MODE_ENABLED = false`. Keep `false` in V1. When `true`, eligibility relaxes to "any GR city if user reports being in Rhodes." **DECIDE**: per product, V2 only.

## seed-data.json structure

See `seed-data.json`. Top-level keys:

```
{
  "cities": [...],
  "stores": [...],
  "gradeConfig": { "global": {...}, "byStore": [{...}] },
  "moderationConfig": {...},
  "demoUsers": [...],
  "demoListings": [...],
  "demoWaitlistSignups": [...]
}
```

Migration `005_seed_demo_data.sql` reads this JSON via `psql -v` + `\copy from program`, or — simpler — a Node script `scripts/seed.ts` that loops over the JSON and calls Supabase REST/SQL. Provide both paths; `scripts/seed.ts` is the canonical entrypoint for `npm run db:seed`.
