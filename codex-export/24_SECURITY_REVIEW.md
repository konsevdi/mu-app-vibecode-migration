# 24 — Security Review

Threat model + current state + mitigations. Read against `backend/src/lib/sanitize.ts`, `backend/src/lib/rate-limiter.ts`, `backend/src/auth.ts`, `backend/src/index.ts`, and the RLS plan in `15_SQL_MIGRATIONS.md`.

## Trust boundaries

| Boundary | Notes |
|---|---|
| Anonymous internet → Next.js | Vercel edge + middleware |
| Next.js → Supabase | Two clients: anon (RLS-bound) and service-role (server-only) |
| Next.js → Anthropic | server-only API key |
| Next.js → Resend / Missive | server-only API keys |
| Supabase Storage → user device | signed URLs (short TTL) |

The user-controlled boundary is everything in the browser, the URL, headers, and uploaded files. **Never trust** beyond that line.

## Identified risks (ranked)

### R-01 (CRITICAL) Service-role key leakage
- Source uses Better Auth — no service-role concept.
- Target uses service-role for fraud holds, token rotation, admin actions.
- **Mitigation**: service-role key only in `lib/supabase/service.ts`. Module is server-only via `import 'server-only'` directive. CI step greps for service-role usage in `'use client'` files — fails build if found. Vercel env vars: service-role marked as "encrypted" + scoped to production env only (preview uses staging key).

### R-02 (CRITICAL) RLS misconfiguration
- One wrong policy = PII bulk leak.
- **Mitigation**: Testcontainers integration tests for every policy (positive + negative). Weekly Supabase log review. Use `select set_config('request.jwt.claims', ..., true)` in tests to simulate auth.uid().

### R-03 (HIGH) Prompt injection via user input → Claude
- User can craft input that tricks the assistant into leaking PII or recommending off-platform.
- **Mitigation**: system prompt explicitly forbids these behaviors. Post-hoc regex check on assistant text for off-platform patterns; if matched, regenerate or replace. Strip control characters from input. zod-enforced 2000-char cap.

### R-04 (HIGH) Image upload as XSS vector
- SVG with embedded script; HTML masquerading as image.
- **Mitigation**: MIME allowlist excludes `image/svg+xml`. Post-process re-encodes to WebP (`sharp`) — any non-image payload fails parsing. Content-Disposition: attachment on signed-URL responses.

### R-05 (HIGH) Stored XSS via listing description / chat
- Source `sanitize.ts` provides `escapeHtml`, `stripHtml`, `detectXss`, but the current routes don't call them consistently.
- **Mitigation**: render description / chat content with **escaped output by default** (React's JSX text escaping). Never use `dangerouslySetInnerHTML` on user content. If needed for limited markdown later, use `react-markdown` with `disallowedElements=['script','iframe','style']`.

### R-06 (HIGH) CSRF on server actions
- Server actions in Next.js are POST + cookie-bound.
- **Mitigation**: Supabase cookies are `sameSite=lax`. Server actions only accept POST with same-origin Referer. Next.js 15 enforces origin matching for server actions by default — verify `experimental.serverActions.allowedOrigins` is unset (defaults to same-origin).

### R-07 (MEDIUM) Open redirect
- `next-intl` middleware redirects based on locale; auth callback redirects to `?redirectTo=` param.
- **Mitigation**: `redirectTo` must be a relative path (start with `/`, no `//`). Validate via `URL.canParse` against the site origin; otherwise default to `/`.

### R-08 (MEDIUM) Rate limit bypass via IP rotation
- Source uses in-memory Maps by IP for rate-limit — resets on every cold start.
- **Mitigation**: Upstash Redis with per-(user OR IP) keys. For waitlist signup, key by email (the real identity). For assistant, key by user_id for authed, falling back to IP for anon. Use Redis EVAL for atomic increment+TTL.

### R-09 (MEDIUM) Token enumeration
- 6-digit tokens, 1 in 1M chance per guess.
- **Mitigation**: redemption requires `(code, store_id, staff_id)` triple. Staff_id binds to authenticated staff session. Rate limit on `/api/admin/tokens/redeem` (10 attempts / minute per staff). Tokens auto-rotate every 60s, narrowing window.

### R-10 (MEDIUM) SQL injection
- Source uses Prisma (parameterized).
- **Mitigation**: target uses `@supabase/supabase-js` query builder (parameterized) and raw SQL only in migrations. `sanitize.ts:detectSqlInjection` is heuristic and not a defense — drop it.

### R-11 (MEDIUM) Sensitive data in logs
- Source console.log's `User: ${user.id}` widely.
- **Mitigation**: structured logs via `pino` with redaction config: `redact: ['*.password', '*.token', 'req.headers.cookie', 'req.headers.authorization', '*.email']`. PII never in error messages. Sentry scrubs `email`, `password`, `token` by default config + add app-specific.

### R-12 (MEDIUM) Account takeover via email change
- Supabase email change requires confirmation on both addresses by default — keep this on (`Authentication → Email change → Secure email change` = on).
- **Mitigation**: trigger on `auth.users` update — if `email` changed, set `profiles.email` AND insert audit log `user.email_changed`. Notify both old and new emails.

### R-13 (LOW) Mass-assignment in forms
- Server actions receive `FormData`.
- **Mitigation**: pick fields explicitly via zod schema — never spread `formData` into DB insert. Reject unknown keys with `.strict()` on schemas.

### R-14 (LOW) Insecure password storage
- Supabase Auth uses bcrypt (12 rounds). Not configurable, but acceptable.
- Force minimum length 8 in zod schema. **DECIDE**: require complexity? Default: length + breach check via Have I Been Pwned API at signup.

### R-15 (LOW) Image pHash collision attacks
- Adversary crafts images with same hash to bypass spam detection.
- **Mitigation**: pHash is one signal; combine with sender velocity and report count. Image spam is a soft signal anyway — flagged, not blocked.

## Headers

`next.config.mjs`:

```js
const headers = [
  { key: 'X-Frame-Options',       value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',       value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',    value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com`,  // Vercel Analytics
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https://*.supabase.co`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.resend.com`,
      `frame-ancestors 'none'`,
    ].join('; ')
  },
];
```

## Auth-side hardening

- Cookies: `httpOnly`, `secure` in prod, `sameSite=lax`, `path=/`.
- JWT expiry 1h (Supabase default).
- Refresh token TTL 30 days. Rotation enabled by default.
- Session inactivity logout at 30 days via Supabase config.
- Sign out clears both access + refresh tokens.

## Staff MFA (V1.1)

Required for `staff_role IN ('super_admin','admin','store_manager')`. Middleware checks `aal` claim:

```ts
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (isStaffRequiringMfa(user.id) && aal.currentLevel !== 'aal2') {
    redirect('/auth/mfa-required');
  }
}
```

## Storage security

- Buckets private by default. Signed URLs only.
- TTL 1h on read URLs — clients refresh.
- Owner-only writes via RLS on storage.objects.
- Post-process strips EXIF (location, device info).

## Secret management

- Vercel env vars per environment (dev/preview/production).
- GitHub Actions secrets for CI.
- Rotation schedule (every 90 days): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `MISSIVE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Calendar reminder via super_admin email.
- `.env.example` never contains real secrets — only placeholder names.

## Logging + monitoring

- Every fraud hold, account hold, strike, token redemption, admin action → audit_log
- Sentry alerts on:
  - 5xx rate > 1% over 5 min
  - Auth failure rate > 10% over 5 min (possible credential-stuffing)
  - Assistant 5xx (Anthropic outage)
- Weekly review of `auto_action_log` for anomalies

## Compliance

- GDPR Articles 15 (access) + 17 (erasure) + 20 (portability) covered by data-export and account-deletion flows.
- Privacy policy version-stamped; new sign-ups consent to current version.
- DPO: `privacy@mobileunit.gr`.
- Records of processing per Article 30.

## Penetration test

Manual pen-test scope before launch:

- Auth bypass attempts (cookie manipulation, JWT tampering)
- IDOR (try to read another user's listings via direct IDs)
- RLS bypass (force service-role from client)
- Mass-assignment (extra fields in FormData)
- Storage RLS bypass (try to read another user's bucket path)
- XSS in listing description, chat, profile name
- Open redirect on auth callback
- Rate-limit bypass via IP rotation / X-Forwarded-For spoofing

Tooling: Burp Suite Community, ZAP. Schedule day 25 of the 4-week plan (3 days before launch).

## Incident response

Three severities:

- **Sev 1** — data leak or unauth access: pull DB read traffic, rotate service-role + JWT keys, notify users within 72h (GDPR), incident doc within 24h
- **Sev 2** — broken core flow (auth, sell, chat): rollback last deploy, hotfix, post-mortem within 48h
- **Sev 3** — minor bug: standard ticket queue

Runbook lives in `RUNBOOK.md` (created post-launch).
