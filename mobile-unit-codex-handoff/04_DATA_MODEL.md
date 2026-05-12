# 04 — Data Model

Postgres schema for the Codex rebuild. Translated from `backend/prisma/schema.prisma` (SQLite) with the decisions in `01_CANONICAL_BUILD_DECISIONS.md` applied.

Key translations:
- `String` (SQLite) → `text` (Postgres). IDs that were `cuid()` → `uuid default gen_random_uuid()`.
- `Float` → `numeric(12,2)` for money, `double precision` for coords.
- `DateTime` → `timestamptz`.
- Boolean defaults preserved.
- The `User.id` (Better Auth string) → `profiles.id` (uuid, **= `auth.users.id`**) per D7.
- `Listing.images` JSON string → `listing_images` table per D3.
- `citySchema = z.enum(["rhodes"])` → free text validated against `cities.slug` per D6.
- `Session`, `Account`, `Verification` (Better Auth) → deleted; Supabase Auth owns them.

The full DDL lives in `23_MIGRATIONS_FROM_PRISMA_SQLITE.md`. Below is the model overview.

## Tables

### `profiles`

User profile keyed to `auth.users.id`. Sign-up creates a row via Supabase trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users.id` on delete cascade |
| `email` | `text` | Mirrored from `auth.users.email` (for joins) |
| `name` | `text` nullable | |
| `email_verified` | `boolean` default `false` | |
| `image` | `text` nullable | Avatar URL |
| `handle` | `text` unique nullable | Public profile handle (was `Profile.handle`) |
| `default_city` | `text` nullable | FK → `cities.slug` |
| `onboarding_completed` | `boolean` default `false` | |
| `selected_city` | `text` nullable | FK → `cities.slug` |
| `selected_country` | `text` nullable | |
| `is_eligible_city` | `boolean` default `false` | Cache of `cities.is_eligible` at signup time |
| `language_pref` | `text` default `'el'` | |
| `trust_event_count` | `int` default `0` | Verified at `>=2` |
| `role` | `text` default `'user'` | `'user' \| 'staff' \| 'admin'` |
| `fraud_score` | `int` default `0` | 0-100 |
| `is_held` | `boolean` default `false` | Super-admin approval gate |
| `restricted_mode` | `boolean` default `false` | |
| `restricted_until` | `timestamptz` nullable | 7-day cooldown end |
| `tokens_disabled` | `boolean` default `false` | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | trigger to update on change |

Indexes: `(handle)` unique, `(default_city)`, `(role)`.

### `cities`

See D6 for full DDL. Seed 15 rows from `seed-data.json`.

### `listings`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `seller_id` | `uuid` | FK → `profiles.id` on delete cascade |
| `title` | `text` | 3-100 chars (zod) |
| `description` | `text` | 10-2000 chars (zod) |
| `price` | `numeric(12,2)` | `>= 0` |
| `category` | `text` | `'phone' \| 'tablet' \| 'laptop' \| 'accessory'` (CHECK) |
| `condition` | `text` | `'new' \| 'like_new' \| 'good' \| 'fair' \| 'parts'` (CHECK) |
| `brand` | `text` nullable | |
| `model` | `text` nullable | |
| `location` | `text` nullable | Free-text neighborhood / district |
| `city` | `text` | FK → `cities.slug` (NOT enum) |
| `grade` | `text` nullable | `'A' \| 'B' \| 'C' \| 'D'` (CHECK) |
| `checklist_complete` | `boolean` default `false` | |
| `inspection_date` | `timestamptz` nullable | |
| `status` | `text` default `'pending'` | `'pending' \| 'approved' \| 'rejected'` (CHECK) |
| `is_active` | `boolean` default `true` | |
| `is_featured` | `boolean` default `false` | |
| `is_store` | `boolean` default `false` | "Sold by `PARTNER_NAME`" listings |
| `views` | `int` default `0` | |
| `fraud_score` | `int` default `0` | |
| `is_held` | `boolean` default `false` | |
| `report_count_24h` | `int` default `0` | |
| `last_report_at` | `timestamptz` nullable | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

Indexes: `(category)`, `(seller_id)`, `(city)`, `(status)`, `(status, is_active, created_at desc)` for browse.

### `listing_images` (NEW per D3)

See D3 for DDL. Cover image = `min(sort_order)` per listing.

### `messages`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `conversation_id` | `text` | Deterministic `[a,b].sort().join('_')` |
| `sender_id` | `uuid` | FK → `profiles.id` |
| `recipient_id` | `uuid` | FK → `profiles.id` |
| `content` | `text` | |
| `image_url` | `text` nullable | |
| `image_hash` | `text` nullable | For spam dedup |
| `is_hidden` | `boolean` default `false` | Soft-hide for recipient |
| `flagged_reason` | `text` nullable | `'url' \| 'off_platform' \| 'image_spam' \| 'reported'` |
| `created_at` | `timestamptz` default `now()` | |

Indexes: `(conversation_id, created_at desc)`, `(sender_id)`, `(recipient_id)`.

View `conversations` per D8.

### `chat_reports`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `message_id` | `uuid` | FK → `messages.id` on delete cascade |
| `reporter_id` | `uuid` | FK → `profiles.id` |
| `reason` | `text` | |
| `created_at` | `timestamptz` default `now()` | |

### `user_strikes`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK → `profiles.id` on delete cascade |
| `reason` | `text` | |
| `created_at` | `timestamptz` default `now()` | |
| `expires_at` | `timestamptz` | 90 days from creation |

Index: `(user_id, expires_at)`.

### `fraud_holds`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `entity_type` | `text` | `'user' \| 'listing' \| 'chat' \| 'service' \| 'appointment'` |
| `entity_id` | `uuid` | |
| `fraud_score` | `int` | |
| `reason` | `text` | |
| `missive_draft_id` | `text` nullable | External ticket ID |
| `resolved_at` | `timestamptz` nullable | |
| `resolved_by` | `uuid` nullable | FK → `profiles.id` |
| `created_at` | `timestamptz` default `now()` | |

Index: `(entity_type, entity_id)`, `(resolved_at)`.

### `appointments`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK → `profiles.id` on delete cascade |
| `listing_id` | `uuid` nullable | FK → `listings.id` on delete set null |
| `store_id` | `uuid` nullable | FK → `stores.id` on delete set null |
| `date` | `timestamptz` | |
| `time_slot` | `text` | `'morning' \| 'afternoon'` (CHECK) |
| `status` | `text` default `'pending'` | `'pending' \| 'approved' \| 'checked_in' \| 'completed' \| 'cancelled'` |
| `token_id` | `uuid` unique nullable | V2 (D9) |
| `diagnostic_redeemed` | `boolean` default `false` | |
| `turnaround_hours` | `int` nullable | |
| `notes` | `text` nullable | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

Indexes: `(user_id, created_at desc)`, `(listing_id)`, `(store_id, date)`.

### `stores`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text` unique | `'irepair-rhodes-main'`, `'irepair-rhodes-spot'` |
| `name` | `text` | English name |
| `name_el` | `text` | Greek name |
| `address` | `text` | Greek address |
| `address_en` | `text` nullable | English address |
| `phone` | `text` nullable | E.164 |
| `email` | `text` nullable | |
| `hours` | `text` nullable | Free-text |
| `hours_note` | `text` nullable | |
| `services` | `jsonb` nullable | `[{ key, label_en, label_el }]` |
| `lat` | `double precision` nullable | |
| `lng` | `double precision` nullable | |
| `city` | `text` | FK → `cities.slug` |
| `is_primary` | `boolean` default `false` | |
| `visible_in_app` | `boolean` default `true` | |
| `promo_enabled` | `boolean` default `true` | |
| `partner_status` | `text` default `'owned'` | `'owned' \| 'partner'` |
| `lead_fee_per_checkin` | `numeric(12,2)` default `0` | V2 billing |
| `lead_fee_per_redeem` | `numeric(12,2)` default `0` | V2 billing |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

Seed 2 rows from `seed-data.json` (iRepair Rhodes main + iRepair Spot).

### `staff` (V2 — admin can still use without UI)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK → `profiles.id` on delete cascade |
| `store_id` | `uuid` | FK → `stores.id` on delete cascade |
| `role` | `text` | `'super_admin' \| 'admin' \| 'store_manager' \| 'moderator'` |
| `is_active` | `boolean` default `true` | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

Unique `(user_id, store_id)`.

### `inspections`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `listing_id` | `uuid` | FK → `listings.id` on delete cascade |
| `store_id` | `uuid` | FK → `stores.id` |
| `inspector_id` | `uuid` | FK → `profiles.id` |
| `grade` | `text` | `'A' \| 'B' \| 'C' \| 'D'` |
| `checklist_json` | `jsonb` | Checklist items map |
| `notes` | `text` nullable | |
| `inspected_at` | `timestamptz` default `now()` | |

Indexes: `(listing_id)`, `(store_id)`.

### `tokens` (V2 — D9)

Keep the schema but no UI consumes it in V1. Same fields as Prisma: `type`, `entity_id`, `user_id`, `store_id`, `code`, `code_rotated_at`, `is_active`, `is_redeemed`, `redeemed_at`, `redeemed_by_id`, `expires_at`, `created_at`. Unique `(entity_id, type)`.

### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `actor_id` | `uuid` | FK → `profiles.id` |
| `actor_role` | `text` nullable | |
| `action` | `text` | `'approve_listing'`, etc. |
| `entity_type` | `text` | |
| `entity_id` | `uuid` | |
| `details` | `jsonb` nullable | |
| `ip_address` | `text` nullable | |
| `created_at` | `timestamptz` default `now()` | |

Indexes: `(actor_id, created_at desc)`, `(entity_type, entity_id)`, `(created_at desc)`.

### `auto_action_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `entity_type` | `text` | |
| `entity_id` | `uuid` | |
| `action` | `text` | `'auto_hide' \| 'auto_restrict' \| 'strike_added'` |
| `reason` | `text` | `'report_threshold'`, etc. |
| `details` | `jsonb` nullable | |
| `created_at` | `timestamptz` default `now()` | |

### `grade_configs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `store_id` | `uuid` nullable | NULL = global |
| `grade_a` | `numeric(4,3)` default `1.000` | |
| `grade_b` | `numeric(4,3)` default `0.930` | |
| `grade_c` | `numeric(4,3)` default `0.850` | |
| `grade_d` | `numeric(4,3)` default `0.600` | |
| `updated_by` | `uuid` nullable | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

### `moderation_configs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `private_report_threshold` | `int` default `2` | |
| `store_report_threshold` | `int` default `5` | |
| `cooldown_days` | `int` default `7` | |
| `limited_state_days` | `int` default `7` | |
| `strike_decay_days` | `int` default `90` | |
| `fraud_hold_threshold` | `int` default `80` | |
| `updated_by` | `uuid` nullable | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

### `waitlist_signups`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `email` | `text` unique | Lowercased on insert |
| `city` | `text` | Free-text (user could type) |
| `country` | `text` | |
| `interest_type` | `text` | `'BUYER' \| 'SELLER' \| 'BOTH' \| 'REPAIR'` (CHECK) — note: the source uses BUYER/SELLER/BOTH plus a separate REPAIR intent path |
| `consent` | `boolean` | Must be true |
| `phone` | `text` nullable | |
| `social_handle` | `text` nullable | |
| `notes` | `text` nullable | |
| `language_pref` | `text` default `'el'` | |
| `referral_code` | `text` unique | Generated on insert (8 chars, alphanum) |
| `referred_by_code` | `text` nullable | |
| `referral_count` | `int` default `0` | Triggered on insert of referred user |
| `position_score` | `int` default `0` | `referral_count * 10` (tunable) |
| `created_at` | `timestamptz` default `now()` | |

Indexes: `(referral_code)`, `(referred_by_code)`, `(city)`, `(country)`.

### `events` (PROPOSED)

Lightweight analytics, no third-party tracker for V1.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` PK | |
| `user_id` | `uuid` nullable | NULL for anon |
| `name` | `text` | `'listing_view'`, `'contact_seller_clicked'`, `'assistant_query'`, ... |
| `properties` | `jsonb` | `{ listing_id, ... }` |
| `created_at` | `timestamptz` default `now()` | |

Index: `(name, created_at desc)`.

## Row Level Security

See `19_SUPABASE_SETUP.md` for the actual policy SQL. High-level matrix:

| Table | Anon read | Authed read | Authed write | Admin/Staff write |
|---|---|---|---|---|
| `profiles` | own only | own + public fields of others | own row | all |
| `cities` | yes | yes | no | yes |
| `listings` | only `status='approved' AND is_active AND NOT is_held` | same + own (any status) | own (insert/update if not held); status defaults `'pending'` | all |
| `listing_images` | join via listings policy | same | via owning listing | all |
| `messages` | no | only where `sender_id` or `recipient_id` = `auth.uid()` | insert if sender_id = auth.uid() | all |
| `chat_reports` | no | own reports | insert | all |
| `appointments` | no | own | own | all |
| `stores` | yes | yes | no | all |
| `inspections` | join via listing policy | same | no | staff/admin only |
| `audit_logs`, `auto_action_logs` | no | no | no | admin only |
| `waitlist_signups` | no | own (by email match) | insert anon allowed | all |

## Migration from SQLite

Concrete `CREATE TABLE` statements, FK definitions, CHECK constraints, and the seed inserts are in `23_MIGRATIONS_FROM_PRISMA_SQLITE.md`.
