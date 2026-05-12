# 09 — Image Upload and Storage Export

## Current implementation (DROP)

`backend/src/routes/upload.ts` (99 lines) — local disk:

- **Endpoint**: `POST /api/upload/image`, `multipart/form-data`, field name `image`
- **MIME allowlist**: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`
- **Size cap**: `10 * 1024 * 1024` (10 MB)
- **Filename**: `${randomUUID()}${path.extname(image.name)}`
- **Storage path**: `process.cwd() + "/uploads/" + uniqueFilename`
- **Response URL**: `/uploads/{filename}` (served by Hono static middleware in `backend/src/index.ts`)

Disk storage on Vercel = **not viable** (serverless, ephemeral FS). Must replace.

## Target — Supabase Storage

### Buckets

| Bucket | Public? | Purpose |
|---|---|---|
| `listing-images` | private, signed URLs | listing photos (3-10 per listing) |
| `message-attachments` | private, signed URLs | chat attachments |
| `inspection-evidence` | private, staff-only | inspection photos by store staff |
| `avatars` | public | profile photos |

### Upload flow (Next.js)

Two-step pattern: client requests a signed upload URL, then PUTs the file directly to Supabase (bypasses Vercel's 4.5 MB body limit and frees the API route).

```ts
// app/api/upload/sign/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const signRequestSchema = z.object({
  bucket: z.enum(['listing-images', 'message-attachments', 'avatars']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  contentLength: z.number().int().positive().max(10 * 1024 * 1024), // 10 MB
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = signRequestSchema.parse(await req.json());
  const ext = body.contentType.split('/')[1];
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(body.bucket)
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token });
}
```

### Client upload

```ts
async function uploadImage(file: File, bucket: 'listing-images' | 'avatars') {
  // 1. ask server for a signed URL
  const sign = await fetch('/api/upload/sign', {
    method: 'POST',
    body: JSON.stringify({ bucket, contentType: file.type, contentLength: file.size }),
    headers: { 'Content-Type': 'application/json' },
  }).then((r) => r.json());

  // 2. PUT directly to Supabase
  await fetch(sign.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'Authorization': `Bearer ${sign.token}` },
    body: file,
  });

  // 3. server-side post-processing
  await fetch('/api/upload/process', {
    method: 'POST',
    body: JSON.stringify({ bucket, path: sign.path }),
    headers: { 'Content-Type': 'application/json' },
  });

  return sign.path;
}
```

### Post-process (server)

`/api/upload/process` runs once after a successful upload — server-only, service-role client:

1. **Download** the object from Supabase Storage.
2. **EXIF strip + dimension normalize** via `sharp`:
   ```ts
   import sharp from 'sharp';
   const stripped = await sharp(buffer)
     .rotate()                    // honor EXIF orientation, then drop EXIF
     .resize({ width: 2048, withoutEnlargement: true })
     .webp({ quality: 85 })
     .toBuffer();
   ```
3. **Compute pHash** via `blockhash-core` for image-spam detection (`messages.image_hash`).
4. **Generate blurhash** for placeholder rendering: `blurhash.encode(pixels, w, h, 4, 3)`.
5. **Re-upload** under `processed/{originalPath}.webp`, **delete** the raw upload.
6. **Insert metadata row**:
   ```sql
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
   ```

### Signed read URLs

Listings store **paths**, not full URLs. Render-time conversion:

```ts
const { data } = await supabase.storage
  .from('listing-images')
  .createSignedUrl(path, 3600);  // 1h TTL — refresh on demand
```

Cache the signed URL in React Query for `<55 min` to keep below the TTL.

### Storage RLS policies

```sql
-- listing-images: owner can write under their uid prefix; anyone authed can read.
create policy "listing_images_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "listing_images_authed_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-images');

create policy "listing_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars: public read, owner write
create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- message-attachments: only conversation participants
create policy "msg_attach_participants_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'message-attachments' and exists (
      select 1 from public.messages m
      where m.image_url like '%' || storage.objects.name || '%'
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );
```

## Image limits (from source)

- **Per listing**: 3 min, 10 max (`shared/contracts.ts:listingSchema`, `mobile/src/app/(tabs)/sell.tsx`).
- **Per message**: 1 image (`shared/contracts.ts:sendMessageRequestSchema`).
- **Per file**: 10 MB pre-processing. After WebP normalization, expect <1 MB typical.

## Listing image schema impact

Source `Listing.images` is `String  // JSON array of URLs` (Prisma comment, `schema.prisma:121`). Postgres replacement:

```sql
images jsonb not null default '[]'::jsonb  -- array of storage paths, e.g. ["userid/uuid.webp", ...]
check (jsonb_array_length(images) between 3 and 10)
```

Migration note: existing legacy `/uploads/{uuid}.ext` URLs in the database need a one-time migration script that copies files from local disk into Supabase Storage and rewrites the `images` column. Since the current SQLite DB is dev-only (no production data), **DECIDE**: skip — re-upload from demo seed.

## Blurhash usage

Store on every uploaded image. Client-side render:

```tsx
import { Blurhash } from 'react-blurhash';
<Blurhash hash={meta.blurhash} width="100%" height="100%" punch={1} />
```

LCP improvement on listing detail pages.

## Image moderation (MISSING → optional V1.1)

Current code has zero NSFW detection. Options for V1.1:

- **Cloudflare AI Image Classification** (cheapest at scale).
- **Replicate / OpenAI vision** (per-image cost).
- **Manual**: route to admin queue if `fraud_score >= 50` on the listing.

V1: skip auto-moderation. Rely on user-reports + admin queue.
