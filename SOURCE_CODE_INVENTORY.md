# Mobile Unit — Source Code Inventory

**Generated:** 2026-05-12
**Source root:** `/home/user/workspace`
**Scope:** Current Expo/Hono codebase, mapped to target Next.js 15 / Supabase / Vercel.

Path convention: paths starting with `mobile/`, `backend/`, `shared/` refer to the current source. Target paths starting with `apps/web/` follow the proposed Next.js layout in `codex-export/04_FRONTEND_LAYOUT.md`.

---

## 1. Full File Tree

```
/home/user/workspace
├── backend/
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   ├── bun.lock
│   ├── server.log
│   ├── studio.log
│   ├── README.md
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── dev.db, dev.db-shm, dev.db-wal
│   │   └── migrations/
│   │       ├── 20251003235745_init/
│   │       ├── 20251220114043_add_listings/
│   │       └── migration_lock.toml
│   ├── scripts/
│   │   ├── env.sh
│   │   ├── start
│   │   └── studio
│   ├── uploads/                      # local disk; populated at runtime
│   └── src/
│       ├── index.ts                  # Hono app bootstrap, route mounts, CORS, /uploads/*
│       ├── auth.ts                   # Better Auth init (prismaAdapter + expoClient)
│       ├── db.ts                     # singleton PrismaClient w/ WAL PRAGMAs ("DO NOT MODIFY")
│       ├── env.ts                    # Zod-validated env (PORT, DATABASE_URL, BETTER_AUTH_SECRET, …)
│       ├── types.ts                  # AppType (Hono Variables: user, session)
│       ├── lib/
│       │   ├── chat-moderation.ts    # URL/off-platform redaction, image-spam, strikes
│       │   ├── fraud-scoring.ts      # score, pricing anomaly, applyFraudHold
│       │   ├── missive.ts            # createMissiveFraudDraft (Bearer; graceful no-op)
│       │   ├── rate-limiter.ts       # in-memory Map rate limiters (strict/standard/lenient/user)
│       │   └── sanitize.ts           # escapeHtml, sanitizeText/Title/Email/Number/Url/Slug, detectXss
│       └── routes/
│           ├── sample.ts             # template (DELETE in migration)
│           ├── upload.ts             # POST /api/upload/image (disk @ process.cwd()/uploads/)
│           ├── users.ts              # PATCH /api/users/onboarding, GET /api/users/me
│           ├── listings.ts           # CRUD + report; transformListing parses images JSON string
│           ├── messages.ts           # POST/GET/report; conversationId = sorted "uid1_uid2"
│           ├── appointments.ts       # POST /, GET / only (no approve/cancel/checkin/redeem)
│           ├── waitlist.ts           # POST /, GET /check/:email, GET /referral/:code
│           └── assistant.ts          # MOCK keyword switch (not a real LLM)
│
├── shared/
│   └── contracts.ts                  # Zod schemas + inferred TS types shared by mobile↔backend
│
├── mobile/
│   ├── .env                          # EXPO_PUBLIC_VIBECODE_BACKEND_URL, …
│   ├── app.json                      # name/slug/scheme = "vibecode"; expo-router plugin
│   ├── babel.config.js               # nativewind preset, module-resolver "@" -> ./src
│   ├── metro.config.js               # FORBIDDEN to edit (Vibecode runtime)
│   ├── tailwind.config.js            # nativewind preset; custom fontSize scale
│   ├── tsconfig.json                 # paths @/* -> src/*, @/shared/* -> ../shared/*
│   ├── eslint.config.js              # expo flat config + tanstack/query plugin
│   ├── nativewind-env.d.ts
│   ├── expo-env.d.ts
│   ├── global.css                    # tailwind directives
│   ├── index.ts                      # entry: imports get-random-values, reanimated, expo-router/entry
│   ├── package.json                  # 100+ deps (see Dependency Audit)
│   ├── CLAUDE.md, README.md, IMPLEMENTATION_PLAN.md, REDESIGN_PLAN.md, AGENTS.md
│   ├── package.json.backup-2026-05-11T08-44-31-042Z
│   ├── patches/                      # patch-package patches (react-native@0.81.5, @expo/cli, etc.)
│   ├── public/
│   │   └── manifest.json
│   ├── assets/                       # 10 PNGs (image-1766354327.png … image-1766354356.png)
│   └── src/
│       ├── app/                      # expo-router file-based routes
│       │   ├── _layout.tsx           # RootLayout: QueryClientProvider + GestureHandler + Stack
│       │   ├── +html.tsx             # web HTML shell
│       │   ├── +not-found.tsx
│       │   ├── modal.tsx
│       │   ├── login.tsx             # presents <LoginWithEmailPassword/>
│       │   ├── onboarding.tsx        # 1241 LOC; welcome → carousel → city-gate
│       │   ├── legal.tsx
│       │   ├── support.tsx           # email/phone/website cards (CONTACT_INFO inline)
│       │   ├── stores.tsx            # store directory (STORES inline; duplicates lib/stores.ts)
│       │   ├── book-appointment.tsx  # date+slot picker → POST /api/appointments
│       │   ├── token.tsx             # 6-digit 60s rotation, local-only (no API)
│       │   ├── waitlist.tsx          # 915 LOC; signup form
│       │   ├── waitlist-success.tsx  # 724 LOC; share/referral celebration
│       │   ├── demo-browse.tsx       # 894 LOC; locked demo for non-Rhodes
│       │   ├── listing/
│       │   │   └── [id].tsx          # 627 LOC; detail + Contact Seller + Report
│       │   └── (tabs)/
│       │       ├── _layout.tsx       # 4 tabs + floating <AssistantChat/>
│       │       ├── index.tsx         # Home (469 LOC)
│       │       ├── browse.tsx        # Browse (352 LOC)
│       │       ├── sell.tsx          # Sell (611 LOC, create-listing form)
│       │       └── profile.tsx       # Profile (329 LOC)
│       ├── components/
│       │   ├── AnimatedButton.tsx
│       │   ├── AssistantChat.tsx     # 430 LOC; FAB + bottom-sheet chat
│       │   ├── ComponentWithDataFetchingExample.tsx   # DELETE
│       │   ├── LanguageToggle.tsx
│       │   ├── LanguageTogglePill.tsx
│       │   ├── LoginButton.tsx
│       │   ├── LoginWithEmailPassword.tsx
│       │   ├── SafetyTips.tsx
│       │   └── Themed.tsx
│       └── lib/
│           ├── animations.ts          # TIMING/EASE_*/SPRING_* constants + useReduceMotion
│           ├── api.ts                 # api.get/post/put/patch/delete via expo/fetch + cookie
│           ├── authClient.ts          # better-auth/react createAuthClient + expoClient(SecureStore)
│           ├── cityStore.ts           # zustand persist (defaultCity)
│           ├── cn.ts                  # tailwind-merge wrapper
│           ├── conditions.ts          # CONDITIONS, calculateSuggestedPrice, normalizeConditionKey
│           ├── constants.ts           # PRICING_BANDS, GRADE_MULTIPLIERS, PANDAS_PRICING_URL, …
│           ├── languageStore.ts       # 588 LOC; i18n el/en dictionary + zustand store
│           ├── onboardingStore.ts     # zustand persist; CITIES, isCityEligible, TOURIST_MODE_ENABLED
│           ├── responsive.ts          # useDimensions/useGridColumns/getCardWidth/...
│           ├── stores.ts              # V1_STORES = [irepair-rhodes, irepair-spot]
│           ├── useClientOnlyValue.ts / .web.ts
│           ├── useColorScheme.ts / .web.ts
│           ├── useSession.tsx         # authClient.useSession() re-export
│           ├── verification.ts        # isUserVerified(n>=2), gradeLabels, VERIFICATION_LABEL
│           └── state/
│               └── example-state.ts   # DELETE
│
├── codex-export/                     # handoff bundle (already committed)
│   ├── *.md (26 docs)
│   ├── seed-data.json
│   ├── .env.example
│   └── sql/  (001–006)
│
└── (root-level docs from prior bundle: 00_README_HANDOFF.md … 27_PARTIAL_AND_MISSING.md,
   MIGRATION_DOSSIER.md, seed-data.json)
```

---

## 2. File-by-File Inventory

Columns: **File → key symbols → migration verdict → Next.js destination.**
"PORT" = move logic mostly as-is. "REWRITE" = needs significant change. "DROP" = obsolete in target. "REPLACE" = swap for target-stack equivalent.

### 2.1 Backend (`backend/src/`)

| File | Key symbols | Verdict | Next.js destination |
|---|---|---|---|
| `index.ts` | Hono app bootstrap; mounts `/api/auth/*`, `/api/upload`, `/api/sample`, `/api/listings`, `/api/messages`, `/api/appointments`, `/api/waitlist`, `/api/users`, `/api/assistant`; CORS `Access-Control-Allow-Origin: *` with credentials; serves `/uploads/*` static; SIGINT WAL checkpoint | **DROP** | Replaced by per-route handlers under `apps/web/app/api/**/route.ts`. CORS handled by Next runtime; uploads move to Supabase Storage. |
| `auth.ts` | `auth = betterAuth({ database: prismaAdapter(db,{provider:"sqlite"}), plugins:[expo()], emailAndPassword:{enabled:true}, advanced.crossSubDomainCookies, trustedOrigins:["vibecode://", "*.vibecodeapp.com", …] })` | **REPLACE** | Supabase Auth (`apps/web/lib/supabase/server.ts` + `createServerClient`). Email/password mapped to Supabase email-OTP or password flow. Trusted origins replaced by `auth.url` + Vercel domains. |
| `db.ts` | `new PrismaClient()` w/ PRAGMAs `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=10000`; singleton via `globalThis.prismaClient` | **DROP** | Postgres via Supabase. Replace with `apps/web/lib/supabase/{server,browser}.ts` and SQL helpers under `apps/web/lib/db/`. |
| `env.ts` | Zod schema: `PORT`, `NODE_ENV`, `DATABASE_URL`, `BETTER_AUTH_SECRET (min 32)`, `BACKEND_URL`; commented GOOGLE_CLIENT_* | **REWRITE** | `apps/web/lib/env.ts` (`@t3-oss/env-nextjs` or hand-rolled Zod). Adds: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL, RESEND_API_KEY, MISSIVE_API_KEY/ORG_ID, NEXT_PUBLIC_*. |
| `types.ts` | `type AppType = { Variables: { user: …\|null; session: …\|null } }` | **DROP** | Next.js Route Handlers get session via `supabase.auth.getSession()`; no Hono context. |
| `lib/chat-moderation.ts` | `URL_PATTERNS`, `OFF_PLATFORM_PATTERNS`, `SENDER_TOOLTIP`, `moderateMessage`, `detectImageSpam(db, senderId, imageHash, 5min, 3 recipients)`, `addStrike(db, userId, reason)` (90-day expiry), `getActiveStrikes` (defined, **never called** in source) | **PORT** | `apps/web/lib/moderation/chat.ts` — swap Prisma calls for SQL (`messages`, `user_strikes`). Keep regexes verbatim. |
| `lib/fraud-scoring.ts` | `FRAUD_THRESHOLD=80`, `PRIVATE_REPORT_LIMIT=2`, `STORE_REPORT_LIMIT=5`, `RESTRICTED_COOLDOWN_DAYS=7`; `PRICE_RANGES` (phone/tablet/accessory only — **laptop missing**; `*_parts` missing); `checkPricingAnomaly` (+25 if <30% min, +15 if <50%, isStore exempt); `performFraudCheck`; `applyFraudHold` (sets `isHeld, restrictedMode, restrictedUntil=+7d, tokensDisabled`); `applyListingFraudHold` | **PORT + FILL GAPS** | `apps/web/lib/fraud/scoring.ts`. Add `laptop` ranges + `_parts` rows per spec doc `08_FRAUD.md`. |
| `lib/missive.ts` | `MISSIVE_LABEL="Mobile Unit Leads"`, `createMissiveFraudDraft({ subject, body, …})` → POST `https://public.missiveapp.com/v1/drafts`; returns null when `MISSIVE_API_KEY` or `MISSIVE_ORG_ID` unset | **PORT** | `apps/web/lib/missive.ts` (server-only). Keep graceful no-op so dev/preview envs without keys still pass. |
| `lib/rate-limiter.ts` | In-memory `Map<string, {count,resetAt}>`; `strictRateLimiter (10/min)`, `standardRateLimiter (100/min)`, `lenientRateLimiter (300/min)`, `userRateLimiter`; 60s cleanup interval | **REPLACE** | Upstash Redis via `@upstash/ratelimit`. Apply per route in `apps/web/middleware.ts` or in-handler. |
| `lib/sanitize.ts` | `escapeHtml`, `stripHtml`, `sanitizeText/Title/Email/Number/Url/Phone/Slug/Object`, `detectSqlInjection` (heuristic only), `detectXss`, `validateAndSanitize` | **PORT (partial)** | Keep `escapeHtml`, `sanitizeText/Url/Phone/Slug`. **Drop** `detectSqlInjection` — Supabase RPC + parameterized queries are the real defense; heuristic is misleading. |

### 2.2 Backend routes (`backend/src/routes/`)

| File | Endpoints | Notes / behavior | Next.js destination |
|---|---|---|---|
| `sample.ts` | `GET /`, `GET /protected`, `POST /` | Template only. | **DELETE** |
| `upload.ts` | `POST /api/upload/image` | `zValidator("form", uploadImageRequestSchema)`; MIME allowlist `image/jpeg\|jpg\|png\|gif\|webp`; 10MB cap; saves `${randomUUID()}${ext}` to `process.cwd()/uploads/`; returns `/uploads/{filename}`. **Not viable on Vercel** (read-only FS). | `apps/web/app/api/upload/route.ts` — generate signed upload URL for Supabase Storage bucket `listing-images`; client uploads directly. Keep size/MIME validation server-side. |
| `users.ts` | `PATCH /api/users/onboarding`, `GET /api/users/me` | Updates `onboardingCompleted, selectedCity, selectedCountry, isEligibleCity, languagePref`; returns full user incl. `trustEventCount`, `defaultCity` | `apps/web/app/api/users/me/route.ts` + `apps/web/app/api/users/onboarding/route.ts`. Reads/writes `profiles` table via Supabase. |
| `listings.ts` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/report` | `transformListing` JSON-parses `images`; filter: `category, condition, search (OR title/description/brand/model), minPrice/maxPrice, featured, verifiedOnly (grade IS NOT NULL AND checklistComplete), sellerId`; baseline `WHERE isActive AND NOT isHeld AND status='approved'`; POST blocks `dbUser.isHeld\|\|dbUser.tokensDisabled`, calls `performFraudCheck`, auto-hold + Missive draft if score≥80; report endpoint: 24h window count, threshold `isStore?5:2`, +10 fraud score, `addStrike` to seller, Missive draft if auto-hidden | `apps/web/app/api/listings/route.ts` + `apps/web/app/api/listings/[id]/route.ts` + `apps/web/app/api/listings/[id]/report/route.ts`. Move `images` JSON-string to native `text[]` column. |
| `messages.ts` | `POST /api/messages`, `GET /api/messages/:recipientId`, `POST /api/messages/report` | `getConversationId(uid1,uid2)` = sorted `_`-join; `moderateMessage` redacts links + sets `flaggedReason`; `detectImageSpam` for `imageHash`; GET filters `isHidden=false OR senderId=user.id` (sender still sees own redacted msgs); report soft-hides + `addStrike` to sender | `apps/web/app/api/messages/route.ts` + `apps/web/app/api/messages/[recipientId]/route.ts` + `apps/web/app/api/messages/report/route.ts`. Use Supabase realtime channel `conversation:{id}` for live updates. |
| `appointments.ts` | `POST /api/appointments`, `GET /api/appointments` | **Missing**: approve/cancel/check-in/redeem, slot conflict check, store-staff scoped endpoints. status defaults `pending`. | `apps/web/app/api/appointments/**/*`. Implement full state machine (`enforce_appointment_transitions` trigger in SQL 004). Add store-staff endpoints for check-in + redeem. |
| `waitlist.ts` | `POST /api/waitlist`, `GET /api/waitlist/check/:email`, `GET /api/waitlist/referral/:code` | `generateReferralCode = "MU" + 6 from "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"` (no 0/O/I/1); in-memory `signupAttempts` Map (3/hour/email); collision retry max 10; ignores invalid referredByCode; prevents self-referral; credits referrer `referralCount+=1, positionScore+=3`; GET /referral masks email as `xx***@domain` | `apps/web/app/api/waitlist/**/*`. Move rate limit to Upstash; referral code generation moves to SQL trigger `generate_referral_code` (already in `004_indexes_triggers_functions.sql`). |
| `assistant.ts` | `POST /api/assistant/chat`, `GET /api/assistant/suggestions` | **MOCK** keyword switch (`generateResponse(message, context, language)`); hardcoded `KNOWLEDGE_BASE` per category (price ranges, popular brands, tips); hardcoded condition `discount` table (new=0.05 … parts=0.70); `safetyTips` x5 el/en; `iRepairInfo.diagnosticFee=10`; matches lowercase keywords (`price\|τιμή\|πόσο`, `safe\|ασφάλ\|scam`, `irepair\|πιστοποίηση`, `recommend\|καλύτερο\|budget`, `sell\|πουλ\|αγγελία`); `sanitizeText` w/ maxLength 2000 | **REWRITE** | `apps/web/app/api/assistant/chat/route.ts` — call Anthropic `claude-haiku-4-5` with system prompt that embeds `PRICING_BANDS`, grade table, safety tips, PANDAS_PRICING_URL; keep el/en switch from request; preserve keyword fallback for offline/cost cap. |

### 2.3 Backend Prisma (`backend/prisma/`)

| File | Contents | Verdict |
|---|---|---|
| `schema.prisma` | 20 models: `User` (+ `isHeld`, `restrictedMode`, `restrictedUntil`, `tokensDisabled`, `trustEventCount`, `onboardingCompleted`, `selectedCity`, `selectedCountry`, `isEligibleCity`, `languagePref`, `defaultCity`), `Session`, `Account`, `Verification`, `Profile (handle)`, `Listing (images=JSON string)`, `Message (conversationId, imageHash, isHidden, flaggedReason)`, `ChatReport`, `UserStrike`, `FraudHold`, `Appointment`, `Store`, `Staff`, `Inspection`, `Token`, `AuditLog`, `AutoActionLog`, `GradeConfig`, `ModerationConfig`, `WaitlistSignup` | **REPLACE** with Postgres SQL in `codex-export/sql/001–006_*.sql` (already authored). Drop Prisma entirely. |
| `migrations/20251003235745_init/` | Better Auth init schema | Reference only — discard. |
| `migrations/20251220114043_add_listings/` | Marketplace tables added on top | Reference only — discard. |
| `dev.db*` | Local SQLite | Use as seed source for `codex-export/seed-data.json` only. |

### 2.4 Shared (`shared/`)

| File | Key symbols | Verdict | Destination |
|---|---|---|---|
| `contracts.ts` | `categorySchema`, `conditionSchema`, `citySchema`, `gradeSchema`, `listingStatusSchema`, `listingSchema`, `getListingsQuerySchema`, `createListingRequestSchema (images.min(3).max(10))`, `messageSchema`, `sendMessageRequestSchema (content max 2000)`, `reportMessageRequestSchema`, `createWaitlistSignupRequestSchema (consent must be true)`, `waitlistSignupSchema`, `assistantChatRequestSchema`, `updateUserOnboardingRequestSchema`, `uploadImageRequestSchema (z.instanceof(File))`; constants `VERIFICATION_LABEL="iRepair"`, `PRICING_BANDS`, `GRADE_MULTIPLIERS`, `PANDAS_PRICING_URL` | **PORT in full** | `apps/web/lib/schemas/*.ts` (one file per concern) — keep zod schemas verbatim where possible; replace `z.instanceof(File)` with multipart parsing in route handlers. |

### 2.5 Mobile app routes (`mobile/src/app/`)

| File | Purpose / key symbols | Verdict | Next.js destination |
|---|---|---|---|
| `_layout.tsx` | `RootLayout`: `QueryClientProvider` → `GestureHandlerRootView` → `KeyboardProvider` → `StatusBar` → `<Stack>` registers screens `onboarding, (tabs), listing/[id], login (modal), modal, legal, support, book-appointment, stores, token, waitlist, waitlist-success, demo-browse`. `unstable_settings.initialRouteName = 'onboarding'`. `SplashScreen.preventAutoHideAsync()`. | **REWRITE** | `apps/web/app/layout.tsx` (server) — Next.js root layout with `<NextIntlClientProvider>` + `<QueryClientProvider>` (in a client wrapper) + Supabase auth bootstrap. No native Stack. |
| `(tabs)/_layout.tsx` | 4 tabs (`Home/Search/PlusCircle/User`), tab tint `#FF00FF`, fixed bottom; pathname-based `getCurrentPage()` feeds `<AssistantChat context={{page}}/>` | **REWRITE** | `apps/web/app/(app)/layout.tsx` — top navbar + bottom mobile nav (Tailwind). Floating chat moves to a client component `<AssistantWidget/>`. |
| `(tabs)/index.tsx` | Home; `useQuery(["listings"], …)` for recent listings; category pills; uses `useDimensions/useGridColumns/getCardWidth`; magenta/cyan gradients | **REWRITE** | `apps/web/app/(app)/page.tsx` — server component fetches via Supabase; categories from `lib/schemas/listing.ts`. |
| `(tabs)/browse.tsx` | Search + category + verified-only + price range filters | **REWRITE** | `apps/web/app/(app)/browse/page.tsx` — URL-driven search params. |
| `(tabs)/sell.tsx` | 611 LOC; `getCategoryData/getConditionData/getBrandOptions/getModelOptions(t)`; uses `CONDITIONS` from `lib/conditions.ts`; opens Pandas URL via `WebBrowser.openBrowserAsync` | **REWRITE** | `apps/web/app/(app)/sell/page.tsx` — multi-step form. Image upload via Supabase signed URL. Open Pandas in `<a target="_blank" rel="noopener">`. |
| `(tabs)/profile.tsx` | Listings count, settings, sign-out | **REWRITE** | `apps/web/app/(app)/profile/page.tsx` + `apps/web/app/(app)/profile/settings/page.tsx`. |
| `onboarding.tsx` | 1241 LOC; views `welcome` / `value-carousel` / `city-gate`; uses `useOnboardingStore`, `useOnboardingHydrated`, `getAllCities`; imports asset PNGs `image-1766354330/345/349/351/354.png`; `<LanguageTogglePill/>` | **REWRITE** | `apps/web/app/(onboarding)/onboarding/page.tsx` (client). Replace zustand persistence with cookie + Supabase profile. Swap PNGs for SVGs / shadcn. |
| `waitlist.tsx` | 915 LOC; signup form (`Mail, User, ShoppingBag, Phone, AtSign, Gift, Wrench, CheckCircle`); `useMutation` to `POST /api/waitlist` | **REWRITE** | `apps/web/app/(onboarding)/waitlist/page.tsx`. |
| `waitlist-success.tsx` | 724 LOC; referral share; copy-link UI | **REWRITE** | `apps/web/app/(onboarding)/waitlist/success/page.tsx`. |
| `demo-browse.tsx` | 894 LOC; locked demo for non-Rhodes users | **REWRITE** | `apps/web/app/(app)/demo/page.tsx` (or fold into `/browse` with a city flag). |
| `listing/[id].tsx` | 627 LOC; detail page; contact-seller; report | **REWRITE** | `apps/web/app/(app)/listings/[id]/page.tsx` (server) + client island for message+report. |
| `book-appointment.tsx` | 14-day date picker (skips Sundays), `selectedSlot ∈ {morning, afternoon}`, opens `https://public.irepair.gr/service-app` as fallback | **REWRITE** | `apps/web/app/(app)/book/page.tsx`. Add slot-conflict check against `appointments` table. |
| `token.tsx` | LOCAL ONLY: `generateCode()` → 6-digit; 60s rotation timer; **no API call** (placeholder UI) | **REWRITE** | `apps/web/app/(app)/token/page.tsx` — must call new `/api/tokens/me` backed by `tokens` table + pg_cron `rotate_tokens` job (already in SQL 004). |
| `stores.tsx` | Inline `STORES` array (duplicates `lib/stores.ts`); `Linking.openURL` for tel/email/maps | **REWRITE** | `apps/web/app/(app)/stores/page.tsx`. Pull from `stores` table; remove inline duplicate. |
| `support.tsx` | Inline `CONTACT_INFO` (`info@irepair.gr`, `+30 22410 12345`, `Ρόδος`) | **REWRITE** | `apps/web/app/(public)/support/page.tsx`. Pipe contact through env or CMS. |
| `legal.tsx` | Privacy / terms placeholders | **REWRITE** | `apps/web/app/(public)/legal/{privacy,terms,cookies}/page.tsx`. |
| `login.tsx` | 14 LOC; mounts `<LoginWithEmailPassword/>` | **DROP** | Supabase auth UI; route at `apps/web/app/(auth)/login/page.tsx`. |
| `modal.tsx` | 15 LOC stub | **DROP** | Native modal abstraction not needed. |
| `+html.tsx` | Web HTML shell for expo-router | **DROP** | Next.js owns `<html>` in `app/layout.tsx`. |
| `+not-found.tsx` | 19 LOC fallback | **REPLACE** | `apps/web/app/not-found.tsx`. |

### 2.6 Mobile components (`mobile/src/components/`)

| File | Symbols / behavior | Verdict | Destination |
|---|---|---|---|
| `AnimatedButton.tsx` | Reanimated press-scale Pressable wrapper | **DROP** | Use shadcn `<Button>` + Tailwind `active:scale-95`. |
| `AssistantChat.tsx` | 430 LOC. FAB at `bottom:100,right:20`; `LinearGradient` panel; `useQuery(["assistant","suggestions",page,language])` → `/api/assistant/suggestions?page=…&language=…`; `useMutation` → `/api/assistant/chat`; `<KeyboardAvoidingView>`; haptics on open/close/send | **REWRITE** | `apps/web/components/assistant/assistant-widget.tsx` + `apps/web/components/assistant/chat-panel.tsx`. Streamed Anthropic responses via Vercel AI SDK. |
| `ComponentWithDataFetchingExample.tsx` | Template | **DELETE** | — |
| `LanguageToggle.tsx`, `LanguageTogglePill.tsx` | EL/EN toggle via `useLanguageStore` | **REWRITE** | `apps/web/components/locale-switcher.tsx` — uses `next-intl` and writes locale cookie. |
| `LoginButton.tsx` | 30 LOC pressable → `router.push("/login")` | **DROP** | shadcn `<Button>` + `<Link>`. |
| `LoginWithEmailPassword.tsx` | 247 LOC; `authClient.signIn.email` / `signUp.email`; Greek alerts ("Σφάλμα", "Αποτυχία Σύνδεσης") | **REWRITE** | `apps/web/components/auth/login-form.tsx` using `supabase.auth.signInWithPassword` and `signUp`. Translate via `next-intl`. |
| `SafetyTips.tsx` | 5-tip carousel; reads `safety_tip_*` keys | **REWRITE** | `apps/web/components/safety-tips.tsx` — content sourced from `i18n/{el,en}.json`. |
| `Themed.tsx` | Theme-aware Text/View | **DROP** | Tailwind dark mode + shadcn. |

### 2.7 Mobile lib (`mobile/src/lib/`)

| File | Symbols / behavior | Verdict | Destination |
|---|---|---|---|
| `animations.ts` | `TIMING={small,medium,…}`, `EASE_PREMIUM/EASE_OUT`, `SPRING_RESPONSIVE`, `getStaggerDelay`, `useReduceMotion()` | **DROP** | Framer-motion preset (`apps/web/lib/motion.ts`) — drastically simpler on web. |
| `api.ts` | `BACKEND_URL = process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL`; throws on missing; `fetchFn` adds `Cookie: authClient.getCookie()`; `api.{get,post,put,patch,delete}<T>` | **DROP** | Direct `fetch`/Server Actions; cookies handled by Next.js auto. Consider `apps/web/lib/api/client.ts` thin wrapper. |
| `authClient.ts` | `createAuthClient({ baseURL, plugins:[expoClient({scheme:"vibecode", storagePrefix:EXPO_PUBLIC_VIBECODE_PROJECT_ID, storage:SecureStore})], fetchOptions:{credentials:"include"}})` | **DROP** | `apps/web/lib/supabase/{browser,server}.ts` via `@supabase/ssr`. |
| `cityStore.ts` | zustand persist `defaultCity` via AsyncStorage; `name:"city-storage"` | **PORT** | `apps/web/lib/stores/city-store.ts` w/ zustand + `localStorage` (only when V1 Rhodes-only — can collapse to cookie). |
| `cn.ts` | `cn(...inputs)` via `tailwind-merge` + `clsx` | **PORT** | `apps/web/lib/cn.ts` (identical). |
| `conditions.ts` | `CONDITIONS` map, `getCondition/getAllConditions/calculateSuggestedPrice/normalizeConditionKey` | **PORT** | `apps/web/lib/domain/conditions.ts`. |
| `constants.ts` | `PRICING_BANDS`, `GRADE_MULTIPLIERS`, `PANDAS_PRICING_URL`, `VERIFICATION_LABEL` (duplicates `shared/contracts.ts`) | **MERGE** | Move into `apps/web/lib/schemas/listing.ts`; delete duplicate. |
| `languageStore.ts` | 588 LOC; full el/en dictionary (`translations.el`, `translations.en`); `useLanguageStore` zustand persist; `useTranslation()` hook with default fallback to key; Greek = UPPERCASE no-accent | **REPLACE** | `apps/web/i18n/{el,en}.json` consumed by `next-intl`. Lint rule must enforce UPPERCASE-no-accents on `*.el.json` (see `codex-export/10_INTL.md`). |
| `onboardingStore.ts` | zustand persist (`onboardingCompleted, isEligibleCity, selectedCity, waitlistSignup`); hydration hook `useOnboardingHydrated`; `CITIES.greece` (9) + `CITIES.europe` (6); `getAllCities`, `isCityEligible (Rhodes-only)`; `TOURIST_MODE_ENABLED=false` | **PORT** | `apps/web/lib/stores/onboarding-store.ts` (client) + server mirror on `profiles` table. Move city list to SQL `cities` table (already seeded in 005). |
| `responsive.ts` | `useDimensions`, `useGridColumns`, `getCardWidth`, `useResponsiveValue`, `getResponsivePadding`, `useMaxContentWidth`, `isWeb` | **DROP** | Tailwind breakpoints (`sm/md/lg`). |
| `stores.ts` | `V1_STORES = [irepair-rhodes(primary), irepair-spot]` w/ coords + storePageUrl | **MERGE** | Pull from `stores` SQL table. Drop file. |
| `useClientOnlyValue.ts` / `.web.ts` | Hides ssr/csr drift | **DROP** | Use Next.js `"use client"` + dynamic imports. |
| `useColorScheme.ts` / `.web.ts` | Wraps RN Appearance | **DROP** | `next-themes`. |
| `useSession.tsx` | `authClient.useSession()` re-export | **REPLACE** | `apps/web/lib/auth/use-session.ts` — wraps `supabase.auth.onAuthStateChange`. |
| `verification.ts` | `VERIFICATION_LABEL`, `isListingVerified`, `isUserVerified(n>=2)`, `gradeLabels = { A:"ΑΡΙΣΤΗ" #00FF88, B:"ΚΑΛΗ" #00BFFF, C:"ΜΕΤΡΙΑ" #FFD700, D:"ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ" #FF6B6B }` | **PORT** | `apps/web/lib/domain/verification.ts`. |
| `state/example-state.ts` | Template | **DELETE** | — |

### 2.8 Configs / meta

| File | Verdict | Notes |
|---|---|---|
| `mobile/app.json` | DROP | Expo-specific. |
| `mobile/babel.config.js` | DROP | Replace with Next.js SWC; only `module-resolver` `@` alias matters → mapped via tsconfig. |
| `mobile/metro.config.js` | DROP | Next.js bundling. |
| `mobile/tailwind.config.js` | PORT | Carry `fontSize` scale into `apps/web/tailwind.config.ts`. Drop `space` plugin — Tailwind v4 has `gap-*` natively. |
| `mobile/tsconfig.json` | REWRITE | Next.js boilerplate; preserve path aliases (`@/* -> src/*`, `@/shared/*`). |
| `mobile/eslint.config.js` | REWRITE | Replace with `eslint-config-next` flat + `@tanstack/eslint-plugin-query`. |
| `mobile/global.css`, `nativewind-env.d.ts`, `expo-env.d.ts` | DROP | Replace with `app/globals.css`. |
| `mobile/index.ts` | DROP | Next.js owns entry. |
| `mobile/public/manifest.json` | PORT | Web manifest can carry over with name/scheme rewritten from "vibecode" → "Mobile Unit". |
| `mobile/patches/` | DROP | RN-specific patches. |
| `mobile/assets/*.png` | OPTIONAL PORT | 10 PNGs (1.2–2 MB each). Recompress to WebP/SVG before moving to `apps/web/public/onboarding/`. |
| `backend/scripts/{env.sh,start,studio}` | DROP | Vercel build pipeline. |
| `backend/tsconfig.json` | DROP | — |
| `backend/.env` | RECREATE | Replace with `.env.local` per `codex-export/.env.example`. **`BETTER_AUTH_SECRET=vVluXQeh...` should be rotated** (committed in repo). |
| `backend/{server,studio}.log` | IGNORE | Local runtime artifacts. |

---

## 3. Special Location Map

Where the spec-sensitive logic actually lives in source. Use this when migrating each topic so nothing is missed.

| # | Topic | Source locations (file:symbol) |
|---|---|---|
| 1 | **Greek-UPPERCASE-no-accents typography rule** | `mobile/src/lib/languageStore.ts:translations.el` (entire dictionary); `mobile/src/lib/verification.ts:gradeLabels` ("ΑΡΙΣΤΗ", "ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ"); `mobile/src/app/stores.tsx:STORES[*].nameEl`/`hoursNote` |
| 2 | **Trust verification (`n>=2`)** | `mobile/src/lib/verification.ts:isUserVerified`; `backend/prisma/schema.prisma:User.trustEventCount`; `backend/src/routes/users.ts` (GET /me) |
| 3 | **Grading A/B/C/D + multipliers** | `shared/contracts.ts:gradeSchema, GRADE_MULTIPLIERS`; `mobile/src/lib/verification.ts:gradeLabels`; `mobile/src/lib/constants.ts:GRADE_MULTIPLIERS`; `backend/prisma/schema.prisma:GradeConfig` (per-store overrides) |
| 4 | **Pricing bands** | `shared/contracts.ts:PRICING_BANDS`; `mobile/src/lib/constants.ts:PRICING_BANDS`; `mobile/src/lib/conditions.ts:CONDITIONS[*].priceRangePercent`; `mobile/src/app/(tabs)/sell.tsx:getConditionData` |
| 5 | **Pricing anomaly (<30% +25, <50% +15)** | `backend/src/lib/fraud-scoring.ts:checkPricingAnomaly, PRICE_RANGES` (⚠ missing `laptop_*` and `*_parts`) |
| 6 | **Fraud threshold 80 + Missive draft** | `backend/src/lib/fraud-scoring.ts:FRAUD_THRESHOLD, performFraudCheck, applyFraudHold`; `backend/src/lib/missive.ts:createMissiveFraudDraft, MISSIVE_LABEL="Mobile Unit Leads"`; called from `backend/src/routes/listings.ts` (POST, report) and `backend/src/routes/messages.ts` (report) |
| 7 | **Report thresholds (private=2, store=5, 24h)** | `backend/src/routes/listings.ts:POST /:id/report` (`24h` window, `isStore?5:2`); `backend/src/routes/messages.ts:POST /report`; defaults in `backend/prisma/schema.prisma:ModerationConfig` |
| 8 | **Strike decay (90 days)** | `backend/src/lib/chat-moderation.ts:addStrike (expiresAt = now+90d)`; `getActiveStrikes` (unused); schema in `backend/prisma/schema.prisma:UserStrike` |
| 9 | **Restricted cooldown (7 days)** | `backend/src/lib/fraud-scoring.ts:RESTRICTED_COOLDOWN_DAYS=7, applyFraudHold (restrictedUntil = now+7d)` |
| 10 | **Referral code generation ("MU" + 6 chars, 32-char alphabet, no 0/O/I/1)** | `backend/src/routes/waitlist.ts:generateReferralCode, ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"` |
| 11 | **Token rotation (60s, 72h TTL, 6 digits)** | `mobile/src/app/token.tsx:TOKEN_ROTATION_INTERVAL=60, generateCode()` (UI only); `backend/prisma/schema.prisma:Token (code, codeRotatedAt, expiresAt)`; **NO** backend endpoint exists yet |
| 12 | **Conversation ID = sorted IDs joined by "_"** | `backend/src/routes/messages.ts:getConversationId(uid1, uid2)` |
| 13 | **Image spam (3 distinct recipients / 5 min)** | `backend/src/lib/chat-moderation.ts:detectImageSpam(db, senderId, imageHash, 5, 3)`; called from `backend/src/routes/messages.ts:POST /` |
| 14 | **Off-platform / URL redaction** | `backend/src/lib/chat-moderation.ts:URL_PATTERNS, OFF_PLATFORM_PATTERNS, SENDER_TOOLTIP, moderateMessage` |
| 15 | **iRepair partner stores (irepair-rhodes, irepair-spot)** | `mobile/src/lib/stores.ts:V1_STORES`; `mobile/src/app/stores.tsx:STORES` (duplicate w/ richer fields: googleMapsUrl, services, hoursNote); `backend/prisma/schema.prisma:Store, Staff` |
| 16 | **V1 Rhodes-only city gate + city list** | `mobile/src/lib/onboardingStore.ts:CITIES (greece 9 + europe 6), isCityEligible (Rhodes only), TOURIST_MODE_ENABLED=false` |
| 17 | **Diagnostic fee €10 + iRepair info** | `backend/src/routes/assistant.ts:iRepairInfo.diagnosticFee=10`; `mobile/src/app/book-appointment.tsx`; i18n keys `diagnostic_fee*` in `mobile/src/lib/languageStore.ts` |
| 18 | **Pandas pricing URL** | `shared/contracts.ts:PANDAS_PRICING_URL`; `mobile/src/lib/constants.ts:PANDAS_PRICING_URL`; opened in `mobile/src/app/(tabs)/sell.tsx` via `WebBrowser.openBrowserAsync` |
| 19 | **Better Auth integration (Expo plugin, SecureStore)** | `mobile/src/lib/authClient.ts`; `backend/src/auth.ts`; `mobile/src/lib/useSession.tsx`; trusted origins include `vibecode://`, `*.vibecodeapp.com`, `*.vibecode.run` |
| 20 | **Rate limiting** | `backend/src/lib/rate-limiter.ts:{strict,standard,lenient,user}RateLimiter`; mounted on `assistant` route in `backend/src/index.ts` |
| 21 | **Upload constraints (10MB, MIME allowlist)** | `backend/src/routes/upload.ts` (`allowedTypes=["image/jpeg","image/jpg","image/png","image/gif","image/webp"]`, `maxSize=10*1024*1024`) |
| 22 | **Approval workflow (pending/approved/rejected)** | `shared/contracts.ts:listingStatusSchema, listingSchema.status.default("pending")`; `backend/src/routes/listings.ts` (WHERE clause forces `status='approved'`) |

---

## 4. Dependency Audit

### 4.1 Backend (`backend/package.json`)

| Dep | Version | Status | Target |
|---|---|---|---|
| `hono` | 4.6.0 | DROP | Replaced by Next.js Route Handlers |
| `@hono/node-server`, `@hono/zod-validator` | 1.12.0 / 0.7.3 | DROP | Validation via Zod inline; no Hono |
| `@prisma/client`, `prisma`, `@prisma/adapter-better-sqlite3` | 6.17.1 | DROP | `@supabase/supabase-js`, `@supabase/ssr` |
| `better-auth`, `@better-auth/expo` | 1.4.7 | DROP | Supabase Auth |
| `@vibecodeapp/backend-sdk`, `@vibecodeapp/cloud-studio`, `@vibecodeapp/proxy` | * | DROP | Vibecode-runtime — not portable |
| `zod` | 4.1.11 | KEEP | — |
| `@types/bun`, runtime `bun` | — | DROP | Node 20 / Vercel runtime |

### 4.2 Mobile (`mobile/package.json`)

Categorized; only highlights — full list is in the file.

**KEEP (cross-platform-friendly):** `zod 4.1.11`, `zustand 5.0.8` (web-friendly), `@tanstack/react-query 5.90.2`, `clsx 2.1.1`, `tailwind-merge 3.3.1`, `tailwindcss 3.4.18` (upgrade to v4), `date-fns 4.1.0`, `lucide-react-native → lucide-react`, `uuid 11.1.0`, `fuse.js 7.1.0`, `react 19.1.0`, `react-dom 19.1.0`.

**REPLACE (RN → web equivalent):**
- `nativewind 4.2.1` → drop; native Tailwind on web.
- `expo-router 6.0.14` → Next.js App Router.
- `expo-image 3.0.10` → `next/image`.
- `expo-linear-gradient 15.0.7` → CSS gradient.
- `expo-haptics 15.0.7` → `navigator.vibrate` (mobile web) or drop.
- `expo-secure-store 15.0.7` → Supabase `httpOnly` session cookies.
- `expo-web-browser 15.0.9` → `<a target="_blank" rel="noopener noreferrer">`.
- `expo-image-picker / expo-image-manipulator / expo-file-system` → HTML `<input type="file">` + Supabase Storage signed upload.
- `expo-haptics / expo-blur / expo-glass-effect / expo-mesh-gradient` → CSS / framer-motion / drop.
- `react-native, react-native-web, react-native-reanimated, react-native-gesture-handler, react-native-keyboard-controller, react-native-safe-area-context, react-native-screens, react-native-svg, react-native-svg-transformer, react-native-worklets, react-native-mmkv, react-native-purchases, react-native-vision-camera, react-native-maps, react-native-bottom-tabs, react-native-gifted-chat, react-native-markdown-display, react-native-pager-view, react-native-sortables, react-native-edge-to-edge, react-native-collapsible-tab-view, reanimated-tab-view, react-native-calendars, react-native-mask-text, react-native-enriched, react-native-ios-context-menu, react-native-ios-utilities, react-native-ui-datepicker, react-native-view-shot` → **all DROP** for web; replace with shadcn/ui + framer-motion + react-leaflet/Mapbox + react-day-picker as needed.
- `@better-auth/expo`, `better-auth` → `@supabase/supabase-js`, `@supabase/ssr`.
- `@react-native-async-storage/async-storage 2.2.0` → cookies + `localStorage`.
- `@react-native-clipboard/clipboard 1.16.3` → `navigator.clipboard`.
- `@react-native-community/datetimepicker, slider, picker, netinfo, segmented-control, masked-view, menu` → shadcn equivalents.
- `@react-navigation/*` → drop entirely.
- `@shopify/flash-list 2.0.2`, `@shopify/react-native-skia 2.2.21` → drop (use plain rendering or `react-window` if perf demands).
- `victory-native 41.20.1`, `lottie-react-native 7.3.4` → `recharts` + `lottie-react`.
- `@gorhom/bottom-sheet 5.2.6` → shadcn `Sheet`.
- `@codeherence/react-native-header`, `@bottom-tabs/react-navigation`, `@kolking/react-native-avatar`, `@nandorojo/galeria`, `@expo/html-elements`, `@expo/react-native-action-sheet`, `@expo/vector-icons`, `@expo/multipart-body-parser`, `@expo/metro-runtime`, `burnt`, `zeego`, `eventemitter3` → **drop**.
- `openai 4.104.0` (unused in checked code; Anthropic is the target) → DROP.
- `moment 2.30.1` → DROP (use `date-fns`).
- `@vibecodeapp/sdk` → DROP.

**ADD (target):** `next`, `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk` (or `ai` + `@ai-sdk/anthropic`), `next-intl`, `resend`, `@upstash/redis`, `@upstash/ratelimit`, `framer-motion`, shadcn primitives (`@radix-ui/*`), `react-hook-form`, `@hookform/resolvers`.

### 4.3 Patched packages (mobile)

`mobile/patches/` patches `@react-native-menu/menu@1.2.2`, `react-native@0.81.5`, `@expo/cli@54.0.15`, `expo-asset@12.0.9`. **All discarded** in the web migration.

### 4.4 Mobile dev deps

Drop `eslint-config-expo`, `eslint-plugin-simple-import-sort`, `babel-plugin-module-resolver`, `@babel/plugin-proposal-export-namespace-from`, `@babel/core`, `react-native-svg-transformer`, `react-test-renderer`, `@expo/ngrok`. Keep TypeScript, ESLint, Prettier, Jest (or switch to Vitest), `@testing-library/react` (web).

---

## 5. Migration Risk List

Ordered by blocking severity for V1.

### High risk (blockers — must resolve before V1 cutover)

1. **`backend/src/routes/upload.ts` writes to local disk.** Vercel's serverless runtime has a read-only FS outside `/tmp`. Migration **must** swap to Supabase Storage signed URLs. Code in `backend/src/routes/upload.ts:UPLOADS_DIR = path.join(process.cwd(), "uploads")` + `fs.writeFileSync(filePath, buffer)` is fundamentally incompatible.
2. **`backend/src/lib/rate-limiter.ts` is in-memory.** Map-based counters reset on cold start and don't share across serverless invocations. Replace with `@upstash/ratelimit` on Upstash Redis. Currently mounted on `/api/assistant/*` only — V1 must extend to `/api/listings (POST)`, `/api/messages (POST)`, `/api/waitlist (POST)`, `/api/upload (POST)`.
3. **`backend/src/routes/assistant.ts` is a mock keyword switch.** It is NOT an LLM. The handoff bundle assumes Anthropic `claude-haiku-4-5`. Either ship the keyword fallback verbatim (cheap; safe) OR wire Anthropic — but pick one, document it, and gate behind an env flag (`ASSISTANT_PROVIDER=keyword|anthropic`).
4. **`backend/src/routes/appointments.ts` is incomplete.** Only POST/GET. Spec requires approve/cancel/check-in/redeem/conflict-detect. SQL trigger `enforce_appointment_transitions` (in `codex-export/sql/004_*.sql`) presumes API endpoints that don't exist yet.
5. **`backend/src/lib/fraud-scoring.ts:PRICE_RANGES` is incomplete.** Missing `laptop_*` rows and `*_parts` rows for every category. Any anomaly check on those categories silently returns 0 → fraud holds never fire for laptops or parts listings. Fill before launch.
6. **`getActiveStrikes` is defined but never called.** `backend/src/lib/chat-moderation.ts:getActiveStrikes` exists but no route consumes it. Strikes accumulate but never gate behavior. Must be invoked at `POST /api/listings`, `POST /api/messages`, or in middleware.
7. **Better Auth → Supabase Auth migration loses session continuity.** Users currently authed via Better Auth Expo plugin will need a fresh login post-cutover. Plan: dual-write users in Supabase Auth (`auth.users`) during dev, then hard cutover. No portable session token format between the two stacks.
8. **Committed secret: `backend/.env` contains `BETTER_AUTH_SECRET=vVluXQeh2SX7OuvZr3soq6afdjhiz7l4`.** Rotate before any public push. Bundle `MIGRATION_DOSSIER.md` also referenced a PAT (`github_pat_11AYY5I6Y0…`) — already advised user to revoke.

### Medium risk (functional gaps; degrade UX but not blocking)

9. **`mobile/src/app/token.tsx` is fully local.** `generateCode()` runs client-side and never persists. The spec calls for 72h TTL + 60s server-rotated tokens (SQL pg_cron job `rotate_tokens` already in `004`). New endpoint `/api/tokens/me` required.
10. **Two sources of truth for stores.** `mobile/src/lib/stores.ts:V1_STORES` (2 entries, terse) vs. `mobile/src/app/stores.tsx:STORES` (richer: phone/email/googleMapsUrl/services). Consolidate to `stores` table; delete inline.
11. **Two sources of truth for pricing constants.** `shared/contracts.ts:PRICING_BANDS, GRADE_MULTIPLIERS, PANDAS_PRICING_URL` are duplicated in `mobile/src/lib/constants.ts`. Migration should keep only the schemas-layer copy.
12. **`mobile/src/lib/languageStore.ts` is hand-rolled i18n with implicit-fallback to key.** Switching to `next-intl` requires structuring keys into JSON (already split logically by section in the file). Greek-UPPERCASE-no-accent invariant must be enforced via lint rule on `i18n/el.json` (see `codex-export/10_INTL.md`).
13. **Hardcoded contact info in `mobile/src/app/support.tsx:CONTACT_INFO`.** `+30 22410 12345` is a placeholder. Replace with real iRepair contact + move to env or CMS.
14. **CORS is wide open in `backend/src/index.ts`:** `Access-Control-Allow-Origin: <any-origin> with credentials:true`. Tighten to explicit Vercel preview + production domains in target.
15. **`shared/contracts.ts:uploadImageRequestSchema = z.object({ image: z.instanceof(File) })` won't validate on server.** `File` is a browser type. Replace with multipart parsing in the route handler.
16. **`mobile/src/app/onboarding.tsx` is 1241 LOC monolith with inline animation + state machine.** Plan a split into `<WelcomeStep/>`, `<ValueCarousel/>`, `<CityGate/>` in `apps/web/components/onboarding/*` before reproducing UX.
17. **Asset bloat: 10 PNGs total ~13 MB.** Convert to WebP/SVG; pull only what's referenced from `onboarding.tsx` (5 files).
18. **`backend/src/routes/waitlist.ts:signupAttempts` is in-memory** (3/hour/email). Reset on restart. Move to Upstash.

### Low risk (cosmetic / cleanup)

19. `backend/src/routes/sample.ts`, `mobile/src/components/ComponentWithDataFetchingExample.tsx`, `mobile/src/lib/state/example-state.ts` — delete template files.
20. `mobile/src/app/modal.tsx` (15 LOC stub), `mobile/src/app/+html.tsx`, `mobile/src/app/+not-found.tsx` — RN-only; delete.
21. Patches in `mobile/patches/` — drop with React Native.
22. `mobile/package.json.backup-2026-05-11T08-44-31-042Z` — delete from repo.
23. Studio/server logs (`backend/{server,studio}.log`) — `.gitignore` them on web.
24. `mobile/CLAUDE.md`, `mobile/IMPLEMENTATION_PLAN.md`, `mobile/REDESIGN_PLAN.md` — keep as historical reference under `docs/legacy/`.

---

## Quick reference: what to migrate first

1. SQL bundle (`codex-export/sql/001–006`) → Supabase. (Already authored.)
2. `shared/contracts.ts` → `apps/web/lib/schemas/*` (zod schemas + constants).
3. `backend/src/lib/{chat-moderation,fraud-scoring,missive,sanitize}.ts` → `apps/web/lib/{moderation,fraud,missive,sanitize}/`.
4. `mobile/src/lib/{cn,conditions,verification,onboardingStore}.ts` → `apps/web/lib/**`.
5. Auth: Supabase server/browser clients + login form.
6. Routes in this order: `users → listings (GET) → upload → listings (POST) → messages → waitlist → appointments → assistant`.
7. UI: shell layout → home → browse → listing detail → sell → onboarding → waitlist → profile → stores → book → token.
