# 03 — Backend Routes Export

Every route in the current Hono backend, mapped 1:1 to a Next.js 15 Route Handler.

## Mount table (from `backend/src/index.ts`)

| Mount | Router | Auth req? |
|---|---|---|
| `/api/auth/*` | Better Auth (GET+POST) | — |
| `/uploads/*` | Static file server | public |
| `/api/upload` | `uploadRouter` | yes |
| `/api/sample` | `sampleRouter` | no (DELETE in rebuild) |
| `/api/listings` | `listingsRouter` | mixed |
| `/api/messages` | `messagesRouter` | yes |
| `/api/appointments` | `appointmentsRouter` | yes |
| `/api/waitlist` | `waitlistRouter` | no |
| `/api/users` | `usersRouter` | yes |
| `/api/assistant` | `assistantRouter` | yes, **rate-limited 100/min** |
| `/health` | inline GET | no |

Auth context is set globally in `backend/src/index.ts:40-45` via Better Auth `getSession({ headers })`.

## Route inventory

### Auth (Better Auth → Supabase Auth)

| Current | Next.js |
|---|---|
| `POST /api/auth/sign-up/email` | `app/api/auth/sign-up/route.ts` calling `supabase.auth.signUp` |
| `POST /api/auth/sign-in/email` | `supabase.auth.signInWithPassword` |
| `POST /api/auth/sign-out` | `supabase.auth.signOut` |
| `GET /api/auth/session` | server component `createServerClient(...).auth.getUser()` |

OAuth providers were configured-but-commented in `env.ts` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). **DECIDE**: enable Google + Apple in Supabase dashboard.

### Listings — `backend/src/routes/listings.ts`

| Method | Path | Auth | Behavior | Notes |
|---|---|---|---|---|
| GET | `/api/listings` | no | Filter+paginate. Filters: `category`, `condition`, `search` (title/desc/brand/model contains), `minPrice`, `maxPrice`, `featured`, `verifiedOnly` (grade + checklistComplete), `sellerId`. Default `limit=20`, `offset=0`. Always `isActive=true AND isHeld=false AND status='approved'`. Order: `isFeatured DESC, createdAt DESC`. | Map to `GET /api/listings/route.ts`. Use Zod `getListingsQuerySchema`. |
| GET | `/api/listings/:id` | no | Returns single listing + increments `views`. | Move `views` increment into Postgres function or onClick beacon. |
| POST | `/api/listings` | yes | Checks `dbUser.isHeld \|\| dbUser.tokensDisabled` → 403. Creates listing in `pending` status. Runs `performFraudCheck` (pricing anomaly). If score ≥ 80 → applies listing+user fraud hold, creates Missive draft, returns 202. | RLS gates ownership; fraud check stays in server action. |
| PUT | `/api/listings/:id` | yes | Ownership check (`sellerId === user.id`) → 403 if not. Partial update of any creatable field. | RLS enforces ownership without manual check. |
| DELETE | `/api/listings/:id` | yes | Ownership check. Hard delete. | Soft-delete preferred: add `deleted_at timestamptz`. **DECIDE**. |
| POST | `/api/listings/:id/report` | yes | Increments `reportCount24h` (resets if `lastReportAt < now - 24h`). Auto-hides at `>=2` (private) or `>=5` (`isStore`). Adds 10 to `fraudScore`. Adds strike to seller. If auto-hidden → Missive draft. | Move thresholds into ModerationConfig lookups, not hardcoded. |

**Helper** `transformListing(listing)` — parses `images` JSON, ISO-stringifies dates. Web version: not needed if `images` is `text[]` in Postgres.

### Messages — `backend/src/routes/messages.ts`

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/messages` | Body: `{ recipientId, content, imageUrl?, imageHash?, listingId? }`. Derives `conversationId = [user.id, recipientId].sort().join("_")`. Runs `moderateMessage(content)`: URL regex + off-platform regex → replaces with `[Link removed for safety]`, sets `flaggedReason`, returns `showSenderTooltip=true`. Runs `detectImageSpam(db, senderId, imageHash)` — 3 recipients same hash in 5 min → flag. Stores message with sanitized content. |
| GET | `/api/messages/:recipientId` | Returns messages in convo where `isHidden=false OR senderId=user.id` (sender sees their own flagged content). |
| POST | `/api/messages/report` | Body: `{ messageId, reason }`. Creates `chat_report`, soft-hides message (`isHidden=true, flaggedReason='reported'`), adds strike to sender. |

### Appointments — `backend/src/routes/appointments.ts`

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/appointments` | Body: `{ date, timeSlot ('morning'\|'afternoon'), listingId?, notes? }`. Always creates with `status='pending'`. **MISSING**: no slot-conflict check, no store_id assignment, no token issuance. |
| GET | `/api/appointments` | Returns user's appointments ordered `date DESC`. |

**MISSING in current code**: approve/reject endpoint, check-in endpoint, token issuance endpoint.

### Waitlist — `backend/src/routes/waitlist.ts`

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/waitlist` | In-memory rate limit by email: 3/hour. If email exists → returns existing row (no duplicate). Else: generates `referralCode` (`MU` + 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — excludes I, O, 1, 0). Validates `referredByCode`: if exists and != self → `referralCount += 1`, `positionScore += 3` on referrer. Inserts signup. |
| GET | `/api/waitlist/check/:email` | Returns `{ exists, signup? }`. |
| GET | `/api/waitlist/referral/:code` | Uppercases code. Returns `{ valid, referrerEmail? }`. Email is masked: `first 2 chars + "***@" + domain`. |

### Users — `backend/src/routes/users.ts`

| Method | Path | Behavior |
|---|---|---|
| PATCH | `/api/users/onboarding` | Body: `{ onboardingCompleted?, selectedCity?, selectedCountry?, isEligibleCity?, languagePref? }`. |
| GET | `/api/users/me` | Returns id, email, name, image, onboardingCompleted, selectedCity, selectedCountry, isEligibleCity, languagePref, defaultCity, trustEventCount. |

### Upload — `backend/src/routes/upload.ts`

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/upload/image` | Multipart `image` field. MIME allowlist: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`. Max 10 MB. Saves to `uploads/{uuid}{ext}`. Returns `{ success, message, url: "/uploads/{filename}", filename }`. |

**Rebuild**: see `09_IMAGE_UPLOAD_AND_STORAGE_EXPORT.md`. Replace with Supabase Storage signed-URL pattern.

### Assistant — `backend/src/routes/assistant.ts`

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/assistant/chat` | **MOCKED** — keyword-matching switch (pricing → safety → iRepair → recommendations → selling → default). Returns hardcoded markdown strings + suggestion chips. No actual LLM call. |
| GET | `/api/assistant/suggestions?page=X&language=Y` | Returns hardcoded suggestion array per page (`home`, `browse`, `sell`, `listing`). |

**Rate-limited**: `standardRateLimiter` (100 req/min/IP) applied via `app.use("/api/assistant/*", standardRateLimiter)` at `backend/src/index.ts:94`.

**Rebuild**: replace `generateResponse()` with Anthropic Claude (`claude-haiku-4-5-20251001`) call. System prompt includes PRICING_BANDS, GRADE_MULTIPLIERS, iRepair info, safety tips. See `19_CANONICAL_BUILD_DECISIONS.md`.

### Health — inline

`GET /health` returns `{ status: "ok" }` — port to `app/api/health/route.ts`.

## Middleware

### CORS (`backend/src/index.ts:26-34`)

```ts
cors({
  origin: (origin) => origin || "*",
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization", "expo-origin"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
})
```

**Rebuild**: Next.js handles CORS via `middleware.ts`. Drop `expo-origin`. Allowed origins → exact list (production domain + localhost).

### Rate limiting

`backend/src/lib/rate-limiter.ts` exports three pre-configured limiters:
- `standardRateLimiter` — 100 req/min
- `strictRateLimiter` — 10 req/min
- `lenientRateLimiter` — 300 req/min
- `userRateLimiter(config)` — keys by user.id if authenticated, else IP

In-memory `Map<string, { count, resetTime }>`, cleaned every 60s. **Single-instance only**. Move to Upstash Redis for Vercel multi-instance.

Currently applied only to `/api/assistant/*`. Recommended additions:
- `strictRateLimiter` on `POST /api/listings`, `POST /api/messages`, `POST /api/messages/report`, `POST /api/waitlist`
- `standardRateLimiter` on `GET /api/listings`, `GET /api/messages/:recipientId`

### Auth middleware

`backend/src/index.ts:40-45`:

```ts
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});
```

**Rebuild**: per-route handler `const supabase = createServerClient(...); const { data: { user } } = await supabase.auth.getUser();` — or a shared `getUser()` helper in `lib/auth.ts`.
