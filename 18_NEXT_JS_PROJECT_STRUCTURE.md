# 18 — Next.js Project Structure

Target: **Next.js 15 App Router** on Vercel, with Supabase as the data + auth + storage layer. Bun is the package manager. TypeScript strict.

## Top-level layout

```
mobile-unit-web/
├── app/                          # App Router routes (locale-prefixed)
│   ├── [locale]/                 # /el/... or /en/...
│   │   ├── layout.tsx            # locale-scoped layout, sets <html lang>
│   │   ├── page.tsx              # / (locked → waitlist; unlocked → browse)
│   │   ├── (marketing)/          # waitlist + landing routes
│   │   │   ├── waitlist/
│   │   │   │   ├── page.tsx
│   │   │   │   └── success/page.tsx
│   │   │   ├── legal/page.tsx
│   │   │   └── support/page.tsx
│   │   ├── (app)/                # gated marketplace routes
│   │   │   ├── browse/
│   │   │   │   └── page.tsx
│   │   │   ├── listing/
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── sell/page.tsx
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx
│   │   │   │   └── listings/page.tsx
│   │   │   ├── messages/
│   │   │   │   ├── page.tsx             # conversation list
│   │   │   │   └── [conversationId]/page.tsx
│   │   │   ├── stores/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── book-appointment/page.tsx
│   │   │   └── assistant/page.tsx       # optional standalone; widget elsewhere
│   │   ├── onboarding/
│   │   │   ├── page.tsx                 # 4-step value props
│   │   │   ├── city-gate/page.tsx
│   │   │   └── waitlist-handoff/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── auth/
│   │   │   └── callback/route.ts        # Supabase OAuth callback
│   │   ├── token/[code]/page.tsx        # check-in token redemption
│   │   └── admin/                       # PROPOSED V2, gated by RLS role
│   │       └── …
│   ├── api/                      # Server routes (see 05_API_ENDPOINTS.md)
│   │   ├── listings/
│   │   │   ├── route.ts                 # GET /api/listings
│   │   │   └── [id]/route.ts
│   │   ├── messages/
│   │   │   ├── route.ts
│   │   │   └── [conversationId]/route.ts
│   │   ├── waitlist/route.ts
│   │   ├── appointments/route.ts
│   │   ├── assistant/route.ts           # streamed Claude responses
│   │   ├── upload/
│   │   │   └── signed-url/route.ts      # Supabase Storage signed upload URLs
│   │   ├── users/me/route.ts
│   │   ├── tokens/
│   │   │   ├── [code]/route.ts
│   │   │   └── rotate/route.ts
│   │   └── webhooks/                    # external (Stripe V2, etc.)
│   ├── opengraph-image.tsx
│   ├── robots.ts
│   ├── sitemap.ts
│   └── manifest.ts
├── components/                   # Reusable UI
│   ├── ui/                       # shadcn primitives
│   ├── listing/                  # ListingCard, ListingGallery, etc.
│   ├── marketing/                # WaitlistForm, ValueProp, etc.
│   ├── chat/                     # MessageBubble, ConversationList
│   ├── assistant/                # AssistantWidget, ChatStream
│   ├── stores/                   # StoreCard, StoreMap
│   └── common/                   # Header, Footer, LanguageToggle, CityPill
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # createServerClient (RSC, route handlers)
│   │   ├── client.ts             # createBrowserClient
│   │   ├── middleware.ts         # auth session refresh in middleware
│   │   └── admin.ts              # service-role client (server only)
│   ├── auth.ts                   # getSession, requireUser helpers
│   ├── api-client.ts             # typed fetch wrapper for client components
│   ├── pricing.ts                # PRICING_BANDS, grade multipliers (port verbatim)
│   ├── verification.ts           # trust event counter logic
│   ├── conditions.ts             # condition enum + helpers
│   ├── fraud/                    # fraud-score, hold creation, strike decay
│   ├── moderation/               # url-detection, off-platform regex, etc.
│   ├── i18n/
│   │   ├── config.ts             # next-intl config
│   │   └── routing.ts            # locale router helpers
│   ├── config.ts                 # APP_NAME, APP_DOMAIN, CURRENCY, …
│   ├── analytics.ts              # PostHog (PROPOSED) wrapper
│   ├── rate-limit.ts             # Upstash / in-memory limiter
│   └── cn.ts                     # className merge (port from mobile)
├── shared/
│   └── contracts.ts              # Zod schemas (port verbatim from Vibecode shared/)
├── messages/
│   ├── el.json
│   └── en.json
├── public/
│   ├── images/
│   └── icons/
├── styles/
│   └── globals.css
├── supabase/
│   ├── migrations/               # SQL DDL files (see 23_MIGRATIONS_*.md)
│   ├── seed.sql
│   └── config.toml               # local CLI config
├── scripts/
│   ├── seed.ts                   # idempotent seeding (cities, stores, configs)
│   ├── migrate-from-sqlite.ts    # one-time data import (PROPOSED — not needed if Rhodes-only fresh start)
│   └── lint-i18n.ts              # checks Greek keys for stray accents in UPPERCASE
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── middleware.ts                 # next-intl + Supabase session refresh
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── bun.lockb
├── .env.example
└── README.md
```

## Routing — locale prefix

All user-facing routes live under `app/[locale]/`. `middleware.ts` (next-intl) handles redirect from `/` → `/el` and locale negotiation. `/api/*` is **not** locale-prefixed — APIs return data, not localized HTML.

## Server vs client components

Default to server components. Promote a component to `"use client"` only when it needs:

- React state / effects (forms, image gallery, chat).
- Event handlers on real DOM (filters, language toggle).
- Supabase Realtime subscriptions.

The whole `(marketing)` group and most listing pages render server-side for SEO and initial paint speed. `browse/page.tsx` is server-rendered with `searchParams` filtering; the filter bar is a client component that pushes URL state.

## Data fetching pattern

Inside server components:

```tsx
import { createServerClient } from '@/lib/supabase/server';
export default async function ListingPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('*, seller:profiles!sellerId(handle, createdAt, trustEventCount)')
    .eq('id', params.id)
    .single();
  if (!listing) notFound();
  return <ListingDetail listing={listing} />;
}
```

Inside client components or route handlers, prefer the typed wrapper `lib/api-client.ts` that calls `/api/*` routes and validates responses against the same Zod schemas from `shared/contracts.ts`.

## State management

- **Server state**: Server components fetch directly via Supabase client. For client-side caching across navigation, use `@tanstack/react-query` v5 with Next.js App Router hydration helpers (`HydrationBoundary`).
- **Local UI state**: React `useState` / `useReducer`.
- **Persisted client state**: `zustand` with `persist` middleware backed by `localStorage` (replaces AsyncStorage from mobile). Port `cityStore`, `languageStore` (now mostly redundant — next-intl owns locale), `onboardingStore`.

## Forms

`react-hook-form` + `@hookform/resolvers/zod`. Reuse Zod schemas from `shared/contracts.ts`. Server actions (Next 15) handle submission for waitlist + simple flows; for listing-create (multi-photo upload), use a route handler + client fetch so progress reporting works.

## Auth surface area

Three states in middleware:

1. **Unauthenticated**: can access marketing, `/login`, `/register`, `/waitlist`, `/auth/callback`. Anything else redirects to `/login`.
2. **Authenticated, eligible city** (e.g. Rhodes): full app access.
3. **Authenticated, ineligible city**: redirects from `(app)` routes to `/waitlist` (city-gate).

Profile completeness (handle, defaultCity) gated separately — `/sell` and `/messages` require completed profile.

## Bundling rules

- `app/api/**` runs on Node (Supabase JS works on Edge for reads but service-role client needs Node for some flows). Per-route opt-in to Edge where it's safe.
- Marketing pages run on Edge for low TTFB globally.
- Assistant streaming route runs on Edge (Anthropic SDK supports it).

## Path aliases

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/shared/*": ["./shared/*"]
    }
  }
}
```

## Environment variables

See `.env.example` — full list documented in `19_SUPABASE_SETUP.md` and `21_THIRD_PARTY_INTEGRATIONS.md`. Naming conventions:

- `NEXT_PUBLIC_*` — exposed to the browser (Supabase URL, anon key, PostHog key).
- everything else — server only.

## Code conventions

- One default export per route file; named exports for everything else.
- File naming: `kebab-case.tsx` for routes, `PascalCase.tsx` for components, `camelCase.ts` for utilities.
- Server actions live with the form that calls them when they're page-specific (`app/[locale]/(app)/sell/actions.ts`); shared actions live in `lib/actions/`.
- Error boundaries: every route group has an `error.tsx` and `loading.tsx`.

## Removed from mobile

Things in the mobile source that should NOT be ported:

- `lib/responsive.ts`, `lib/animations.ts` — mobile-specific. Use Tailwind responsive variants + framer-motion instead.
- `lib/authClient.ts` — Better Auth client. Replaced by Supabase Auth.
- `lib/state/` Zustand stores tied to React Native — adapt for `localStorage` persistence on web.
- `lib/api.ts` — Vibecode proxy wrapper. Replace with `lib/api-client.ts` calling local `/api/*`.
- Anything importing `@vibecodeapp/*` packages — local to the Vibecode runtime.
- `@react-native-async-storage/async-storage` — use `localStorage` directly.

## What stays VERBATIM

- `shared/contracts.ts` — Zod schemas. Drop a couple of mobile-specific fields (none currently).
- All copy in `messages/*.json` (see `16_I18N_AND_COPY.md`).
- Pricing bands, grade multipliers, regex patterns from `lib/constants.ts`.
- Fraud thresholds, moderation rules, strike decay (`ModerationConfig` defaults).
