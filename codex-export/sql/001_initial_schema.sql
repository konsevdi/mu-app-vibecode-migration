-- 001_initial_schema.sql
-- Mobile Unit — initial Postgres schema for Supabase.
-- Applied AFTER `auth` schema is provisioned by Supabase.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "pg_cron";

-- ============================================================
-- Enums
-- ============================================================

create type listing_category     as enum ('phone','tablet','laptop','accessory');
create type listing_condition    as enum ('new','like_new','good','fair','parts');
create type listing_status       as enum ('pending','approved','sold','removed','draft','rejected');
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
create type flagged_reason       as enum ('url','off_platform','image_spam','reported');
create type trust_event_type     as enum ('completed_grade','completed_appointment','completed_transaction','partner_vouch');

-- ============================================================
-- Cities
-- ============================================================

create table public.cities (
  name           text primary key,
  name_el        text not null,
  country        text not null,
  country_el     text not null,
  is_eligible    boolean not null default false,
  display_order  integer not null default 0
);

-- ============================================================
-- Stores
-- ============================================================

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
  hours_json      jsonb not null default '{}'::jsonb,
  services        text[] not null default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- Profiles (1:1 with auth.users)
-- ============================================================

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  handle                text unique,
  name                  text,
  image                 text,
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
create index on public.profiles(deleted_at) where deleted_at is not null;

-- ============================================================
-- Staff
-- ============================================================

create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  store_id    text references public.stores(id) on delete cascade,
  role        staff_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, store_id, role)
);
create index on public.staff(user_id);
create index on public.staff(store_id);

-- ============================================================
-- Listings
-- ============================================================

create table public.listings (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  seller_id           uuid not null references auth.users(id) on delete cascade,
  store_id            text references public.stores(id) on delete set null,
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

-- ============================================================
-- Listing reports (multi-reporter dedup)
-- ============================================================

create table public.listing_reports (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  reporter_id   uuid not null references auth.users(id) on delete cascade,
  reason        text not null,
  created_at    timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index on public.listing_reports(listing_id, created_at desc);

-- ============================================================
-- Messages
-- ============================================================

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  listing_id      uuid references public.listings(id) on delete set null,
  content         text not null check (char_length(content) between 1 and 2000),
  image_url       text,
  image_hash      text,
  is_hidden       boolean not null default false,
  flagged_reason  flagged_reason,
  created_at      timestamptz not null default now()
);
create index on public.messages(conversation_id, created_at);
create index on public.messages(sender_id);
create index on public.messages(recipient_id);
create index on public.messages(sender_id, image_hash, created_at) where image_hash is not null;

create table public.chat_reports (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.messages(id) on delete cascade,
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  reason       text not null,
  resolved     boolean not null default false,
  resolution   text,
  resolved_by  uuid references auth.users(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (message_id, reporter_id)
);
create index on public.chat_reports(resolved, created_at desc);

-- ============================================================
-- Appointments
-- ============================================================

create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  listing_id          uuid references public.listings(id) on delete set null,
  store_id            text references public.stores(id) on delete set null,
  date                date not null,
  time_slot           appointment_timeslot not null,
  status              appointment_status not null default 'pending',
  diagnostic_redeemed boolean not null default false,
  turnaround_hours    integer,
  notes               text check (char_length(notes) <= 500),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.appointments(user_id);
create index on public.appointments(listing_id);
create index on public.appointments(store_id, date);
-- Slot conflict guard (only for non-cancelled)
create unique index appointments_slot_conflict_idx
  on public.appointments(store_id, date, time_slot)
  where status not in ('cancelled');

-- ============================================================
-- Tokens
-- ============================================================

create table public.tokens (
  id              uuid primary key default gen_random_uuid(),
  type            token_type not null,
  entity_id       uuid not null,           -- appointment_id (or reservation_id in V2)
  user_id         uuid not null references auth.users(id) on delete cascade,
  store_id        text references public.stores(id),
  code            text not null check (char_length(code) = 6),
  code_rotated_at timestamptz not null default now(),
  is_active       boolean not null default false,
  is_redeemed     boolean not null default false,
  redeemed_at     timestamptz,
  redeemed_by_id  uuid references auth.users(id),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  unique (entity_id, type)
);
create index on public.tokens(code) where is_active = true and is_redeemed = false;
create index on public.tokens(user_id);

-- ============================================================
-- Inspections
-- ============================================================

create table public.inspections (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  store_id       text not null references public.stores(id),
  inspector_id   uuid not null references auth.users(id),
  grade          grade_letter not null,
  checklist_json jsonb not null,
  notes          text check (char_length(notes) <= 1000),
  inspected_at   timestamptz not null default now()
);
create index on public.inspections(listing_id);
create index on public.inspections(store_id, inspected_at desc);

-- ============================================================
-- Waitlist
-- ============================================================

create table public.waitlist_signups (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  city            text not null,
  country         text not null,
  interest_type   interest_type not null,
  consent         boolean not null check (consent = true),
  phone           text,
  social_handle   text,
  notes           text check (char_length(notes) <= 500),
  language_pref   ui_language not null default 'el',
  referral_code   text not null unique,
  referred_by_code text,
  referral_count  integer not null default 0,
  position_score  integer not null default 0,
  created_at      timestamptz not null default now()
);
create index on public.waitlist_signups(referral_code);
create index on public.waitlist_signups(referred_by_code);
create index on public.waitlist_signups(city, position_score desc, created_at);

-- ============================================================
-- Strikes
-- ============================================================

create table public.user_strikes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  reason              strike_reason not null,
  detail              text,
  source_entity_type  text,
  source_entity_id    text,
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now()
);
create index on public.user_strikes(user_id, expires_at);

-- ============================================================
-- Fraud holds
-- ============================================================

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
create index on public.fraud_holds(resolved, created_at desc) where resolved = false;

-- ============================================================
-- Audit + auto-action logs
-- ============================================================

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

create table public.auto_action_log (
  id           uuid primary key default gen_random_uuid(),
  rule_name    text not null,
  entity_type  text not null,
  entity_id    text not null,
  payload_json jsonb,
  created_at   timestamptz not null default now()
);
create index on public.auto_action_log(rule_name, created_at desc);

-- ============================================================
-- Grade + moderation config
-- ============================================================

create table public.grade_config (
  id            uuid primary key default gen_random_uuid(),
  store_id      text references public.stores(id) on delete cascade,
  grade_a_mult  numeric(4,3) not null default 1.000,
  grade_b_mult  numeric(4,3) not null default 0.930,
  grade_c_mult  numeric(4,3) not null default 0.850,
  grade_d_mult  numeric(4,3) not null default 0.600,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id)
);
create unique index grade_config_store_unique
  on public.grade_config (coalesce(store_id, ''));  -- one row per store; NULL = global

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

-- ============================================================
-- Image metadata
-- ============================================================

create table public.image_metadata (
  storage_path  text primary key,
  bucket        text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  content_type  text not null,
  width         integer not null,
  height        integer not null,
  bytes         integer not null,
  phash         text not null,
  blurhash      text not null,
  created_at    timestamptz not null default now()
);
create index on public.image_metadata(user_id);
create index on public.image_metadata(phash);

-- ============================================================
-- Trust events
-- ============================================================

create table public.trust_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  event_type          trust_event_type not null,
  source_entity_type  text,
  source_entity_id    text,
  created_at          timestamptz not null default now(),
  unique (user_id, event_type, source_entity_type, source_entity_id)
);
create index on public.trust_events(user_id);

-- ============================================================
-- Idempotency keys
-- ============================================================

create table public.idempotency_keys (
  scope         text not null,
  key           text not null,
  user_id       uuid,
  response_json jsonb not null,
  expires_at    timestamptz not null,
  primary key (scope, key)
);
create index on public.idempotency_keys(expires_at);
