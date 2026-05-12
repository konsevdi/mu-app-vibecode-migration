# 14 — Supabase Schema

Complete target Postgres schema. Driven by Prisma source models in `backend/prisma/schema.prisma` minus auth tables (Supabase Auth owns those). See `15_SQL_MIGRATIONS.md` for the actual `.sql` files.

## Schemas

- `auth` — Supabase-managed (`auth.users`, etc.). Read-only from app code.
- `public` — application tables. RLS enabled on every table.
- `storage` — Supabase-managed. Policies in `003_storage_policies.sql`.

## Enums

```sql
create type listing_category     as enum ('phone','tablet','laptop','accessory');
create type listing_condition    as enum ('new','like_new','good','fair','parts');
create type listing_status       as enum ('pending','approved','sold','removed','draft');
create type grade_letter         as enum ('A','B','C','D');
create type appointment_status   as enum ('pending','approved','checked_in','completed','cancelled');
create type appointment_timeslot as enum ('morning','afternoon');
create type token_type           as enum ('appointment','reservation');
create type interest_type        as enum ('buyer','seller','both');
create type ui_language          as enum ('el','en');
create type staff_role           as enum ('super_admin','admin','store_manager','inspector','front_office','moderator');
create type strike_reason        as enum ('chat_url','chat_offplatform','image_spam','listing_reported','pricing_anomaly','partner_complaint');
create type fraud_hold_entity    as enum ('listing','user','token');
create type audit_actor_type     as enum ('user','staff','system','admin');
```

## Tables

### `profiles`

1:1 with `auth.users`. Created by `handle_new_user()` trigger on `auth.users` insert.

```sql
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,            -- mirrored from auth.users for joins, kept in sync via trigger
  handle                text unique,
  name                  text,
  image                 text,                     -- storage path in avatars bucket
  language_pref         ui_language not null default 'el',
  onboarding_completed  boolean not null default false,
  selected_city         text references public.cities(name),
  selected_country      text,
  is_eligible_city      boolean not null default false,
  trust_event_count     integer not null default 0,
  fraud_score           integer not null default 0 check (fraud_score between 0 and 100),
  is_held               boolean not null default false,
  restricted_mode       boolean not null default false,
  restricted_until      timestamptz,
  tokens_disabled       boolean not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on public.profiles(handle);
create index on public.profiles(selected_city);
```

### `cities`, `stores`

See `11_SEED_DATA_EXPORT.md` for the full schemas and seed.

### `staff`

```sql
create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  store_id    text references public.stores(id),    -- null for super_admin/admin/moderator
  role        staff_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, store_id)
);
create index on public.staff(user_id);
create index on public.staff(store_id);
```

### `listings`

```sql
create table public.listings (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,            -- generated from title + short id
  seller_id           uuid not null references auth.users(id) on delete cascade,
  store_id            text references public.stores(id),
  title               text not null check (char_length(title) between 3 and 100),
  description         text not null check (char_length(description) between 10 and 1500),
  category            listing_category not null,
  condition           listing_condition not null,
  brand               text,
  model               text,
  price               numeric(10,2) not null check (price >= 0),
  city                text not null references public.cities(name),
  images              jsonb not null default '[]'::jsonb check (jsonb_array_length(images) between 3 and 10),
  is_store            boolean not null default false,
  is_demo             boolean not null default false,
  is_active           boolean not null default true,
  status              listing_status not null default 'pending',
  rejection_reason    text,
  grade               grade_letter,
  checklist_complete  boolean not null default false,
  inspection_date     timestamptz,
  fraud_score         integer not null default 0 check (fraud_score between 0 and 100),
  is_held             boolean not null default false,
  report_count_24h    integer not null default 0,
  last_report_at      timestamptz,
  view_count          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.listings(seller_id);
create index on public.listings(store_id);
create index on public.listings(city, is_active, status);
create index on public.listings(category, condition);
create index on public.listings(created_at desc);
create index on public.listings(grade) where checklist_complete = true;
create index on public.listings(slug);
```

### `messages`, `chat_reports`, `appointments`, `tokens`, `inspections`, `waitlist_signups`

Schemas defined in `05_…`, `06_…`, `07_…` export docs. Consolidated here for canonicity in `001_initial_schema.sql`.

### `user_strikes`

```sql
create table public.user_strikes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  reason       strike_reason not null,
  detail       text,
  source_entity_type text,
  source_entity_id   text,
  expires_at   timestamptz not null,           -- created_at + 90 days
  created_at   timestamptz not null default now()
);
create index on public.user_strikes(user_id, expires_at);
```

### `fraud_holds`

```sql
create table public.fraud_holds (
  id              uuid primary key default gen_random_uuid(),
  entity_type     fraud_hold_entity not null,
  entity_id       text not null,
  fraud_score     integer not null check (fraud_score between 0 and 100),
  reason          text not null,
  resolved        boolean not null default false,
  resolved_by     uuid references auth.users(id),
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);
create index on public.fraud_holds(entity_type, entity_id);
create index on public.fraud_holds(resolved) where resolved = false;
```

### `audit_log`

```sql
create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_type   audit_actor_type not null,
  actor_id     uuid,
  action       text not null,
  entity_type  text not null,
  entity_id    text not null,
  diff_json    jsonb,
  created_at   timestamptz not null default now()
);
create index on public.audit_log(entity_type, entity_id, created_at desc);
create index on public.audit_log(actor_id, created_at desc);
```

### `auto_action_log`

```sql
create table public.auto_action_log (
  id           uuid primary key default gen_random_uuid(),
  rule_name    text not null,             -- 'fraud_hold','auto_hide_reports','strike_decay', etc.
  entity_type  text not null,
  entity_id    text not null,
  payload_json jsonb,
  created_at   timestamptz not null default now()
);
create index on public.auto_action_log(rule_name, created_at desc);
```

### `image_metadata`

Defined in `09_IMAGE_UPLOAD_AND_STORAGE_EXPORT.md`.

### `trust_events`

Defined in `06_APPOINTMENTS_AND_INSPECTIONS_EXPORT.md`.

## Views

### `listing_card_view`

Single denormalized read path for listing grids. RLS inherits from `listings`.

```sql
create view public.listing_card_view as
select
  l.id, l.slug, l.title, l.price, l.condition, l.grade, l.checklist_complete,
  l.is_store, l.city, l.created_at,
  (l.images -> 0) as primary_image,
  p.handle as seller_handle,
  p.trust_event_count as seller_trust_count,
  exists (select 1 from public.staff s where s.user_id = l.seller_id and s.is_active) as seller_is_staff
from public.listings l
join public.profiles p on p.id = l.seller_id
where l.is_active and l.status = 'approved' and l.is_held = false;
```

## Materialized views

### `mv_active_listings_per_city`

Drives the home page city stats and admin dashboard. Refreshed by `pg_cron` every 5 min.

```sql
create materialized view public.mv_active_listings_per_city as
select city, count(*) as active_count, count(*) filter (where checklist_complete) as verified_count
from public.listings
where is_active and status = 'approved' and is_held = false
group by city;

create unique index on public.mv_active_listings_per_city(city);
```

```sql
select cron.schedule('refresh_listings_per_city', '*/5 * * * *',
  $$ refresh materialized view concurrently public.mv_active_listings_per_city; $$);
```

## Foreign-key cleanup contracts

| Parent deleted | Child action |
|---|---|
| `auth.users` | profiles, listings, messages, appointments, chat_reports, user_strikes, trust_events all cascade |
| `public.stores` | `set null` on listings.store_id, appointments.store_id; cascade staff |
| `public.listings` | cascade on messages.listing_id (kept), inspections |
| `public.appointments` | cascade on tokens (token unique-per-entity) |

## Triggers (full list — wired in `004_indexes_triggers_functions.sql`)

| Trigger | Purpose |
|---|---|
| `handle_new_user` (on `auth.users` insert) | create profiles row |
| `set_updated_at_*` | maintain `updated_at` on every mutable table |
| `bump_trust_count` (on `trust_events` insert) | profiles.trust_event_count += 1 |
| `notify_message_inserted` (on `messages` insert) | notify Realtime channel; mailer fanout |
| `decrement_listing_views_floor_0` (helper) | safeguard for the views counter |
| `slug_before_insert_listings` | generate slug from title + nano-id when null |
| `enforce_listing_status_transitions` | only allow valid `listing_status` transitions |
| `enforce_appointment_transitions` | the state machine in `06_…` |

## Roles

Use Supabase default roles `anon`, `authenticated`, `service_role`. Avoid creating custom Postgres roles — RLS policies discriminate via `auth.uid()` and an `is_staff()` SQL helper.

```sql
create function public.is_staff(target_role staff_role default null)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid()
      and is_active = true
      and (target_role is null or role = target_role)
  );
$$;
```
