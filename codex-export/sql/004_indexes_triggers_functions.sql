-- 004_indexes_triggers_functions.sql
-- Helper functions, triggers, materialized views, pg_cron jobs.

-- ============================================================
-- Helper: is_staff(target_role)
-- ============================================================

create or replace function public.is_staff(target_role staff_role default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid()
      and is_active = true
      and (target_role is null or role = target_role)
  );
$$;

-- ============================================================
-- Helper: is_store_staff(p_store_id)
-- ============================================================

create or replace function public.is_store_staff(p_store_id text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid()
      and is_active = true
      and (store_id = p_store_id or role in ('admin','super_admin'))
  );
$$;

-- ============================================================
-- set_updated_at trigger function
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Wire to every mutable table that has `updated_at`.
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_stores
  before update on public.stores
  for each row execute function public.set_updated_at();

create trigger set_updated_at_listings
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger set_updated_at_appointments
  before update on public.appointments
  for each row execute function public.set_updated_at();

create trigger set_updated_at_waitlist
  before update on public.waitlist_signups
  for each row execute function public.set_updated_at();

create trigger set_updated_at_grade_config
  before update on public.grade_config
  for each row execute function public.set_updated_at();

create trigger set_updated_at_moderation_config
  before update on public.moderation_config
  for each row execute function public.set_updated_at();

-- ============================================================
-- handle_new_user: create a profiles row when an auth.users row is inserted.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, language_pref)
  values (
    new.id,
    new.email,
    coalesce(
      (new.raw_user_meta_data ->> 'language_pref')::ui_language,
      'el'::ui_language
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Keep profiles.email in sync with auth.users.email
-- ============================================================

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
    insert into public.audit_log (actor_type, actor_id, action, entity_type, entity_id, diff_json)
    values (
      'system', new.id, 'user.email_changed', 'user', new.id::text,
      jsonb_build_object('old', old.email, 'new', new.email)
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update on auth.users
  for each row execute function public.handle_user_email_change();

-- ============================================================
-- bump_trust_count: increment profiles.trust_event_count on trust_events insert.
-- Wires the "trustEventCount never incremented" gap noted in the source.
-- ============================================================

create or replace function public.bump_trust_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles
     set trust_event_count = trust_event_count + 1
   where id = new.user_id;
  return new;
end;
$$;

create trigger bump_trust_count_on_insert
  after insert on public.trust_events
  for each row execute function public.bump_trust_count();

-- ============================================================
-- generate_referral_code: "MU" + 6 chars from unambiguous alphabet.
-- 32-char alphabet excludes 0/O/I/1 to avoid OCR/typo collisions.
-- ============================================================

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
  attempts int := 0;
begin
  loop
    code := 'MU';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
    end loop;
    -- collision check
    if not exists (select 1 from public.waitlist_signups where referral_code = code) then
      return code;
    end if;
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'referral_code generation exhausted';
    end if;
  end loop;
end;
$$;

-- ============================================================
-- slug_before_insert_listings: generate slug from title + nano-id.
-- ============================================================

create or replace function public.slug_before_insert_listings()
returns trigger
language plpgsql
as $$
declare
  base text;
  short_id text;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;
  -- lowercase, replace non-alnum runs with '-', trim '-' from edges
  base := regexp_replace(lower(unaccent(new.title)), '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  base := left(base, 64);
  short_id := substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
  new.slug := base || '-' || short_id;
  return new;
end;
$$;

-- Note: `unaccent` requires the extension. Install if not present:
create extension if not exists "unaccent";

create trigger slug_before_insert_listings
  before insert on public.listings
  for each row execute function public.slug_before_insert_listings();

-- ============================================================
-- enforce_listing_status_transitions
-- Valid transitions:
--   pending  -> approved | rejected | removed | draft
--   draft    -> pending  | removed
--   approved -> sold     | removed | pending
--   sold     -> (terminal)
--   removed  -> pending (admin only — enforced at app layer)
--   rejected -> draft   | removed
-- ============================================================

create or replace function public.enforce_listing_status_transitions()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'sold' then
    raise exception 'listings.status: cannot transition from sold (terminal)';
  end if;

  if old.status = 'pending'  and new.status not in ('approved','rejected','removed','draft') then
    raise exception 'listings.status: invalid transition % -> %', old.status, new.status;
  end if;

  if old.status = 'draft'    and new.status not in ('pending','removed') then
    raise exception 'listings.status: invalid transition % -> %', old.status, new.status;
  end if;

  if old.status = 'approved' and new.status not in ('sold','removed','pending') then
    raise exception 'listings.status: invalid transition % -> %', old.status, new.status;
  end if;

  if old.status = 'rejected' and new.status not in ('draft','removed') then
    raise exception 'listings.status: invalid transition % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger enforce_listing_status_transitions
  before update of status on public.listings
  for each row execute function public.enforce_listing_status_transitions();

-- ============================================================
-- enforce_appointment_transitions
-- Valid: pending -> approved | cancelled
--        approved -> checked_in | cancelled
--        checked_in -> completed | cancelled
--        completed -> (terminal)
--        cancelled -> (terminal)
-- ============================================================

create or replace function public.enforce_appointment_transitions()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('completed','cancelled') then
    raise exception 'appointments.status: cannot transition from % (terminal)', old.status;
  end if;

  if old.status = 'pending'    and new.status not in ('approved','cancelled') then
    raise exception 'appointments.status: invalid transition % -> %', old.status, new.status;
  end if;

  if old.status = 'approved'   and new.status not in ('checked_in','cancelled') then
    raise exception 'appointments.status: invalid transition % -> %', old.status, new.status;
  end if;

  if old.status = 'checked_in' and new.status not in ('completed','cancelled') then
    raise exception 'appointments.status: invalid transition % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger enforce_appointment_transitions
  before update of status on public.appointments
  for each row execute function public.enforce_appointment_transitions();

-- ============================================================
-- Materialized view: active listings per city
-- ============================================================

create materialized view if not exists public.mv_active_listings_per_city as
select
  city,
  count(*)::int as active_count,
  count(*) filter (where checklist_complete)::int as verified_count
from public.listings
where is_active and status = 'approved' and is_held = false
group by city;

create unique index if not exists mv_active_listings_per_city_city_idx
  on public.mv_active_listings_per_city(city);

-- ============================================================
-- pg_cron jobs
-- ============================================================

-- Rotate appointment tokens every minute (60s rotation per business rule).
-- The actual rotation logic uses gen_random_bytes; see scripts/cron/rotate_tokens.sql
-- which this job invokes. Inlined here:
select cron.schedule(
  'rotate_tokens',
  '* * * * *',
  $$
  update public.tokens
     set code = lpad(((random()*1000000)::int)::text, 6, '0'),
         rotated_at = now()
   where token_type = 'appointment'
     and expires_at > now()
     and (rotated_at is null or rotated_at < now() - interval '55 seconds');
  $$
);

-- Refresh active-listings-per-city materialized view every 5 minutes.
select cron.schedule(
  'refresh_listings_per_city',
  '*/5 * * * *',
  $$ refresh materialized view concurrently public.mv_active_listings_per_city; $$
);

-- Daily 04:00: log strikes that have crossed their 90-day expiry (audit only —
-- strike rows are retained for forensic value; queries filter expires_at > now()).
select cron.schedule(
  'expire_strikes_audit',
  '0 4 * * *',
  $$
  insert into public.auto_action_log (rule_name, entity_type, entity_id, payload_json)
  select
    'strike_decay',
    'user_strike',
    s.id::text,
    jsonb_build_object('user_id', s.user_id, 'reason', s.reason, 'expired_at', s.expires_at)
  from public.user_strikes s
  where s.expires_at < now()
    and not exists (
      select 1 from public.auto_action_log al
      where al.entity_type = 'user_strike' and al.entity_id = s.id::text
    );
  $$
);

-- Daily 03:00: hard-delete profiles soft-deleted more than 30 days ago.
select cron.schedule(
  'hard_delete_profiles',
  '0 3 * * *',
  $$
  delete from auth.users
   where id in (
     select id from public.profiles
     where deleted_at is not null
       and deleted_at < now() - interval '30 days'
   );
  $$
);

-- Monthly 02:00 on the 1st: prune audit_log rows older than 365 days.
select cron.schedule(
  'cleanup_old_audit_log',
  '0 2 1 * *',
  $$ delete from public.audit_log where created_at < now() - interval '365 days'; $$
);
