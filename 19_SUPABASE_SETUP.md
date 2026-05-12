# 19 — Supabase Setup

Per decision **D7** and **D11**, the rebuild uses **Supabase** for Postgres, Auth, Storage, and Realtime. No Prisma, no Better Auth.

## Project provisioning

1. Create a Supabase project at https://supabase.com/dashboard. Region: **EU West (Ireland, `eu-west-1`)** — closest to Greece + GDPR-friendly.
2. Plan: **Pro** for V1 (point-in-time recovery, custom domains, no project pausing). Free works for staging only.
3. Two projects: `mobile-unit-prod` and `mobile-unit-staging`. Never push to prod directly — staging is the gate.
4. Custom SMTP: configure via Resend (see `21_THIRD_PARTY_INTEGRATIONS.md`) so auth/transactional emails come from `noreply@APP_DOMAIN`.

## Environment variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...           # NEVER expose to browser
SUPABASE_JWT_SECRET=...                      # for verifying tokens server-side
SUPABASE_PROJECT_REF=xxxxx                   # for CLI
DATABASE_URL=postgres://postgres:...@aws-0-eu-west-1.pooler.supabase.com:6543/postgres   # connection pooler for runtime
DIRECT_URL=postgres://postgres:...@db.xxxxx.supabase.co:5432/postgres                    # direct for migrations
```

`DATABASE_URL` uses the pooler (port 6543, transaction mode) for serverless. `DIRECT_URL` is direct (5432) for `supabase db push` / migrations only.

## Local development

Install Supabase CLI:

```bash
brew install supabase/tap/supabase     # macOS
# or via bun
bun add -d supabase
```

Bootstrap:

```bash
supabase init
supabase link --project-ref $SUPABASE_PROJECT_REF
supabase start            # starts local Postgres + Studio at :54323
```

Local URLs:

- API: `http://localhost:54321`
- DB: `postgresql://postgres:postgres@localhost:54322/postgres`
- Studio: `http://localhost:54323`
- Mailpit (email viewer): `http://localhost:54324`

Apply migrations + seed:

```bash
supabase db reset    # nukes local DB, replays migrations + seed
```

## Client modules

### `lib/supabase/server.ts` (RSC, route handlers, server actions)

```ts
import { createServerClient as create } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerClient() {
  const cookieStore = cookies();
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookies) { cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}
```

### `lib/supabase/client.ts` (browser)

```ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

### `lib/supabase/admin.ts` (server-only, service role)

```ts
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

**Never import `supabaseAdmin` from a client component.** It bypasses RLS.

### `middleware.ts` (session refresh)

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';

const intl = createIntlMiddleware({ locales: ['el','en'], defaultLocale: 'el', localePrefix: 'always' });

export async function middleware(req: NextRequest) {
  const res = intl(req);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );
  await supabase.auth.getUser();
  return res;
}

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
```

## Auth providers

Enable in Supabase Dashboard → Authentication → Providers:

1. **Email + password** — primary. Confirm-email enabled.
2. **Apple OAuth** — required for iOS handoff once mobile is reintroduced (PROPOSED for V1.1).
3. **Google OAuth** — optional V1.
4. Magic link disabled for V1 (Greek SMS cost). Re-enable later if needed.

Email templates (Auth → Email Templates) — localized via Resend, not Supabase's templates. Send a webhook from auth events into our own `app/api/auth/webhook/route.ts` to dispatch the right localized template.

## Storage buckets

Create three buckets:

| Bucket | Public? | Purpose |
|---|---|---|
| `listings` | public (read) | listing photos (`STORAGE_BUCKET_LISTINGS`) |
| `chat` | private | chat image attachments |
| `inspections` | private | inspection photos + grade reports |

For `listings` — public-read so `next/image` can fetch unauthed. RLS on uploads:

```sql
create policy "Authenticated users can upload to listings"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listings'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

This forces all uploads under `listings/{userId}/...`. Combined with file-naming `listings/{userId}/{listingId}/{uuid}.jpg`, ownership is clear.

For `chat`:

```sql
create policy "Users can upload chat images they send"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Conversation participants can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'chat'
  and exists (
    select 1 from messages m
    where m.image_url like '%' || name
      and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  )
);
```

## Image transforms

Supabase Image Transformation API: `?width=…&height=…&quality=…&resize=cover`. Use it via a `next/image` custom loader so we keep the standard `<Image>` API.

```ts
// lib/supabase/image-loader.ts
export default function supabaseLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const url = new URL(src);
  url.searchParams.set('width', String(width));
  url.searchParams.set('quality', String(quality ?? 75));
  return url.toString();
}
```

`next.config.mjs`:

```js
images: {
  loader: 'custom',
  loaderFile: './lib/supabase/image-loader.ts',
  remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
}
```

## Realtime

V1 use cases:

1. Chat — subscribe to `messages` filtered by `conversation_id`.
2. Listing status changes — buyer/seller see `pending → approved` live.
3. Appointment status — useful for staff dashboard (V2).

Enable RLS-aware Realtime:

```sql
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table listings;
alter publication supabase_realtime add table appointments;
```

Client subscription pattern:

```ts
const channel = supabase.channel(`conversation:${id}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
    (payload) => queryClient.setQueryData(['messages', id], (old: Message[] = []) => [...old, payload.new as Message])
  )
  .subscribe();
```

## RLS strategy

**Every table has RLS enabled.** Default deny. See `04_DATA_MODEL.md` for per-table policies — they're co-located with the schema. Two helper functions:

```sql
create or replace function public.has_role(roles text[])
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = any (roles)
  );
$$;

create or replace function public.is_staff_at_store(store_id text)
returns boolean language sql security definer as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and store_id = $1 and is_active = true
  );
$$;
```

Use these in policies to avoid repeating subqueries.

## Connection pooling

Vercel functions are stateless — never connect direct on port 5432 from runtime. Always use the **transaction-mode pooler** on 6543. The `@supabase/supabase-js` HTTP client handles this transparently; only matters if a route uses `pg` directly (e.g. `scripts/seed.ts` should use direct connection).

## Backups

Pro plan: daily backups + 7-day PITR. Enable in Dashboard → Database → Backups. Also wire a weekly logical dump to S3 (see `20_CI_CD.md`).

## Health monitoring

Hook Supabase → Slack via Database Webhooks for:

- New waitlist signup
- New listing pending review
- New fraud hold
- High-fraud-score user created

`app/api/webhooks/supabase/route.ts` validates HMAC and dispatches.

## Migrating from SQLite

See `23_MIGRATIONS_FROM_PRISMA_SQLITE.md` — covers schema translation, data import (if applicable), and gotchas (SQLite `Json String` → Postgres `jsonb`, `Float` → `numeric`).

## Common gotchas

- **`auth.uid()` returns `null` in server actions if cookies didn't propagate.** Always go through `createServerClient()` from `lib/supabase/server.ts`, which wires cookies correctly.
- **Realtime needs the publication explicitly added** for each table. Easy to forget — channel just goes silent.
- **Storage URLs are public if the bucket is public**, even with RLS — RLS controls writes/listing, not the URL itself. Don't store sensitive PII in the `listings` bucket.
- **JWT expiry default is 1 hour**. The middleware refresh handles renewal but only fires on requests. Long-idle tabs need a client-side `onAuthStateChange` listener for refresh.
