# 15 — SQL Migrations

Six migration files in `supabase/migrations/`. Run with `supabase db push`. Order matters.

| File | Purpose |
|---|---|
| `001_initial_schema.sql` | All tables, enums, FKs, basic indexes |
| `002_rls_policies.sql` | RLS enable + policies on every table |
| `003_storage_policies.sql` | Storage bucket creation + RLS on `storage.objects` |
| `004_indexes_triggers_functions.sql` | Triggers, functions, materialized views, pg_cron jobs |
| `005_seed_demo_data.sql` | Reads `seed-data.json` via Node script (see below) |
| `006_seed_admin_user.sql` | Creates demo admin users via `auth.admin` API (Node-side, not SQL) |

## File-by-file summary

### `001_initial_schema.sql`

- Create extensions: `pgcrypto`, `pg_trgm`, `pg_cron`
- Create all enums from `14_SUPABASE_SCHEMA.md`
- Create tables (in FK-safe order): `cities`, `stores`, `profiles`, `staff`, `listings`, `messages`, `chat_reports`, `appointments`, `tokens`, `inspections`, `waitlist_signups`, `user_strikes`, `fraud_holds`, `audit_log`, `auto_action_log`, `grade_config`, `moderation_config`, `image_metadata`, `trust_events`
- Add all indexes (b-tree by default, GIN on `listings.images` for `?` lookups if needed later)

### `002_rls_policies.sql`

Enable RLS on every table. Policies summary (full SQL in the file):

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | self OR active listing seller OR staff | self (via trigger only) | self (limited columns) OR staff | nobody (use soft delete) |
| `cities` | anyone (anon allowed) | service_role only | service_role only | service_role only |
| `stores` | anyone | staff role admin+ | staff role admin+ | super_admin only |
| `staff` | self + staff | super_admin | super_admin | super_admin |
| `listings` | anyone if active+approved+!held; self always; staff always | self | self for own pending/draft; staff for any | self for own pending/draft; staff |
| `messages` | sender or recipient | self as sender, recipient != self | nobody | nobody |
| `chat_reports` | staff | self | nobody | nobody |
| `appointments` | self or staff at store | self | self (cancel only) or staff | nobody |
| `tokens` | owner | service_role only (server-issued) | service_role only | service_role only |
| `inspections` | staff at store OR listing owner | staff inspector at store | nobody (immutable) | nobody |
| `waitlist_signups` | staff | anon | nobody | super_admin |
| `user_strikes` | staff | service_role only | service_role only | service_role only |
| `fraud_holds` | staff | service_role only | super_admin (resolve) | nobody |
| `audit_log` | staff | service_role only | nobody | nobody |
| `auto_action_log` | staff | service_role only | nobody | nobody |
| `grade_config` | anyone | staff admin+ | staff admin+ | super_admin |
| `moderation_config` | staff | super_admin only | super_admin only | nobody |
| `image_metadata` | owner OR staff | service_role only | service_role only | service_role only |
| `trust_events` | staff or self | service_role only | nobody | nobody |

Helper function used throughout:

```sql
create function public.is_staff(target_role staff_role default null) ...;
create function public.is_store_staff(p_store_id text) returns boolean ...;
```

### `003_storage_policies.sql`

```sql
insert into storage.buckets (id, name, public) values
  ('listing-images',      'listing-images',      false),
  ('message-attachments', 'message-attachments', false),
  ('inspection-evidence', 'inspection-evidence', false),
  ('avatars',             'avatars',             true)
on conflict (id) do nothing;
```

Then the storage.objects policies listed in `09_IMAGE_UPLOAD_AND_STORAGE_EXPORT.md`.

### `004_indexes_triggers_functions.sql`

- Helper functions: `is_staff`, `is_store_staff`, `handle_new_user`, `set_updated_at`, `bump_trust_count`, `generate_referral_code`, `slug_before_insert`, `enforce_listing_status_transitions`, `enforce_appointment_transitions`
- Triggers for every mutable table (`updated_at`), state-machine enforcement, profile creation, trust counting
- Materialized view `mv_active_listings_per_city` + unique index
- pg_cron jobs:
  - `rotate_tokens` `* * * * *`
  - `refresh_listings_per_city` `*/5 * * * *`
  - `expire_strikes_audit` `0 4 * * *` — write `auto_action_log` rows for strikes that crossed 90d (kept for audit, not deleted)
  - `hard_delete_profiles` `0 3 * * *` — delete profiles with `deleted_at < now() - interval '30 days'`
  - `cleanup_old_audit_log` `0 2 1 * *` — monthly, drop rows older than 365 days

### `005_seed_demo_data.sql`

Pure SQL inserts for `cities`, `stores`, `grade_config`, `moderation_config`, `waitlist_signups`. **Listings + users** are seeded by the Node script `scripts/seed.ts` because they depend on `auth.users` rows created via Admin API.

### `006_seed_admin_user.sql`

Empty SQL file. The actual admin-user seeding happens in `scripts/seed.ts` which:

1. Calls `supabase.auth.admin.createUser({ email, password, email_confirm: true })` for each demo user
2. Updates `public.profiles` with `handle`, `language_pref`
3. Inserts `staff` row when `role` is set
4. Inserts the demo listings owned by `irepair.demo@mobileunit.gr`

Documented here so the migration ordering is clear; actual code lives in TypeScript.

## Migration runbook

```bash
# Local dev
supabase start
supabase db reset                  # wipes + reapplies all migrations
npm run db:seed                    # runs scripts/seed.ts

# Preview / Production
supabase db push --linked          # applies pending migrations
npm run db:seed -- --env=preview   # idempotent — uses upserts everywhere
```

CI gate: `supabase db lint` runs on PR. Migrations are append-only — never edit a merged migration; write a follow-up.

## Idempotency

All seed inserts use `on conflict do nothing` or `on conflict (key) do update`. Re-running seed is safe.

## Rollback strategy

Supabase migrations are forward-only. To revert: write a new migration that undoes the change. For data migrations that move user-visible records, write the migration as transactional (`begin; ... commit;`) so a failure leaves the DB consistent.
