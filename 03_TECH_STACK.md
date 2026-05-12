# 03 — Tech Stack

The target stack for the Codex rebuild. Decisions D7 (Supabase Auth) and D11 (drop Prisma) drive most of this.

## Runtime & hosting

- **Next.js 15** (App Router) — Server Components by default, Client Components where state/interactivity is needed.
- **Vercel** — production hosting. Edge runtime for read-heavy public routes (listings, browse), Node runtime for routes that need `@supabase/supabase-js` admin client or `@anthropic-ai/sdk`.
- **Supabase** — Postgres 15 + Auth + Storage + Row-Level Security. One project, two environments (dev, prod).
- **GitHub** + **GitHub Actions** for CI/CD. PR previews via Vercel auto-deploys.

## Language & tooling

- **TypeScript 5.5+**, `strict: true`, `noUncheckedIndexedAccess: true`.
- **pnpm** (or **bun** if the team prefers) as package manager. The Vibecode source used `bun`, but Vercel supports both natively.
- **ESLint 9** + **Prettier 3** + **Husky** + **lint-staged** for pre-commit.

## Core packages

| Concern | Package | Notes |
|---|---|---|
| Routing/Framework | `next@^15`, `react@^19`, `react-dom@^19` | App Router |
| Auth | `@supabase/ssr@^0.5`, `@supabase/supabase-js@^2.45` | Replaces Better Auth |
| DB queries | `@supabase/supabase-js` | No ORM (D11) |
| Validation | `zod@^4.1.11` | Verbatim version from source |
| Forms | `react-hook-form@^7.53`, `@hookform/resolvers@^3.9` | Pair with zod schemas |
| Server state | `@tanstack/react-query@^5.90.2` | Same version as source |
| Local UI state | `zustand@^5.0.8` | Same as source |
| Styling | `tailwindcss@^3.4.18`, `tailwind-merge@^3.3.1`, `clsx@^2.1.1` | Same as source; NativeWind → vanilla Tailwind |
| Component primitives | `shadcn/ui` (Radix UI under the hood) | App-Router compatible |
| Icons | `lucide-react@^0.544` | Web variant of lucide-react-native |
| i18n | `next-intl@^3.20` | `el` (default) + `en` |
| AI | `@anthropic-ai/sdk@^0.30` | Claude Haiku 4.5 (D4) |
| Rate limiting | `@upstash/redis@^1.34`, `@upstash/ratelimit@^2.0` | Shared counter for assistant + waitlist + fraud checks |
| Email | `resend@^4.0` | Magic links, appointment confirmations, fraud admin alerts |
| Maps | `@vis.gl/react-google-maps@^1.5` OR `react-map-gl@^7` | Depending on `MAP_PROVIDER` placeholder |
| File upload | `react-dropzone@^14`, `browser-image-compression@^2.0` | Client-side resize before signed upload |
| Image rendering | `next/image` | Use Supabase Storage URLs as `loader` source |
| Markdown | `react-markdown@^9` | For assistant responses |
| Date | `date-fns@^4.1.0` | Same as source |
| Search/fuzzy | `fuse.js@^7.1.0` | Same as source — assistant intent matching |
| Charts (admin) | `recharts@^2.13` | Optional, V2 |
| Testing | `vitest@^2.1`, `@testing-library/react@^16`, `playwright@^1.48` | Unit + E2E |

## What's dropped vs. the source

| Dropped | Reason |
|---|---|
| `expo*`, `react-native*`, `nativewind` | Rewrite is web-only |
| `better-auth`, `@better-auth/expo` | Replaced by Supabase Auth (D7) |
| `@prisma/client`, `prisma`, `@prisma/adapter-better-sqlite3` | Replaced by `@supabase/supabase-js` (D11) |
| `@vibecodeapp/*` (sdk, backend-sdk, cloud-studio, proxy) | Vibecode runtime only |
| `hono`, `@hono/zod-validator`, `@hono/node-server` | Use Next.js Route Handlers instead |
| `react-native-purchases`, `react-native-purchases-ui` | RevenueCat was never used |
| `openai` | Replaced by `@anthropic-ai/sdk` (D4) |
| `react-native-gifted-chat` | Build a thin chat list with shadcn |
| `react-native-maps` | Replaced by `MAP_PROVIDER` web SDK |
| `react-native-vision-camera`, `expo-camera`, `expo-image-picker` | Web file input + drag-drop |
| ~75 other Expo modules | Not needed for web |

## Environment variables

Required at runtime. Put placeholders in `.env.example`, real values in Vercel dashboard.

```
# Public (NEXT_PUBLIC_*)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_DOMAIN=mobile-unit.example
NEXT_PUBLIC_MAP_PROVIDER=google
NEXT_PUBLIC_GOOGLE_MAPS_KEY=             # if MAP_PROVIDER=google
NEXT_PUBLIC_MAPBOX_TOKEN=                # if MAP_PROVIDER=mapbox

# Server-only
SUPABASE_SERVICE_ROLE_KEY=               # admin DB ops (RLS bypass)
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
ADMIN_EMAIL=admin@mobile-unit.example
SUPPORT_EMAIL=support@mobile-unit.example
NEXT_PUBLIC_APP_NAME=Mobile Unit
PARTNER_NAME=iRepair
PRIMARY_CITY=rhodes
PRIMARY_COUNTRY=Greece
CURRENCY=EUR
DEFAULT_LOCALE=el
STORAGE_BUCKET_LISTINGS=listings
EXTERNAL_BOOKING_URL=https://public.irepair.gr/service-app
PANDAS_PRICING_URL=https://pricing-v2.pandas.io/el-GR/irepair/smartphone
```

## Why these versions

The `zod`, `react-query`, `zustand`, `tailwind`, `date-fns`, `fuse.js` versions are pinned to match the source so existing schemas and stores transplant cleanly. The Next.js, React, and Supabase versions are pinned to current LTS as of the rewrite date.
