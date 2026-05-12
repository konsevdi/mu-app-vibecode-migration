# 06 — Auth & Sessions

Per D7, Better Auth is replaced with **Supabase Auth** via `@supabase/ssr`.

## Identity model

- `auth.users` (Supabase-owned) holds credentials, email verification, OAuth identities.
- `public.profiles` (our table) holds app-level fields: onboarding flags, role, fraud state, language pref. Keyed by `auth.users.id` (uuid).
- Trigger `on_auth_user_created` inserts a `profiles` row when a user signs up.

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, language_pref)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'language_pref', 'el'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## Providers

| Provider | V1 | V2 |
|---|---|---|
| Email + password | ✅ | — |
| Magic link | ✅ (Supabase default) | — |
| Google OAuth | — | ✅ (env vars exist in `backend/src/auth.ts`) |
| Apple OAuth | — | optional |

Email + password is the default. Magic link is available alongside — use the same `/login` form (mode toggle).

## Session handling

`@supabase/ssr` issues two HTTP-only cookies:
- `sb-<project>-auth-token` — JWT + refresh token (encrypted).
- `sb-<project>-auth-token-code-verifier` — for PKCE callback.

Server reads them via `cookies()` in route handlers, server components, and middleware. Client refreshes through `createBrowserClient`.

### Middleware

`middleware.ts` at repo root:

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(req: NextRequest) {
  return updateSession(req);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

`lib/supabase/middleware.ts` follows the Supabase recipe: read cookies → refresh session if needed → write cookies back to response. Also redirects:
- Unauthenticated requests to `/admin/*` → `/login?next=/admin/...`.
- Authenticated user without `onboarding_completed=true` on any route except `/onboarding`, `/waitlist`, `/waitlist-success`, `/legal/*`, `/support`, `/api/*` → `/onboarding`.
- Authenticated user whose `is_eligible_city=false` on `/(marketplace)` → `/demo-browse`.

## Login page

Route: `/login`. Mirrors the existing mobile `app/login.tsx` UX but simplified to web:

- Email + password fields (Greek default copy).
- "Sign in with magic link" toggle → calls `signInWithOtp({ email })`.
- Error message shown inline (translated).
- Redirect to `?next=...` param on success, default to `/`.

## Sign-up page

Route: `/sign-up`. Fields: email, password (min 8), name (optional), language pref radio.

On success → confirmation page asking the user to verify their email. Once verified (clicked the link → `/api/auth/callback`), redirect to `/onboarding`.

## Password reset

Route: `/forgot-password` → calls `resetPasswordForEmail`. Email contains a link to `/reset-password?token=...`. The reset form calls `updateUser({ password })`.

## Sign-out

POST `/api/auth/sign-out` clears cookies and redirects to `/`.

## Role-based access

Roles live in `profiles.role`:
- `user` (default)
- `staff` — can use `/admin/listings` and `/admin/fraud` (not waitlist)
- `admin` — full `/admin/*` access

Helpers:

```ts
// lib/auth/require.ts
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/');
  }
  return { user, role: profile.role };
}
```

## Restricted mode

If `profiles.is_held=true` OR (`profiles.restricted_mode=true` AND `profiles.restricted_until > now()`), the user can sign in but **cannot**:
- Create listings (`POST /api/listings` returns 423).
- Send messages.
- Book appointments.

The UI shows a translated banner with a link to `/support`. See `11_FRAUD_AND_MODERATION.md` for triggers.

## Anonymous flows

These work without auth:
- Browse listings (`/`, `/browse`, `/listing/[id]`).
- Read translated copy.
- Submit waitlist signup.
- View `/legal/*`, `/support`.

These **require** auth:
- Create listing, edit/delete own.
- Send/receive messages.
- Book appointment.
- Use AI assistant beyond the keyword router (D4).

## Migration from Better Auth

Existing Better Auth users (if any) need to be re-onboarded. There is no programmatic migration because Better Auth's password hashes (scrypt) aren't compatible with Supabase's (bcrypt). Strategy:

1. Export existing emails from the SQLite `user` table.
2. Send them a one-time "we've migrated" email with a magic-link signup.
3. On first sign-in, Supabase creates a new `auth.users` row; the trigger seeds the profile.
4. Their old listings stay tied to the old `user.id`. **PROPOSED:** a lookup table `legacy_user_map(legacy_id, new_user_id)` so we can backfill `listings.seller_id` after each user re-signs in.

If V1 launches with zero existing real users (likely — the original was beta-only), skip the migration and start fresh.
