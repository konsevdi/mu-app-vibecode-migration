# 21 — Third-party Integrations

External services Mobile Unit depends on, and how to wire each one.

## Anthropic Claude (AI Assistant)

**Use case**: `/api/assistant` route powers the AI assistant widget. Greek-first responses, listings-grounded.

**Model**: `claude-haiku-4-5-20251001` for V1 (cost + latency). Promote to `claude-sonnet-4-6` if quality is insufficient. Streaming required.

**SDK**: `@anthropic-ai/sdk` v0.30+.

```ts
// app/api/assistant/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
export const runtime = 'edge';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  const { messages, locale } = await req.json();
  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      { type: 'text', text: SYSTEM_PROMPT[locale], cache_control: { type: 'ephemeral' } },
      { type: 'text', text: GROUNDING_FACTS, cache_control: { type: 'ephemeral' } },
    ],
    messages,
  });
  return new Response(stream.toReadableStream());
}
```

Prompt-caching the system + grounding facts (decision D5) cuts token cost ~80% on subsequent turns. The prompt is documented VERBATIM in `12_AI_ASSISTANT.md`.

**Env vars**:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Rate limits**: 50 requests / IP / hour, enforced via Upstash (`22_RATE_LIMITING_AND_SECURITY.md`).

## Resend (Transactional Email)

**Use case**: all transactional email — auth confirmation, waitlist confirm, appointment confirm, listing approved/rejected, password reset, fraud-hold notify.

Configure Resend as Supabase's custom SMTP **and** call the Resend API directly for non-auth emails (listing approved, etc.) so we own the templates.

```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY!);
await resend.emails.send({
  from: 'Mobile Unit <noreply@mobile-unit.example>',
  to: user.email,
  subject: locale === 'el' ? 'Η αγγελια σου εγκριθηκε' : 'Your listing is approved',
  react: ListingApprovedEmail({ listing, locale }),
});
```

Email templates live in `emails/` and use `@react-email/components`. Bilingual — accept `locale: 'el' | 'en'` prop.

**Env vars**:

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@mobile-unit.example
```

**Domain setup**: verify `mobile-unit.example` in Resend dashboard, add SPF / DKIM / DMARC records to DNS.

## Supabase

Covered in `19_SUPABASE_SETUP.md` — Auth, Postgres, Storage, Realtime.

## Map provider

`MAP_PROVIDER` placeholder. Two options:

1. **Google Maps Embed API** (V1 recommended) — no key needed for plain iframe embeds with `q={lat},{lng}`. Free, no SDK, no GDPR consent overhead. Used on store cards + listing pickup hint.

   ```tsx
   <iframe
     src={`https://www.google.com/maps?q=${store.lat},${store.lng}&output=embed`}
     loading="lazy" allowFullScreen
   />
   ```

2. **Mapbox GL JS** (V1.1 / V2) — if interactive maps with custom markers needed (multi-store browse). Requires public token.

   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
   ```

For now: use embed. Add Mapbox when the second store opens.

## Pandas pricing

External URL only — no SDK. Open in new tab from the sell screen pricing hint:

```
PANDAS_PRICING_URL=https://pricing-v2.pandas.io/el-GR/irepair/smartphone
```

This is a marketing partnership link, not an API. Keep as environment variable.

## Missive (admin / fraud workflow)

**Use case**: when a fraud hold is created, dispatch a draft to Missive for an admin to action. The Vibecode source references `missiveDraftId` on `FraudHold` — port this.

```ts
const res = await fetch('https://public.missiveapp.com/v1/drafts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.MISSIVE_API_KEY!}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    drafts: {
      subject: `FRAUD HOLD: ${entityType} ${entityId}`,
      body: details,
      to_fields: [{ name: 'Trust & Safety', address: 'fraud@mobile-unit.example' }],
      organization: process.env.MISSIVE_ORG_ID,
      conversation: { team: process.env.MISSIVE_TRUST_TEAM_ID },
    },
  }),
});
const { id } = (await res.json()).drafts[0];
// store id as missiveDraftId
```

**Env vars**:

```
MISSIVE_API_KEY=mvr_...
MISSIVE_ORG_ID=...
MISSIVE_TRUST_TEAM_ID=...
```

Optional for V1 if no Missive subscription — fall back to Resend email to `fraud@APP_DOMAIN`.

## PostHog (Analytics) — PROPOSED

EU-hosted PostHog Cloud (`eu.posthog.com`). Free up to 1M events/month. Use for funnel analysis (waitlist → onboarding → first listing).

```
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Wrap in `lib/analytics.ts` with a no-op fallback when key is missing, so dev / preview don't pollute prod events.

GDPR: provide cookie consent (see `22_RATE_LIMITING_AND_SECURITY.md` cookie consent section). Don't load PostHog until user accepts analytics.

## Sentry

Error tracking on web + API routes.

```
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...    # for source map upload at build time
SENTRY_ORG=mobile-unit
SENTRY_PROJECT=web
```

Setup via `@sentry/nextjs` wizard: `bunx @sentry/wizard@latest -i nextjs`. Set traces sample rate to 0.1 (10%) in prod, 1.0 in dev.

## Stripe (V2 — not V1)

Not used in V1. When commerce launches (verified-listing fees, V2), add:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Mention here so it's not forgotten when scope expands.

## Push notifications

Not in V1 — V1 is web-only and users don't expect push. When the PWA installs path is added (V1.1), wire Web Push via `web-push` package. Mobile (Expo) reintroduction → use Expo Push (V2).

## SMS

Not in V1. Once Greek SMS pricing is acceptable (Vonage / Twilio + Greek operator markup is steep), add for 2FA + appointment reminders. Track as PROPOSED in `26_OPEN_QUESTIONS.md`.

## Upstash Redis

Rate-limiting + (V2) Bull queue. Free tier covers V1.

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Used by `lib/rate-limit.ts` — see `22_RATE_LIMITING_AND_SECURITY.md`.

## Webhooks inbox

Each integration that fires events into our system has a route handler:

```
app/api/webhooks/supabase/route.ts   — Supabase DB webhooks (HMAC verified)
app/api/webhooks/resend/route.ts     — bounce / spam-report events
app/api/webhooks/stripe/route.ts     — V2
```

Each verifies the signature before processing. Reject anything that fails verification with `401`.

## Environment variable summary

Consolidated `.env.example` (paste into repo):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_PROJECT_REF=
DATABASE_URL=
DIRECT_URL=

# Auth
NEXTAUTH_URL=https://APP_DOMAIN

# Anthropic
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@mobile-unit.example

# Missive (optional V1)
MISSIVE_API_KEY=
MISSIVE_ORG_ID=
MISSIVE_TRUST_TEAM_ID=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=
PANDAS_PRICING_URL=https://pricing-v2.pandas.io/el-GR/irepair/smartphone

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Branding
NEXT_PUBLIC_APP_NAME=Mobile Unit
NEXT_PUBLIC_APP_DOMAIN=mobile-unit.example
NEXT_PUBLIC_SUPPORT_EMAIL=support@mobile-unit.example
NEXT_PUBLIC_PARTNER_NAME=iRepair
NEXT_PUBLIC_DEFAULT_LOCALE=el
NEXT_PUBLIC_CURRENCY=EUR

# Environment marker
NEXT_PUBLIC_ENVIRONMENT=development   # development | preview | staging | production
```
