# 23 — Migrations from Prisma + SQLite to Supabase Postgres

The Vibecode app shipped on **Prisma + SQLite**. The rebuild is **raw SQL on Postgres** (decision **D11**). This doc translates the schema, lists data-import considerations, and bakes in the policies needed for Row Level Security.

## Approach

V1 is a fresh start in Postgres — Rhodes-only soft launch, no critical production data exists in the SQLite store. We migrate **schema and seed data** (cities, stores, configs), not user data. If users existed (none yet at the time of this bundle), see "Data import (optional)" below.

Each Postgres migration is a numbered SQL file in `supabase/migrations/` applied via `supabase db push`. Naming: `00001_init.sql`, `00002_listings.sql`, etc.

## Type mappings — Prisma SQLite → Postgres

| Prisma | SQLite | Postgres | Notes |
|---|---|---|---|
| `String @id @default(cuid())` | TEXT | `text primary key default gen_random_uuid()::text` | switch cuid → uuid; or keep `text` and generate cuids app-side via `@paralleldrive/cuid2` |
| `String` | TEXT | `text` | |
| `String @unique` | TEXT UNIQUE | `text unique` | |
| `Int` | INTEGER | `integer` | |
| `Float` | REAL | `numeric(10,2)` for money, `double precision` otherwise | **Critical**: prices must be `numeric`, not `double precision`. SQLite was wrong here. |
| `Boolean` | INTEGER (0/1) | `boolean` | |
| `DateTime` | DATETIME (ISO text) | `timestamptz` | always store UTC |
| `Json String` (stored as stringified JSON) | TEXT | `jsonb` | `images`, `checklistJson`, `details` columns get a real jsonb type |
| Enum-like `String` ("phone", "tablet"...) | TEXT | `text` + `check (col in (...))` constraint, or Postgres `enum` | Prefer check constraints for flexibility |

## Naming convention

Source uses camelCase for columns (`isActive`, `createdAt`). Postgres convention is snake_case, and tooling (`pgcli`, raw SQL) handles it better unquoted. **Switch to snake_case in the rebuild.** The Supabase client (`@supabase/supabase-js`) returns columns as-is; in JS layer we map to camelCase at the boundary.

```ts
// lib/db/mappers.ts
export const listingFromRow = (r: any) => ({
  id: r.id, title: r.title, sellerId: r.seller_id, isActive: r.is_active,
  createdAt: new Date(r.created_at), images: r.images, // jsonb is already an array
  // ...
});
```

Or use Supabase's `.select(...).returns<T>()` pattern with TypeScript-generated types from `supabase gen types typescript`.

## Schema translation — full DDL

> Source: `backend/prisma/schema.prisma`, 385 lines, 20 models. Below is the Postgres equivalent organized into per-feature migration files.

### `00001_init.sql` — extensions + auth bridge

```sql
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Profile bridge table: maps Supabase auth.users to our app fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  handle text unique,
  image text,
  default_city text,
  -- Onboarding flags
  onboarding_completed boolean not null default false,
  selected_city text,
  selected_country text,
  is_eligible_city boolean not null default false,
  language_pref text not null default 'el' check (language_pref in ('el','en')),
  -- Trust
  trust_event_count integer not null default 0,
  -- Fraud
  fraud_score integer not null default 0,
  is_held boolean not null default false,
  restricted_mode boolean not null default false,
  restricted_until timestamptz,
  tokens_disabled boolean not null default false,
  -- Role (was a separate model in source; merged here)
  role text not null default 'user' check (role in ('user','moderator','store_manager','admin','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.profiles (handle);
create index on public.profiles (default_city);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can read public profile fields of others"
  on public.profiles for select using (true);
  -- Note: SELECT-only policy combined with column-level grants;
  -- handle SELECT projection in views or just accept that profiles is shallow.

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on auth signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, language_pref)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'language_pref', 'el'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### `00002_cities.sql`

```sql
create table public.cities (
  slug text primary key,
  name_el text not null,
  name_en text not null,
  country text not null,
  is_eligible boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cities enable row level security;
create policy "Anyone can read cities" on public.cities for select using (true);

-- See 24_SEED_DATA.md / seed-data.json for inserts.
```

### `00003_listings.sql`

```sql
create table public.listings (
  id text primary key default gen_random_uuid()::text,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  category text not null check (category in ('phone','tablet','laptop','accessory')),
  condition text not null check (condition in ('new','like_new','good','fair','parts')),
  brand text,
  model text,
  images jsonb not null,                -- array of {url, blurhash} objects
  location text,
  city text not null references public.cities(slug),
  -- Inspection
  grade text check (grade in ('A','B','C','D')),
  checklist_complete boolean not null default false,
  inspection_date timestamptz,
  -- Approval
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  views integer not null default 0,
  -- Fraud
  fraud_score integer not null default 0,
  is_held boolean not null default false,
  is_store boolean not null default false,
  report_count_24h integer not null default 0,
  last_report_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.listings (category);
create index on public.listings (seller_id);
create index on public.listings (city);
create index on public.listings (status);
create index on public.listings (created_at desc) where is_active and status = 'approved';

-- Validate images jsonb: array of 3-10 objects with at least a url
create or replace function public.validate_listing_images(images jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(images) = 'array'
    and jsonb_array_length(images) between 3 and 10
    and not exists (
      select 1 from jsonb_array_elements(images) e
      where not (e ? 'url') or jsonb_typeof(e->'url') <> 'string'
    );
$$;

alter table public.listings
  add constraint listings_images_valid check (validate_listing_images(images));

alter table public.listings enable row level security;

create policy "Anyone can read approved active listings"
  on public.listings for select
  using (status = 'approved' and is_active and not is_held);

create policy "Sellers can read own listings"
  on public.listings for select
  using (auth.uid() = seller_id);

create policy "Sellers can insert listings"
  on public.listings for insert
  with check (auth.uid() = seller_id);

create policy "Sellers can update own listings (limited fields enforced app-side)"
  on public.listings for update
  using (auth.uid() = seller_id);

create policy "Staff can read all listings"
  on public.listings for select
  using (public.has_role(array['moderator','admin','super_admin']));

create policy "Staff can update any listing"
  on public.listings for update
  using (public.has_role(array['moderator','admin','super_admin']));

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();
```

### `00004_messages_and_chat_reports.sql`

```sql
create table public.messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  image_hash text,
  is_hidden boolean not null default false,
  flagged_reason text check (flagged_reason in (null,'url','off_platform','image_spam','reported')),
  created_at timestamptz not null default now()
);

create index on public.messages (conversation_id, created_at);
create index on public.messages (sender_id);
create index on public.messages (recipient_id);

alter table public.messages enable row level security;

create policy "Conversation participants can read"
  on public.messages for select
  using (auth.uid() in (sender_id, recipient_id) and not is_hidden);

create policy "Senders can insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Staff can read all messages"
  on public.messages for select
  using (public.has_role(array['moderator','admin','super_admin']));

create table public.chat_reports (
  id text primary key default gen_random_uuid()::text,
  message_id text not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_reports enable row level security;
create policy "Authenticated users can report"
  on public.chat_reports for insert
  to authenticated with check (auth.uid() = reporter_id);
create policy "Staff can read reports"
  on public.chat_reports for select
  using (public.has_role(array['moderator','admin','super_admin']));
```

### `00005_fraud.sql`

```sql
create table public.user_strikes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index on public.user_strikes (user_id);

create table public.fraud_holds (
  id text primary key default gen_random_uuid()::text,
  entity_type text not null check (entity_type in ('user','listing','chat','service','appointment')),
  entity_id text not null,
  fraud_score integer not null,
  reason text not null,
  missive_draft_id text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.fraud_holds (entity_id);

alter table public.user_strikes enable row level security;
alter table public.fraud_holds  enable row level security;

create policy "Users can read own strikes" on public.user_strikes for select using (auth.uid() = user_id);
create policy "Staff can read all strikes" on public.user_strikes for select using (public.has_role(array['moderator','admin','super_admin']));
create policy "Staff can manage strikes" on public.user_strikes for all using (public.has_role(array['admin','super_admin']));

create policy "Staff can read holds" on public.fraud_holds for select using (public.has_role(array['moderator','admin','super_admin']));
create policy "Super admin can resolve holds" on public.fraud_holds for update using (public.has_role(array['super_admin']));
```

### `00006_stores_staff_inspections_tokens.sql`

```sql
create table public.stores (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  name_el text not null,
  address text not null,
  address_en text,
  phone text,
  hours text,
  hours_note text,
  hours_note_en text,
  website text,
  maps_url text,
  city text not null references public.cities(slug),
  lat double precision,
  lng double precision,
  is_primary boolean not null default false,
  visible_in_app boolean not null default true,
  promo_enabled boolean not null default true,
  partner_status text not null default 'owned' check (partner_status in ('owned','partner')),
  lead_fee_per_checkin numeric(10,2) not null default 0,
  lead_fee_per_redeem numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  role text not null check (role in ('super_admin','admin','store_manager','moderator')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id)
);
create index on public.staff (user_id);
create index on public.staff (store_id);

create table public.inspections (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null references public.listings(id) on delete cascade,
  store_id text not null references public.stores(id),
  inspector_id uuid not null references public.profiles(id),
  grade text not null check (grade in ('A','B','C','D')),
  checklist_json jsonb not null,
  notes text,
  inspected_at timestamptz not null default now()
);
create index on public.inspections (listing_id);
create index on public.inspections (store_id);

create table public.tokens (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('appointment','reservation')),
  entity_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id text references public.stores(id),
  code text not null,
  code_rotated_at timestamptz not null default now(),
  is_active boolean not null default false,
  is_redeemed boolean not null default false,
  redeemed_at timestamptz,
  redeemed_by_id uuid references public.profiles(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (entity_id, type)
);
create index on public.tokens (code);
create index on public.tokens (user_id);

alter table public.stores enable row level security;
alter table public.staff enable row level security;
alter table public.inspections enable row level security;
alter table public.tokens enable row level security;

create policy "Anyone can read visible stores"
  on public.stores for select using (visible_in_app = true);
create policy "Staff can manage stores"
  on public.stores for all using (public.has_role(array['admin','super_admin']));

create policy "Users can read own staff record" on public.staff for select using (auth.uid() = user_id);
create policy "Admin can manage staff" on public.staff for all using (public.has_role(array['admin','super_admin']));

create policy "Listing owner can read inspection" on public.inspections for select
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "Staff can manage inspections" on public.inspections for all
  using (public.has_role(array['store_manager','admin','super_admin','moderator']));

create policy "Token owner can read" on public.tokens for select using (auth.uid() = user_id);
create policy "Staff can read tokens at their store" on public.tokens for select
  using (store_id is not null and public.is_staff_at_store(store_id));
create policy "Staff can redeem tokens at their store" on public.tokens for update
  using (store_id is not null and public.is_staff_at_store(store_id));
```

### `00007_appointments.sql`

```sql
create table public.appointments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text references public.listings(id) on delete set null,
  store_id text references public.stores(id) on delete set null,
  date timestamptz not null,
  time_slot text not null check (time_slot in ('morning','afternoon')),
  status text not null default 'pending' check (status in ('pending','approved','checked_in','completed','cancelled')),
  token_id text unique references public.tokens(id),
  diagnostic_redeemed boolean not null default false,
  turnaround_hours integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.appointments (user_id);
create index on public.appointments (listing_id);
create index on public.appointments (store_id);

alter table public.appointments enable row level security;
create policy "Users can read own appointments" on public.appointments for select using (auth.uid() = user_id);
create policy "Users can create own appointments" on public.appointments for insert with check (auth.uid() = user_id);
create policy "Staff can manage at their store" on public.appointments for all
  using (store_id is not null and public.is_staff_at_store(store_id));
```

### `00008_audit_and_auto_actions.sql`

```sql
create table public.audit_log (
  id text primary key default gen_random_uuid()::text,
  actor_id uuid references public.profiles(id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index on public.audit_log (actor_id);
create index on public.audit_log (entity_type, entity_id);
create index on public.audit_log (created_at desc);

create table public.auto_action_log (
  id text primary key default gen_random_uuid()::text,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  reason text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.auto_action_log (entity_type, entity_id);
create index on public.auto_action_log (created_at desc);

alter table public.audit_log enable row level security;
alter table public.auto_action_log enable row level security;
create policy "Staff can read audit log" on public.audit_log for select using (public.has_role(array['admin','super_admin']));
create policy "Staff can read auto action log" on public.auto_action_log for select using (public.has_role(array['admin','super_admin']));
```

### `00009_configs.sql`

```sql
create table public.grade_config (
  id text primary key default gen_random_uuid()::text,
  store_id text references public.stores(id) on delete cascade,
  grade_a numeric(4,2) not null default 1.00,
  grade_b numeric(4,2) not null default 0.93,
  grade_c numeric(4,2) not null default 0.85,
  grade_d numeric(4,2) not null default 0.60,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moderation_config (
  id text primary key default gen_random_uuid()::text,
  private_report_threshold integer not null default 2,
  store_report_threshold integer not null default 5,
  cooldown_days integer not null default 7,
  limited_state_days integer not null default 7,
  strike_decay_days integer not null default 90,
  fraud_hold_threshold integer not null default 80,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grade_config enable row level security;
alter table public.moderation_config enable row level security;
create policy "Anyone can read grade config" on public.grade_config for select using (true);
create policy "Admin can manage grade config" on public.grade_config for all using (public.has_role(array['admin','super_admin']));
create policy "Anyone can read moderation config" on public.moderation_config for select using (true);
create policy "Admin can manage moderation config" on public.moderation_config for all using (public.has_role(array['admin','super_admin']));
```

### `00010_waitlist.sql`

```sql
create table public.waitlist_signups (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  city text not null,
  country text not null,
  interest_type text not null check (interest_type in ('buyer','seller','both')),
  consent boolean not null,
  phone text,
  social_handle text,
  notes text,
  language_pref text not null default 'el',
  referral_code text not null unique,
  referred_by_code text,
  referral_count integer not null default 0,
  position_score integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.waitlist_signups (referral_code);
create index on public.waitlist_signups (referred_by_code);

alter table public.waitlist_signups enable row level security;
create policy "Service role only" on public.waitlist_signups for all using (false);
-- All access via service role through API route. Anon can POST via signed routes.
```

### `00011_realtime_publications.sql`

```sql
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.listings;
alter publication supabase_realtime add table public.appointments;
```

## Models dropped from the Prisma source

| Source model | Why dropped |
|---|---|
| `User` (full) | Merged into `profiles` (D7 — Supabase Auth owns identity). |
| `Session`, `Account`, `Verification` | Supabase Auth owns these. |
| `Profile` (separate model) | Merged into `profiles`. |

## Data import (optional, V1.1)

If by go-live a non-trivial number of users exist in the SQLite DB:

1. Dump SQLite: `sqlite3 backend/prisma/dev.db .dump > dump.sql`.
2. Run `scripts/migrate-from-sqlite.ts` (see `18_NEXT_JS_PROJECT_STRUCTURE.md`):
   - Open SQLite via `better-sqlite3`.
   - For each table, transform rows (camelCase → snake_case, parse JSON columns).
   - Write to Postgres via `pg` direct connection.
   - Map `user.id` → `auth.users.id` via Supabase Admin API (create user with `email_confirm: true`, pre-existing password hash). Better Auth used bcrypt; Supabase also uses bcrypt — passwords can transfer.
3. Verify counts match between source and target before flipping DNS.

For V1 Rhodes soft launch, this isn't needed — start fresh.

## Postgres-specific gotchas vs SQLite

- **Timezone awareness**: SQLite has no `timestamptz`. All datetimes in source are stored as ISO UTC strings already; map to `timestamptz` directly.
- **Booleans**: SQLite stored `0/1`. Postgres needs `true/false`. The Supabase JS client handles this transparently, but raw SQL imports need a cast.
- **JSON columns**: SQLite stored stringified JSON in TEXT. Postgres uses `jsonb`. Migrate via `to_jsonb(text_col::jsonb)`.
- **`@default(now())` + `@updatedAt`**: Prisma updates `updatedAt` app-side. Postgres uses the trigger pattern (`touch_updated_at`) shown above — runs on UPDATE.
- **Cascade behavior**: Prisma's `onDelete: Cascade` maps to `on delete cascade`. Set as shown.
- **Index hints**: Prisma's `@@index` translates to `create index` — already done above. Add covering indexes where the source uses `where` clauses (e.g., `listings (created_at desc) where is_active and status = 'approved'` for the browse query).

## Type generation

After migrations apply, run:

```bash
supabase gen types typescript --linked > lib/supabase/types.ts
```

Use `Database['public']['Tables']['listings']['Row']` types in queries for end-to-end type safety. Combine with zod schemas in `shared/contracts.ts` at the API boundary.

## Migration order summary

```
00001_init.sql                 — profiles + auth trigger + helpers
00002_cities.sql               — cities + seed (see 24)
00003_listings.sql             — listings + indexes + RLS
00004_messages_and_chat_reports.sql
00005_fraud.sql
00006_stores_staff_inspections_tokens.sql
00007_appointments.sql
00008_audit_and_auto_actions.sql
00009_configs.sql              — grade + moderation configs + seed defaults
00010_waitlist.sql
00011_realtime_publications.sql
```

After this, run `bun run db:seed` to insert cities, stores, and default config rows from `seed-data.json`.
