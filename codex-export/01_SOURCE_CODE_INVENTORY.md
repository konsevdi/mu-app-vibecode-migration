# 01 — Source Code Inventory

Every source file in the current Mobile Unit codebase that the rebuild must understand. Sizes are line counts. **EXPO/NATIVE** = must be removed or replaced in the web rebuild. **KEEP** = port near-verbatim. **PORT** = same idea, web equivalent.

## Backend — `backend/src/`

| File | Lines | Role | Action |
|---|---|---|---|
| `index.ts` | 143 | Hono app entry, route mounting, CORS, Better Auth handler, SIGTERM shutdown w/ SQLite WAL checkpoint | **PORT** — becomes Next.js `app/api/**/route.ts` files; no central index |
| `auth.ts` | 55 | Better Auth + Prisma adapter + Expo plugin | **PORT** — replace with Supabase Auth (`@supabase/ssr`) |
| `db.ts` | 31 | PrismaClient singleton + SQLite PRAGMA setup (WAL, foreign_keys, busy_timeout) | **PORT** — replace with Supabase client (server-side service-role + RLS client) |
| `env.ts` | 67 | Zod-validated env (`PORT`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BACKEND_URL`) | **PORT** — expand for Supabase / Resend / Upstash |
| `types.ts` | 21 | Hono `AppType` ctx type with user/session | **REMOVE** — Next.js uses route handlers, not Hono context |
| `routes/listings.ts` | 340 | GET/POST/PUT/DELETE /api/listings, POST /:id/report, fraud check on create | **PORT** verbatim logic to Route Handlers |
| `routes/messages.ts` | 150 | POST /, GET /:recipientId, POST /report. Conversation ID = sorted UIDs joined by `_` | **PORT** + add Supabase Realtime |
| `routes/waitlist.ts` | 236 | POST /, GET /check/:email, GET /referral/:code. In-memory rate limit (3/hour) | **PORT** + swap to Upstash Redis |
| `routes/appointments.ts` | 76 | POST/GET. No status state machine yet. `timeSlot` enum: `morning`/`afternoon` | **PORT** + add token issuance |
| `routes/users.ts` | 96 | PATCH /onboarding, GET /me | **PORT** verbatim |
| `routes/upload.ts` | 98 | POST /image — multipart, 10 MB cap, MIME allowlist, writes to local `uploads/`, returns `/uploads/{uuid}.ext` | **PORT** — replace local disk with Supabase Storage signed URLs |
| `routes/assistant.ts` | 393 | POST /chat, GET /suggestions. **MOCKED** — keyword-matching switch, no real LLM call | **REWRITE** — wire to Anthropic Claude haiku-4-5 with grounding |
| `routes/sample.ts` | – | Vibecode sample route | **DELETE** |
| `lib/chat-moderation.ts` | 117 | URL/off-platform regex, image-spam detector (3 recipients/5 min), strike decay (90 days) | **PORT** verbatim |
| `lib/fraud-scoring.ts` | 157 | FRAUD_THRESHOLD=80, pricing anomaly check, listing+user hold, restricted 7d cooldown | **PORT** verbatim |
| `lib/missive.ts` | 69 | Posts to `https://public.missiveapp.com/v1/drafts` for fraud >=80 holds. Skips silently if env vars missing | **PORT** — same Missive API or swap for email-to-helpdesk |
| `lib/rate-limiter.ts` | 127 | In-memory Map with periodic cleanup. `standardRateLimiter`(100/min), `strictRateLimiter`(10/min), `userRateLimiter` | **PORT** — replace Map with Upstash Redis for multi-instance |
| `lib/sanitize.ts` | 258 | escapeHtml, stripHtml, sanitizeText/Title/Email/URL/Phone/Slug, detectSqlInjection, detectXss | **PORT** verbatim |
| `prisma/schema.prisma` | 385 | 20 models | **TRANSLATE** to Postgres + RLS — see `15_SQL_MIGRATIONS.md` |

## Shared — `shared/`

| File | Lines | Role | Action |
|---|---|---|---|
| `contracts.ts` | 350 | Zod schemas + types for all API contracts | **KEEP** — copy as-is to `lib/contracts.ts` in Next.js |

Note: the file is duplicated to `mobile/src/shared/contracts.ts` via `tsconfig` path mapping `@/shared/*`. In the rebuild this becomes the canonical source.

## Mobile — `mobile/src/`

### App / Screens

| File | Lines | Screen / Role | Action |
|---|---|---|---|
| `app/_layout.tsx` | 63 | Expo Router root layout, providers, font loading, deep link `?ref=CODE` capture | **PORT** to Next.js `app/[locale]/layout.tsx` + middleware for `?ref` |
| `app/+html.tsx` | 131 | Expo Router web HTML shell | **REMOVE** — Next.js owns the HTML doc |
| `app/+not-found.tsx` | 19 | 404 fallback | **PORT** — Next.js `app/not-found.tsx` |
| `app/(tabs)/_layout.tsx` | 106 | 4-tab bottom nav (browse, sell, appointments, profile) — uses `@bottom-tabs/react-navigation` | **PORT** — top nav + side panel for web |
| `app/(tabs)/index.tsx` | 469 | Home/landing | **PORT** |
| `app/(tabs)/browse.tsx` | 352 | Filterable listing grid | **PORT** to `app/[locale]/browse/page.tsx` |
| `app/(tabs)/sell.tsx` | 611 | Create-listing form, photo picker, condition selection, pricing guide modal | **PORT** to `app/[locale]/sell/page.tsx` |
| `app/(tabs)/profile.tsx` | 329 | Profile, my listings, sign-out | **PORT** |
| `app/listing/[id].tsx` | 627 | Listing detail page | **PORT** to `app/[locale]/listing/[id]/page.tsx` |
| `app/onboarding.tsx` | 1241 | Multi-step welcome → value carousel → city gate → auth → waitlist | **PORT** — split into Next.js routes under `/[locale]/onboarding/*` |
| `app/login.tsx` | 14 | Email/password login wrapper | **PORT** — `app/[locale]/auth/sign-in/page.tsx` |
| `app/book-appointment.tsx` | 204 | Pick date + morning/afternoon slot | **PORT** |
| `app/token.tsx` | 260 | 6-digit token UI, polls every 10s | **PORT** — replace polling with Supabase Realtime |
| `app/waitlist.tsx` | 915 | Standalone waitlist signup (non-onboarding path) | **PORT** to `app/[locale]/waitlist/page.tsx` |
| `app/waitlist-success.tsx` | 724 | Success page w/ referral code + share | **PORT** |
| `app/demo-browse.tsx` | 894 | Mock listings for ineligible-city demo | **PORT** — server route returns curated `is_demo=true` listings |
| `app/stores.tsx` | 248 | Hardcoded iRepair Rhodes + iRepair Spot | **PORT** + read from `stores` table |
| `app/support.tsx` | 114 | Static FAQ placeholder | **PORT** — needs real FAQ content (MISSING) |
| `app/legal.tsx` | 86 | Stub legal text | **PORT** — needs real ToS/Privacy (MISSING) |
| `app/modal.tsx` | 15 | Generic Expo Router modal | **REMOVE** — Next.js handles modals via `@modal` slot |

### Components

| File | Lines | Role | Action |
|---|---|---|---|
| `components/AssistantChat.tsx` | 430 | Floating AI assistant chat bubble | **PORT** to a `<Sheet>` from shadcn/ui |
| `components/AnimatedButton.tsx` | 176 | Reanimated press/hover button | **PORT** — Framer Motion or CSS transitions |
| `components/LoginWithEmailPassword.tsx` | 247 | Email/password form using Better Auth | **PORT** — Supabase Auth |
| `components/LoginButton.tsx` | 30 | Sign-in button | **PORT** |
| `components/LanguageToggle.tsx` | 71 | El/En switch | **PORT** to next-intl locale switcher |
| `components/LanguageTogglePill.tsx` | 139 | Pill variant of the toggle | **PORT** |
| `components/SafetyTips.tsx` | 66 | Static tip carousel | **PORT** verbatim |
| `components/Themed.tsx` | 29 | Themed `Text`/`View` wrappers using `useColorScheme` | **REMOVE** — Tailwind handles theming |
| `components/ComponentWithDataFetchingExample.tsx` | 44 | Vibecode demo file | **DELETE** |

### lib / state

| File | Lines | Role | Action |
|---|---|---|---|
| `lib/api.ts` | 173 | `fetch` wrapper using `expo/fetch` + cookie passthrough from `authClient` | **REPLACE** — use Next.js `fetch` + Supabase client |
| `lib/authClient.ts` | 17 | Better Auth Expo client + SecureStore | **REPLACE** — Supabase browser client (`@supabase/ssr`) |
| `lib/useSession.tsx` | – | Better Auth session hook | **REPLACE** — `useUser()` via Supabase |
| `lib/cityStore.ts` | 22 | Zustand persist (AsyncStorage) — `defaultCity` | **PORT** — Zustand persist via `localStorage` |
| `lib/onboardingStore.ts` | 159 | Zustand persist — onboarding step, selected city, pending ref code, waitlist signup | **PORT** verbatim w/ `localStorage` |
| `lib/languageStore.ts` | 588 | Translations object (el/en, ~210 keys) + Zustand store | **PORT** — translations move to next-intl `messages/{el,en}.json`; store stays |
| `lib/conditions.ts` | 112 | CONDITIONS constant w/ color, bgColor, priceRangePercent; `normalizeConditionKey()` | **PORT** verbatim |
| `lib/constants.ts` | 22 | PRICING_BANDS, GRADE_MULTIPLIERS, PANDAS_PRICING_URL, VERIFICATION_LABEL | **PORT** verbatim |
| `lib/verification.ts` | 16 | `isListingVerified`, `isUserVerified(trustEventCount >= 2)`, gradeLabels (Greek) | **PORT** verbatim |
| `lib/stores.ts` | 22 | Hardcoded `V1_STORES` array (iRepair Rhodes + iRepair Spot) | **REPLACE** — read from `stores` table |
| `lib/animations.ts` | 288 | Reanimated transition helpers | **REPLACE** — Framer Motion |
| `lib/responsive.ts` | 276 | `useWindowDimensions`-based breakpoints | **REMOVE** — Tailwind responsive |
| `lib/cn.ts` | 6 | clsx + tailwind-merge | **KEEP** |
| `lib/useColorScheme.*` | 9 | `react-native` color scheme hook | **REMOVE** — Tailwind dark mode |
| `lib/useClientOnlyValue.*` | 16 | SSR-vs-client value picker | **REMOVE** — Next.js owns this primitive |

## Expo/native imports to strip during the rebuild

Reading the sources, the following packages are present and must be eliminated or substituted:

| Mobile package | Web replacement |
|---|---|
| `expo-router` | Next.js App Router |
| `expo-image`, `expo-image-manipulator` | `next/image` + `@plaiceholder/base64` |
| `expo-image-picker` | `<input type="file" accept="image/*" multiple>` |
| `expo-haptics`, `expo-glass-effect`, `expo-blur` | None (web) |
| `expo-secure-store` | HttpOnly cookies via Supabase SSR |
| `expo-location` | `navigator.geolocation` (with consent banner) |
| `expo-clipboard` | `navigator.clipboard.writeText` |
| `expo/fetch` | global `fetch` |
| `@better-auth/expo` | `@supabase/ssr` |
| `nativewind`, `react-native` primitives | Tailwind + shadcn/ui |
| `react-native-reanimated`, `react-native-gesture-handler` | Framer Motion |
| `@react-native-async-storage/async-storage` | `localStorage` (via Zustand persist) |
| `@shopify/flash-list`, `@gorhom/bottom-sheet`, `burnt` | shadcn/ui equivalents + Sonner for toasts |
| `@codeherence/react-native-header` | n/a |
| `@kolking/react-native-avatar` | shadcn `<Avatar>` |
| `@nandorojo/galeria` | Custom lightbox with `next/image` |
| `expo-camera` | Not used post-launch on web (sell flow uses file picker) |

## Pre-existing migrations

`backend/prisma/migrations/`:
- `20251003235745_init`
- `20251220114043_add_listings`

These reflect SQLite syntax — they are NOT used by the rebuild. Postgres-native migrations live in `codex-export/sql/`.
