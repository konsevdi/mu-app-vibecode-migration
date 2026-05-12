# 08 — Auth and Session Export

## Current implementation

`backend/src/auth.ts` (55 lines) — Better Auth, Prisma adapter, Expo plugin:

```ts
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,             // ≥32 chars, enforced by env.ts
  baseURL: env.BACKEND_URL,
  plugins: [expo()],
  trustedOrigins: [
    "vibecode://",
    "http://localhost:3000",
    "http://localhost:8081",
    "*.vibecodeapp.com",
    "*.share.sandbox.dev",
    "*.vibecode.dev",
    "*.vibecode.run",
    env.BACKEND_URL,
  ],
  emailAndPassword: { enabled: true },
  advanced: { crossSubDomainCookies: { enabled: true } },
});
```

Endpoints exposed:
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET  /api/auth/session`

Mobile client `mobile/src/lib/authClient.ts`:

```ts
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL as string,
  plugins: [
    expoClient({
      scheme: "vibecode",
      storagePrefix: process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID as string,
      storage: SecureStore,
    }),
  ],
  fetchOptions: { credentials: "include" },
});
```

OAuth providers — commented out in `env.ts:22-23`:

```ts
// GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
// GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
```

So in source today: **email/password only**, no OAuth, no MFA, no password reset UI (Better Auth provides the endpoint, the mobile app never built the screen).

## Tables that disappear

These three Prisma models exist solely to back Better Auth. Drop entirely in the rebuild — Supabase Auth owns them.

```prisma
model Session     { id, expiresAt, token (unique), userId, ipAddress?, userAgent?, ... }
model Account     { id, accountId, providerId, userId, accessToken?, refreshToken?, idToken?, ..., password? }
model Verification{ id, identifier, value, expiresAt, ... }
```

## Target — Supabase Auth

Replace Better Auth wholesale. Use `@supabase/ssr` for Next.js 15 App Router.

### Server client

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
    },
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // server-only
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} } },
  );
}
```

### Browser client

```ts
// lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

### Middleware (session refresh)

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  await supabase.auth.getUser(); // refreshes the session
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/callback).*)'],
};
```

## Endpoint mapping

| Better Auth (current) | Supabase Auth (target) |
|---|---|
| `POST /api/auth/sign-up/email` | server action: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })` |
| `POST /api/auth/sign-in/email` | `supabase.auth.signInWithPassword({ email, password })` |
| `POST /api/auth/sign-out` | `supabase.auth.signOut()` |
| `GET /api/auth/session` | `supabase.auth.getUser()` server-side, `supabase.auth.getSession()` client-side |
| (none — MISSING in source) | `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password/confirm' })` |
| OAuth (MISSING in source) | `supabase.auth.signInWithOAuth({ provider: 'google' \| 'apple' })` |

## Profile row creation

Supabase Auth creates `auth.users` automatically. The app needs a `public.profiles` row keyed 1:1. Use a Postgres trigger:

```sql
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, handle, language_pref)
  values (new.id, new.email, split_part(new.email, '@', 1), 'el')
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Onboarding fields (`onboarding_completed`, `selected_city`, `selected_country`, `is_eligible_city`, `language_pref`) update via `PATCH /api/users/onboarding` → server action that writes to `public.profiles`.

## Session expiry / refresh

Supabase tokens — access token TTL 1 hour, refresh token TTL 30 days (Supabase default). The middleware above refreshes silently. Set the cookie `sameSite=lax`, `secure` in production, `httpOnly=true` — `@supabase/ssr` does this by default.

## Trusted origins (CORS)

Better Auth had a hard-coded list including `vibecode://`, `*.share.sandbox.dev`, etc. Drop these. In Supabase:

- **Dashboard → Authentication → URL Configuration**:
  - `Site URL = https://mobileunit.gr` (production)
  - `Additional Redirect URLs`:
    - `https://*.preview.mobileunit.gr` (Vercel previews)
    - `http://localhost:3000` (dev)
  - `JWT expiry = 3600` (1 h)

## Account deletion (MISSING → rebuild)

GDPR right-to-erasure. Source has no UI. Implement:

1. `/[locale]/profile/delete` page with a confirmation flow (type "DELETE" to confirm).
2. Server action: soft-delete (30-day grace) — set `profiles.deleted_at = now()`, anonymize email to `deleted+{user_id}@deleted.mobileunit`, scrub `name`/`image`, mark listings inactive, retain audit logs.
3. Background job (`pg_cron` daily): hard-delete profiles with `deleted_at < now() - 30 days`, cascade to `auth.users` via service-role.

## Data export (MISSING → rebuild)

GDPR right-of-access. `/[locale]/profile/data-export` triggers a server route that compiles:

- profile row
- listings (own)
- messages (own + counterparty handles, NOT emails)
- appointments (own)
- waitlist_signups (own)
- chat_reports filed by user

Returns a downloadable JSON archive. Throttle: max 1 export/24h per user.

## MFA (PARTIAL → optional V1.1)

Supabase MFA GA — for staff (any user with a `staff` row whose `role <> 'moderator'`), make MFA required. Use `supabase.auth.mfa.enroll({ factorType: 'totp' })` flow on first login if `staff.role IN ('admin','super_admin','store_manager')` and `aal < 'aal2'`.

For regular users: optional in V1, prompted in V1.1.

## Session columns to drop / replace

The current `User` model holds session-adjacent state on the user row (`fraudScore`, `isHeld`, `restrictedMode`, `restrictedUntil`, `tokensDisabled`). These move to `profiles`. Auth state lives in `auth.users` only.
