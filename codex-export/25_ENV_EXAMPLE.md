# 25 — Environment Variables

All variables documented. `.env.example` checked in alongside this file.

Naming convention: `NEXT_PUBLIC_*` exposed to browser bundle; everything else server-only.

## Required (production)

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | client + server | e.g. `https://mobileunit.gr`. Used for OG/canonical/email link generation |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | RLS-bound anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Never exposed to client. Used in `lib/supabase/service.ts` |
| `SUPABASE_JWT_SECRET` | server only | Verifying webhook signatures from Supabase |
| `ANTHROPIC_API_KEY` | server only | Claude assistant |
| `ANTHROPIC_MODEL` | server only | default `claude-haiku-4-5-20251001` |
| `RESEND_API_KEY` | server only | transactional email |
| `RESEND_FROM` | server only | e.g. `Mobile Unit <noreply@mobileunit.gr>` |
| `UPSTASH_REDIS_REST_URL` | server only | rate-limiting |
| `UPSTASH_REDIS_REST_TOKEN` | server only | rate-limiting |
| `SENTRY_DSN` | server + client | error tracking; client gets it via `NEXT_PUBLIC_SENTRY_DSN` mirror |
| `NEXT_PUBLIC_SENTRY_DSN` | client | mirrored for browser SDK |

## Optional (graceful fallback)

| Variable | Default behaviour if missing |
|---|---|
| `MISSIVE_API_KEY` | fraud alerts log only — no Missive draft |
| `MISSIVE_ORG_ID` | as above |
| `NEXT_PUBLIC_VERIFICATION_LABEL` | defaults to `"iRepair"` |
| `NEXT_PUBLIC_PANDAS_PRICING_URL` | defaults to `https://pandas.io/pricing` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | defaults to `el` |
| `STRIPE_SECRET_KEY` | V1 unused; reserve name for V2 |

## OAuth (V1.1)

| Variable | Notes |
|---|---|
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | configured in Supabase Dashboard, not directly used by Next.js |
| `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` | as above |
| `SUPABASE_AUTH_APPLE_CLIENT_ID` | V1.2 |
| `SUPABASE_AUTH_APPLE_CLIENT_SECRET` | V1.2 |

The actual values are entered in the Supabase dashboard under Auth → Providers. The Next.js app uses `supabase.auth.signInWithOAuth({ provider: 'google' })` and the redirect is handled by Supabase. No client secrets in the Next.js env.

## CI-only (GitHub Actions secrets)

| Variable | Notes |
|---|---|
| `CHROMATIC_PROJECT_TOKEN` | visual regression |
| `VERCEL_TOKEN` | optional — Vercel deploy from CI |
| `SUPABASE_ACCESS_TOKEN` | `supabase db push` in CI |
| `SUPABASE_DB_PASSWORD` | direct DB access for integration tests |

## Source → target mapping

| Source `backend/src/env.ts` | Target |
|---|---|
| `PORT` | NOT NEEDED — Vercel handles |
| `NODE_ENV` | Vercel sets automatically |
| `DATABASE_URL` (SQLite file path) | REPLACED — Supabase managed |
| `BETTER_AUTH_SECRET` | NOT NEEDED — Supabase Auth owns secrets |
| `BACKEND_URL` | REPLACED by `NEXT_PUBLIC_SITE_URL` |
| `GOOGLE_CLIENT_ID/SECRET` (commented out) | Moved to Supabase Auth dashboard |

## Environment matrix

| Variable | dev | preview | production |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://*.preview.mobileunit.gr` | `https://mobileunit.gr` |
| `NEXT_PUBLIC_SUPABASE_URL` | local Supabase | staging project | prod project |
| `SUPABASE_SERVICE_ROLE_KEY` | local key | staging key | prod key (encrypted) |
| `ANTHROPIC_API_KEY` | dev key (no rate limit) | dev key | prod key |
| `RESEND_FROM` | `noreply@dev.mobileunit.gr` | `noreply@preview.mobileunit.gr` | `noreply@mobileunit.gr` |
| `UPSTASH_REDIS_REST_URL` | local instance OR shared dev | shared staging | dedicated prod |
| `SENTRY_DSN` | dev project | preview project | prod project |
| `NEXT_PUBLIC_VERIFICATION_LABEL` | `iRepair` | `iRepair` | `iRepair` |

## Local development setup

```bash
cp .env.example .env.local
# Fill in your local Supabase URL/keys (from `supabase status`)
# Set ANTHROPIC_API_KEY to your dev key
# Leave MISSIVE_API_KEY blank → fraud alerts are no-op
npm run dev
```

## Validation

`lib/env.ts` validates with zod at module load:

```ts
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SITE_URL:           z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL:       z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY:  z.string().min(32),
  SUPABASE_SERVICE_ROLE_KEY:      z.string().min(32),
  ANTHROPIC_API_KEY:              z.string().min(20),
  ANTHROPIC_MODEL:                z.string().default('claude-haiku-4-5-20251001'),
  RESEND_API_KEY:                 z.string().min(20),
  RESEND_FROM:                    z.string().min(5),
  UPSTASH_REDIS_REST_URL:         z.string().url(),
  UPSTASH_REDIS_REST_TOKEN:       z.string().min(20),
  MISSIVE_API_KEY:                z.string().optional(),
  MISSIVE_ORG_ID:                 z.string().optional(),
  SENTRY_DSN:                     z.string().optional(),
  NEXT_PUBLIC_VERIFICATION_LABEL: z.string().default('iRepair'),
  NEXT_PUBLIC_PANDAS_PRICING_URL: z.string().url().default('https://pandas.io/pricing'),
  NEXT_PUBLIC_DEFAULT_LOCALE:     z.enum(['el','en']).default('el'),
});

export const env = schema.parse(process.env);
```

Fail-fast at boot; surface clear missing-key errors.
