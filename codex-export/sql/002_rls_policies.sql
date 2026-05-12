-- 002_rls_policies.sql
-- Enable RLS on every table and apply policies.
-- Helper functions `public.is_staff` and `public.is_store_staff` are created in
-- 004_indexes_triggers_functions.sql, which must run AFTER this file. They are
-- referenced by name here; Postgres resolves them at policy evaluation time.

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.cities              enable row level security;
alter table public.stores              enable row level security;
alter table public.staff               enable row level security;
alter table public.listings            enable row level security;
alter table public.listing_reports     enable row level security;
alter table public.messages            enable row level security;
alter table public.chat_reports        enable row level security;
alter table public.appointments        enable row level security;
alter table public.tokens              enable row level security;
alter table public.inspections         enable row level security;
alter table public.waitlist_signups    enable row level security;
alter table public.user_strikes        enable row level security;
alter table public.fraud_holds         enable row level security;
alter table public.audit_log           enable row level security;
alter table public.auto_action_log     enable row level security;
alter table public.grade_config        enable row level security;
alter table public.moderation_config   enable row level security;
alter table public.image_metadata      enable row level security;
alter table public.trust_events        enable row level security;
alter table public.idempotency_keys    enable row level security;

-- ============================================================
-- profiles
-- ============================================================

create policy "profiles_read_self_or_seller_or_staff"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.seller_id = profiles.id
        and l.is_active and l.status = 'approved' and l.is_held = false
    )
    or public.is_staff()
  );

create policy "profiles_update_self_or_staff"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());

-- Inserts happen only through the handle_new_user trigger (security definer).
create policy "profiles_no_direct_insert"
  on public.profiles for insert
  to authenticated
  with check (false);

-- Deletes blocked — use soft delete via profiles.deleted_at.
create policy "profiles_no_delete"
  on public.profiles for delete
  to authenticated
  using (false);

-- ============================================================
-- cities (public read, service-role write)
-- ============================================================

create policy "cities_public_read"
  on public.cities for select
  to anon, authenticated
  using (true);

-- ============================================================
-- stores
-- ============================================================

create policy "stores_public_read"
  on public.stores for select
  to anon, authenticated
  using (true);

create policy "stores_admin_write"
  on public.stores for insert
  to authenticated
  with check (public.is_staff('admin') or public.is_staff('super_admin'));

create policy "stores_admin_update"
  on public.stores for update
  to authenticated
  using (public.is_staff('admin') or public.is_staff('super_admin'))
  with check (public.is_staff('admin') or public.is_staff('super_admin'));

create policy "stores_super_admin_delete"
  on public.stores for delete
  to authenticated
  using (public.is_staff('super_admin'));

-- ============================================================
-- staff
-- ============================================================

create policy "staff_read_self_or_staff"
  on public.staff for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "staff_super_admin_write"
  on public.staff for insert
  to authenticated
  with check (public.is_staff('super_admin'));

create policy "staff_super_admin_update"
  on public.staff for update
  to authenticated
  using (public.is_staff('super_admin'))
  with check (public.is_staff('super_admin'));

create policy "staff_super_admin_delete"
  on public.staff for delete
  to authenticated
  using (public.is_staff('super_admin'));

-- ============================================================
-- listings
-- ============================================================

create policy "listings_public_read_active"
  on public.listings for select
  to anon, authenticated
  using (
    (is_active and status = 'approved' and is_held = false)
    or seller_id = auth.uid()
    or public.is_staff()
  );

create policy "listings_seller_insert"
  on public.listings for insert
  to authenticated
  with check (seller_id = auth.uid());

create policy "listings_seller_update_or_staff"
  on public.listings for update
  to authenticated
  using (
    (seller_id = auth.uid() and status in ('pending','draft'))
    or public.is_staff()
  )
  with check (
    (seller_id = auth.uid() and status in ('pending','draft','removed'))
    or public.is_staff()
  );

create policy "listings_seller_delete_or_staff"
  on public.listings for delete
  to authenticated
  using (
    (seller_id = auth.uid() and status in ('pending','draft'))
    or public.is_staff()
  );

-- ============================================================
-- listing_reports
-- ============================================================

create policy "listing_reports_staff_read"
  on public.listing_reports for select
  to authenticated
  using (public.is_staff() or reporter_id = auth.uid());

create policy "listing_reports_authed_insert"
  on public.listing_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ============================================================
-- messages
-- ============================================================

create policy "messages_participants_read"
  on public.messages for select
  to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_staff());

create policy "messages_sender_insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and recipient_id <> auth.uid()
  );

-- ============================================================
-- chat_reports
-- ============================================================

create policy "chat_reports_staff_read"
  on public.chat_reports for select
  to authenticated
  using (public.is_staff() or reporter_id = auth.uid());

create policy "chat_reports_authed_insert"
  on public.chat_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ============================================================
-- appointments
-- ============================================================

create policy "appointments_self_or_store_staff_read"
  on public.appointments for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_store_staff(store_id)
    or public.is_staff('admin')
    or public.is_staff('super_admin')
  );

create policy "appointments_self_insert"
  on public.appointments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "appointments_self_cancel_or_staff_update"
  on public.appointments for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_store_staff(store_id)
    or public.is_staff('admin')
    or public.is_staff('super_admin')
  )
  with check (
    user_id = auth.uid()
    or public.is_store_staff(store_id)
    or public.is_staff('admin')
    or public.is_staff('super_admin')
  );

-- ============================================================
-- tokens (service-role only — no client policies)
-- ============================================================

create policy "tokens_owner_read"
  on public.tokens for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = tokens.appointment_id and a.user_id = auth.uid()
    )
    or public.is_staff()
  );

-- All inserts/updates happen via service_role; no policies for authenticated.

-- ============================================================
-- inspections
-- ============================================================

create policy "inspections_owner_or_store_staff_read"
  on public.inspections for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = inspections.listing_id and l.seller_id = auth.uid()
    )
    or public.is_store_staff(inspections.store_id)
    or public.is_staff('admin')
    or public.is_staff('super_admin')
  );

create policy "inspections_inspector_insert"
  on public.inspections for insert
  to authenticated
  with check (
    public.is_store_staff(store_id)
    and (public.is_staff('inspector') or public.is_staff('store_manager'))
  );

-- ============================================================
-- waitlist_signups
-- ============================================================

create policy "waitlist_staff_read"
  on public.waitlist_signups for select
  to authenticated
  using (public.is_staff());

create policy "waitlist_anon_insert"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

create policy "waitlist_super_admin_delete"
  on public.waitlist_signups for delete
  to authenticated
  using (public.is_staff('super_admin'));

-- ============================================================
-- user_strikes (service-role write; staff + owner read)
-- ============================================================

create policy "user_strikes_self_or_staff_read"
  on public.user_strikes for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ============================================================
-- fraud_holds (service-role write; staff read; super_admin resolve)
-- ============================================================

create policy "fraud_holds_staff_read"
  on public.fraud_holds for select
  to authenticated
  using (public.is_staff());

create policy "fraud_holds_super_admin_update"
  on public.fraud_holds for update
  to authenticated
  using (public.is_staff('super_admin'))
  with check (public.is_staff('super_admin'));

-- ============================================================
-- audit_log (staff read; service-role write only)
-- ============================================================

create policy "audit_log_staff_read"
  on public.audit_log for select
  to authenticated
  using (public.is_staff());

-- ============================================================
-- auto_action_log (staff read; service-role write only)
-- ============================================================

create policy "auto_action_log_staff_read"
  on public.auto_action_log for select
  to authenticated
  using (public.is_staff());

-- ============================================================
-- grade_config (public read; admin+ write)
-- ============================================================

create policy "grade_config_public_read"
  on public.grade_config for select
  to anon, authenticated
  using (true);

create policy "grade_config_admin_write"
  on public.grade_config for insert
  to authenticated
  with check (public.is_staff('admin') or public.is_staff('super_admin'));

create policy "grade_config_admin_update"
  on public.grade_config for update
  to authenticated
  using (public.is_staff('admin') or public.is_staff('super_admin'))
  with check (public.is_staff('admin') or public.is_staff('super_admin'));

create policy "grade_config_super_admin_delete"
  on public.grade_config for delete
  to authenticated
  using (public.is_staff('super_admin'));

-- ============================================================
-- moderation_config (staff read; super_admin write)
-- ============================================================

create policy "moderation_config_staff_read"
  on public.moderation_config for select
  to authenticated
  using (public.is_staff());

create policy "moderation_config_super_admin_write"
  on public.moderation_config for insert
  to authenticated
  with check (public.is_staff('super_admin'));

create policy "moderation_config_super_admin_update"
  on public.moderation_config for update
  to authenticated
  using (public.is_staff('super_admin'))
  with check (public.is_staff('super_admin'));

-- ============================================================
-- image_metadata (owner OR staff read; service-role write)
-- ============================================================

create policy "image_metadata_owner_or_staff_read"
  on public.image_metadata for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ============================================================
-- trust_events (staff or self read; service-role write)
-- ============================================================

create policy "trust_events_self_or_staff_read"
  on public.trust_events for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ============================================================
-- idempotency_keys (owner read; authed insert)
-- ============================================================

create policy "idempotency_keys_owner_read"
  on public.idempotency_keys for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "idempotency_keys_owner_insert"
  on public.idempotency_keys for insert
  to authenticated
  with check (user_id = auth.uid());
