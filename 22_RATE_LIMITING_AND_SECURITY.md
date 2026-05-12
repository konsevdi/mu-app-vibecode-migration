# 22 — Rate Limiting and Security

## Threat model

Mobile Unit is a marketplace with chat. Top risks:

1. **Scam listings** — sellers post fake devices, demand off-platform payment.
2. **Chat phishing** — sellers push WhatsApp/Viber, then payment fraud.
3. **Waitlist abuse** — bots inflate referral counts.
4. **AI assistant abuse** — token-cost burn via repeated queries.
5. **Account takeover** — credential stuffing via Greek leak DBs.
6. **Image upload abuse** — storage flood, malware embedded in EXIF, etc.

The fraud + moderation systems in `11_FRAUD_AND_MODERATION.md` address (1) and (2). This document covers infra-level controls.

## Rate limiting

Library: **Upstash Ratelimit** + Upstash Redis.

```ts
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const limiters = {
  // Auth: 10 attempts / 10 min / IP
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10 m'), prefix: 'rl:auth' }),
  // Waitlist: 5 signups / hour / IP
  waitlist: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'rl:waitlist' }),
  // Listings: 10 new listings / hour / user
  createListing: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:listing' }),
  // Messages: 30 messages / minute / user
  message: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:msg' }),
  // Assistant: 50 / hour / user (or IP if anon)
  assistant: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50, '1 h'), prefix: 'rl:ai' }),
  // Reports: 5 reports / hour / user
  report: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'rl:rep' }),
  // Upload signed URL: 60 / hour / user
  upload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 h'), prefix: 'rl:up' }),
};

export async function limitOrReject(name: keyof typeof limiters, key: string) {
  const { success, limit, remaining, reset } = await limiters[name].limit(key);
  if (!success) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      },
    });
  }
  return null;
}
```

Each API route calls this with a key — typically `userId` for authed routes, IP (`req.headers.get('x-forwarded-for')?.split(',')[0]`) for anon.

## Auth security

- **Email + password** with Supabase Auth. Minimum 8 chars enforced server-side; passwords are bcrypt'd by Supabase.
- **Email confirmation required** before sign-in. Magic-link disabled V1.
- **JWT** stored in HttpOnly cookies via `@supabase/ssr`. No `localStorage` JWTs.
- **Session refresh** every request via middleware — refresh tokens stored in cookies, rotated.
- **OAuth** state parameter verified server-side (Supabase handles).
- **2FA** (TOTP) — Supabase MFA is GA; **PROPOSED** for staff accounts in V1, all users V1.1.

## Account takeover defenses

1. Rate limit auth at 10/10min/IP (above).
2. **Have I Been Pwned** check on sign-up — block known-leaked passwords. Use `@have-i-been-pwned/range` k-anonymity API server-side, hashed prefix only.
3. **Suspicious login email** — when a session is created from a new IP/country, send an email. Supabase doesn't ship this; implement via DB webhook on `auth.sessions` insert.
4. **Geo-blocking** for staff routes — admin endpoints only accept Greek/EU IPs (V1.1).

## CSRF

Next.js Server Actions are CSRF-protected by Next (origin header check). Route handlers (`route.ts`) called from same-origin via the `lib/api-client.ts` wrapper send a `X-Origin-Check` header that route handlers verify against `process.env.NEXT_PUBLIC_APP_DOMAIN`. Defense-in-depth alongside SameSite=Lax cookies.

## CORS

`/api/*` routes accept only same-origin requests by default. Add an explicit allow-list for documented public endpoints (none in V1).

```ts
// app/api/*/route.ts
const ALLOWED = [`https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`];
const origin = req.headers.get('origin');
if (origin && !ALLOWED.includes(origin)) return new Response('forbidden', { status: 403 });
```

## Cookie consent (GDPR)

Mandatory for Greek users. Three categories:

1. **Strictly necessary** — Supabase session, locale preference, CSRF. No consent needed.
2. **Analytics** — PostHog. Consent required.
3. **Marketing** — none V1. Reserved for V2 (Stripe Link, retargeting pixels).

Library: **CookieConsent** (`cookieconsent.orestbida.com`) — vanilla JS, ~12KB, localized. Translations stored alongside `messages/*.json`. Block analytics scripts until consent fired.

## CSP

Strict Content-Security-Policy via `next.config.mjs` headers:

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy', value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://eu.i.posthog.com https://*.sentry.io",
        "img-src 'self' data: blob: https://*.supabase.co https://maps.googleapis.com https://*.googleusercontent.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.i.posthog.com https://*.sentry.io https://api.anthropic.com",
        "frame-src https://www.google.com",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ') },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ],
  }];
}
```

`'unsafe-inline'` for scripts is a Next 15 / streaming requirement. Tighten via nonces when feasible (PROPOSED V1.1).

## Input validation

Every API route validates the body with the corresponding zod schema from `shared/contracts.ts`. Validation failures return `400` with field-level errors. Never trust `req.body` without parsing — TypeScript types do not enforce shape at runtime.

```ts
const parsed = CreateListingSchema.safeParse(await req.json());
if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
```

## File upload safety

- Signed-URL pattern (Supabase Storage). The route handler issues a signed upload URL for a specific path; client uploads directly. Server never proxies bytes.
- Enforce content-type at signed-URL issuance: `['image/jpeg', 'image/png', 'image/webp']`.
- Enforce max size: 5MB per file (set at bucket policy + client-side check).
- **Strip EXIF** on the client before upload (privacy + small attack surface). Use `browser-image-compression` or a custom canvas-redraw step.
- After upload, verify the file with `image-size` server-side. Reject zero-byte or non-image files (Supabase does basic mime sniffing too).

## Off-platform contact detection

Source has `lib/moderation/` patterns to flag URLs and contact numbers in chat. Patterns (regex, VERBATIM):

- URL: `/(https?:\/\/|www\.)\S+/i`
- Phone-ish: `/[\+\(]?\d[\d\s\-\(\)]{6,}/`
- Greek phone: `/(\+30|0030)?\s*\d{10}/`
- IBAN-ish: `/\b[A-Z]{2}\d{2}[A-Z0-9]{4,}\b/i`
- Common keywords: `/(viber|whatsapp|telegram|signal|messenger|venmo|paypal|revolut|iban)/i`

Hits don't auto-delete — they raise `flagged_reason` on the message, increment fraud score, and surface to the moderator queue. See `11_FRAUD_AND_MODERATION.md`.

## Secret rotation

- Anthropic, Resend, Missive keys: rotate annually or on staff offboarding. Document in OPERATIONS.md.
- Supabase JWT secret: rotation breaks all existing sessions — only do during planned maintenance.
- Service role key: never commit, never expose to browser, rotate immediately if leaked.

## Audit logging

Every privileged action writes an `audit_log` row. See `04_DATA_MODEL.md`. Includes actorId, action, entity, IP, timestamp, JSON details. Keep audit log for 2 years (GDPR — legitimate-interest basis).

## Data retention + GDPR rights

| Data | Retention |
|---|---|
| User account (post-deletion request) | 30-day soft-delete grace, then hard delete |
| Listings | 12 months after marked sold/inactive |
| Messages | 24 months (Greek consumer protection retention) |
| Audit log | 24 months |
| Fraud holds (resolved) | 36 months (anti-recidivism) |
| Waitlist entries | until launch in their city, then 6 months |

**Right to access**: user-facing `/profile/data-export` endpoint emits a JSON archive of all rows where userId = me, signed and emailed.

**Right to erasure**: `/profile/delete-account` enqueues soft-deletion; admin reviews holds first, then hard delete. Replaces personal fields with `[deleted]` markers on join records (messages, audit log) — retains the row for the recipient's history.

**DPO contact**: `dpo@APP_DOMAIN` — listed in legal page.

## Logging hygiene

- Never log: passwords (obvious), JWTs, full email bodies, image content, Supabase service-role key.
- Mask in logs: email → `u***@domain`, phone → last 4 digits, IP → /24 mask after 7 days.
- Sentry scrubs PII by default. Verify it covers our custom fields.

## Honeypot fields

Waitlist form has a hidden `website` field. If filled, silently 200 the response without persisting. Cuts ~95% of bot signups for free.

```tsx
<input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden />
```

## hCaptcha — PROPOSED V1.1

When bot pressure on waitlist or auth exceeds rate-limit's effectiveness, add hCaptcha (EU-friendly alternative to Google reCAPTCHA). Token verified server-side before persisting.

## Outbound webhook signing

Any webhook we **send** (none in V1; V2 will when partner stores get inspection notifications) is signed HMAC-SHA256 with a shared secret in the `X-Mobile-Unit-Signature` header. Consumers verify before processing.

## Incident response

1. Detect (Sentry alert, Supabase webhook, manual report).
2. Triage in Slack `#trust-and-safety`.
3. If user-impacting: status page + email comms within 1 hour.
4. Post-mortem in shared doc within 5 working days. Action items tracked in Linear.

Status page: PROPOSED — use `status.APP_DOMAIN` powered by Vercel's built-in status or a simple static page that ingests from Better Uptime.
