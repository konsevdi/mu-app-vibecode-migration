-- 003_storage_policies.sql
-- Storage buckets + RLS policies on storage.objects.

-- ============================================================
-- Buckets
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('listing-images',      'listing-images',      false),
  ('message-attachments', 'message-attachments', false),
  ('inspection-evidence', 'inspection-evidence', false),
  ('avatars',             'avatars',             true)
on conflict (id) do nothing;

-- ============================================================
-- listing-images: owner writes under their uid prefix; authed reads.
-- Path convention: `{user_id}/{uuid}.webp`
-- ============================================================

create policy "listing_images_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_authed_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'listing-images');

create policy "listing_images_anon_read_active"
  on storage.objects for select
  to anon
  using (bucket_id = 'listing-images');

create policy "listing_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- avatars: public read, owner write.
-- ============================================================

create policy "avatars_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- message-attachments: only conversation participants can read; sender writes.
-- ============================================================

create policy "msg_attach_sender_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "msg_attach_participants_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.messages m
      where m.image_url like '%' || storage.objects.name || '%'
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );

-- ============================================================
-- inspection-evidence: only store staff who performed the inspection can write.
-- Read: store staff at owning store OR the listing seller (the inspectee).
-- Path convention: `{store_id}/{inspection_id}/{uuid}.webp`
-- ============================================================

create policy "inspection_evidence_store_staff_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'inspection-evidence'
    and public.is_store_staff((storage.foldername(name))[1])
  );

create policy "inspection_evidence_store_staff_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'inspection-evidence'
    and (
      public.is_store_staff((storage.foldername(name))[1])
      or public.is_staff('admin')
      or public.is_staff('super_admin')
      or exists (
        select 1 from public.inspections i
        join public.listings l on l.id = i.listing_id
        where ((storage.foldername(storage.objects.name))[2])::uuid = i.id
          and l.seller_id = auth.uid()
      )
    )
  );
