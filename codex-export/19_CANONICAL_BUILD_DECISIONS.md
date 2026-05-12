# 19 — Canonical Build Decisions

Locked decisions for the rebuild. Every item below is fixed unless explicitly marked DECIDE — those are open and need product/eng sign-off before V1 ships.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 App Router** | RSC first; server actions; built-in routing/middleware |
| Language | **TypeScript strict** | Inherited from source; non-negotiable |
| Runtime | **Node 22** on Vercel | aligns with Next 15 LTS; serverless functions |
| Database | **Supabase Postgres 15+** | Hosted; ships with Auth/Storage/Realtime/pg_cron |
| Auth | **Supabase Auth** | Email/password V1; OAuth (Google/Apple) V1.1; MFA V1.1 staff-only |
| Storage | **Supabase Storage** | Signed URLs, RLS policies |
| Realtime | **Supabase Realtime** | Replace 3s/10s polling for messages and tokens |
| Cron | **pg_cron** | Token rotation 60s; no external scheduler |
| Styling | **Tailwind v4** + **shadcn/ui** | Drop NativeWind; shadcn for components |
| Forms | **react-hook-form + zod** | Shared schema with backend |
| Server state | **React Query** | Already in source; keep |
| Local state | **Zustand** | Already in source; keep for client UI state only |
| i18n | **next-intl** | App Router native; replaces Zustand-based language store |
| Icons | **lucide-react** | Same set as source, web variant |
| Email | **Resend + React Email** | Welcome, listing approval, fraud alerts (Missive fallback) |
| Notifications | **Missive API** | Already wired in source — keep contract |
| Rate limit | **Upstash Redis** | Replace in-memory Maps; serverless-safe |
| AI | **Anthropic claude-haiku-4-5** | Replace mocked assistant; stream via SSE |
| Hosting | **Vercel** | First-class Next 15 + cron + edge |
| CI | **GitHub Actions** | Lint, typecheck, test, Storybook, chromatic, supabase db lint |

## Versioning

- Node 22, npm preferred over bun/yarn for Vercel compatibility (source uses bun — switch).
- `package.json` `engines.node = "22.x"`.
- Strict lockfile (`npm ci` in CI).

## Architectural principles

1. **Server-first.** Default to RSC. `'use client'` only when state/effects required.
2. **Mutations via server actions.** Route handlers reserved for: signed-URL minting, public anon endpoints (waitlist), webhooks, streaming responses, admin endpoints invoked by URL.
3. **Zod for every boundary.** Same schema serializes both directions.
4. **RLS as primary auth.** Service-role client used only in route handlers that have explicit role checks. Never expose service-role key to client.
5. **Idempotency.** All POST mutations accept `Idempotency-Key` header.
6. **Pagination = cursor.** Never offset.
7. **No ORM.** Use `@supabase/supabase-js` query builder. Prisma's value (typed client) replaced by generated Supabase types via `supabase gen types typescript`. This avoids Prisma + Supabase RLS friction.
8. **No background queues in V1.** All async work via pg_cron OR inline. Add BullMQ + Redis if/when needed.

## Multi-locale routing

- `/` redirects to user's `language_pref` cookie or `Accept-Language` header (default `el`).
- Pages live under `/[locale]/...`.
- Sitemap and OG tags localized.

## Branding

- **Product name**: Mobile Unit. Wordmark uppercase Latin.
- **Partner**: iRepair (label literal `"iRepair"` — `VERIFICATION_LABEL` constant). White-label-ready via env var `NEXT_PUBLIC_VERIFICATION_LABEL`.
- **Domain**: `mobileunit.gr` (production). Vercel previews under `*.preview.mobileunit.gr`.

## Greek typography rule

UPPERCASE Greek strings strip all accents. CI lint enforces (see `10_I18N_COPY_EXPORT.md`).

## Trust model

Verified after **2 trust events**. Hard-coded in source — keep. The constant `MIN_TRUST_EVENTS_FOR_VERIFIED = 2` lives in `lib/verification.ts`.

## Open decisions (DECIDE before V1)

| # | Question | Default if no sign-off |
|---|---|---|
| 1 | Tighten listing description from 2000 to 1500 chars? | 1500 (lower friction for moderation) |
| 2 | Cap referral position bonus at +30? | Yes (10 valid referrals cap) |
| 3 | Add `+5` bonus for `interest_type='seller'` referrals? | No (keep simple) |
| 4 | Derive `PRICE_RANGES` from `PRICING_BANDS × baselines`? | Yes (no drift) |
| 5 | Tighten image MIME allowlist (drop GIF)? | Yes (drop GIF — no use case) |
| 6 | Dark mode? | No for V1 |
| 7 | Account deletion grace period | 30 days |
| 8 | Auto-strike on `getActiveStrikes >= 3`? | Yes (7-day restricted mode) |
| 9 | NSFW image auto-mod? | No for V1 — manual report queue |
| 10 | TOURIST_MODE? | Off for V1 |
| 11 | OAuth providers? | Google V1.1; Apple V1.2 |
| 12 | Staff MFA required? | Yes — `aal2` enforced via middleware |
| 13 | Drop laptop fraud check entirely or add ranges? | Add ranges from product before launch |
| 14 | Diagnostic fee in-app payment (Stripe)? | V2 only |
| 15 | Slug format for listings | `slugify(title) + '-' + nanoid(6)` |
| 16 | Listing description profanity filter (el+en)? | V1.1 |

## V1 scope freeze

V1 (target launch 2026-09-15):

- Rhodes only
- Email/password auth
- Listings (browse, sell, report, view detail)
- Messages (1:1, server-moderated, image attach)
- Appointments (book, approve, token, redeem) — front_office + inspector roles
- Inspections (grade A/B/C/D)
- Waitlist (for non-eligible cities)
- Admin queue + audit log
- Assistant (Claude haiku, streaming)
- i18n el/en
- Greek typography rule
- Account deletion (soft+hard)
- Data export (GDPR)

Out of V1:
- OAuth (V1.1)
- MFA for regular users (V1.1)
- Stripe payment (V2)
- Multi-city expansion beyond Rhodes (V2)
- Transactions / escrow (V2)
- Push notifications (V2)
- Native mobile apps (V2 if needed)

## Performance budgets

- LCP ≤ 2.5s on 3G mobile, ≤ 1.0s on cable.
- TTFB ≤ 500ms p95.
- Listing detail page p95 ≤ 1.2s.
- Bundle: route-level chunks ≤ 100kb gzipped.
- Image: WebP, max 200kb after normalization for grid thumbnails.

## Observability

- **Errors**: Sentry (free tier).
- **Logs**: Vercel logs + Supabase log explorer.
- **Analytics**: Vercel Web Analytics (no third-party tracking — GDPR friendly).
- **Custom events**: write to `auto_action_log` table for moderation actions; query in admin dashboard.

## Compliance

- GDPR: right of access (data export), right to erasure (delete account).
- Cookie consent banner: strictly necessary cookies only by default; analytics requires opt-in.
- Privacy policy + ToS pages in both locales, version-stamped.
- DPO contact email: `privacy@mobileunit.gr`.

## Security

- All forms CSRF-protected by next-intl middleware + `sameSite=lax` cookies.
- Service-role key never sent to client.
- Webhook receivers verify signatures (Resend, Missive if present).
- Headers via `next.config.mjs`: `X-Frame-Options=DENY`, `X-Content-Type-Options=nosniff`, `Referrer-Policy=strict-origin-when-cross-origin`, CSP with explicit Supabase + Anthropic + Resend origins.

## Testing

- **Unit**: Vitest. Target 60% on `lib/` modules.
- **Integration**: Vitest + Testcontainers (Postgres) for RLS policy verification.
- **E2E**: Playwright. Three critical user journeys (listing, appointment, waitlist).
- **Visual**: Storybook + Chromatic on PR.
- **Load**: k6 against staging once before launch (50 RPS sustained, 200 RPS spike).
