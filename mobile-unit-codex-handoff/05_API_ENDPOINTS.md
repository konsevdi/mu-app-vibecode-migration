# 05 — API Endpoints

Every endpoint from `backend/src/routes/*.ts` translated to Next.js Route Handlers. Zod schemas come **verbatim from `shared/contracts.ts`** unless explicitly extended.

Conventions:
- All routes live under `app/api/*/route.ts`.
- Validate inputs with `zod`; return `400` with `{ error: ZodIssue[] }` on failure.
- Anon SSR client: `createClient()` from `lib/supabase/server.ts`. Admin client: `createServiceClient()` (server-only, `SUPABASE_SERVICE_ROLE_KEY`).
- Errors: `{ error: string, code?: string }` with appropriate HTTP status.

Legend: `[auth]` = requires Supabase session; `[admin]` = requires `profiles.role IN ('admin','staff')`.

---

## Listings — `app/api/listings/`

### `GET /api/listings`
Query: `getListingsQuerySchema` from contracts. Filters: `category`, `condition`, `search`, `minPrice`, `maxPrice`, `featured`, `verifiedOnly`, `sellerId`, `limit` (default 20), `offset` (default 0).

Behavior:
- Default filter: `status='approved' AND is_active=true AND is_held=false` (anon-visible).
- `verifiedOnly=true` → require `checklist_complete=true AND grade IS NOT NULL`.
- `search` → ILIKE on `title || ' ' || description || ' ' || coalesce(brand,'') || ' ' || coalesce(model,'')`.
- `featured=true` → `is_featured=true`, ordered by `created_at desc`.
- Joins `listing_images` ordered by `sort_order`, aggregates to `images: string[]`.
- Joins `profiles` for the seller summary.

Response: `getListingsResponseSchema` = `{ listings: Listing[], total: number }`.

### `GET /api/listings/:id`
Increment `views` via a trigger or `UPDATE ... RETURNING`. Returns `listingSchema`.

404 if not found or not visible to caller. Owner can see own listings in any status.

### `POST /api/listings` `[auth]`
Body: `createListingRequestSchema`. Validate: images.min(3), title 3-100, description 10-2000, price >= 0, city ∈ eligible cities (lookup `cities.is_eligible=true`).

Flow:
1. Validate. Reject if user is `is_held` or `restricted_mode` (and `restricted_until > now()`).
2. Insert into `listings` with `seller_id = auth.uid()`, `status='pending'`, `is_active=true`.
3. Insert image rows into `listing_images` preserving order.
4. Run fraud score (see `11_FRAUD_AND_MODERATION.md`). If `fraud_score >= moderation_configs.fraud_hold_threshold`, set `is_held=true`, create `fraud_holds` row.
5. Email admin if held.
6. Return `createListingResponseSchema`.

### `PUT /api/listings/:id` `[auth]`
Body: `updateListingRequestSchema` (partial). Owner-only. Cannot modify `grade`, `checklist_complete`, `inspection_date`, `status`, `is_featured`, `fraud_score`, `is_held`.

### `DELETE /api/listings/:id` `[auth]`
Soft delete: `is_active=false`. Cascade-delete `listing_images` rows + storage objects via trigger or background job.

### `PATCH /api/listings/:id/status` `[admin]`
Body: `{ status: 'approved' | 'rejected', reason?: string }`. Writes `audit_logs` row.

### `POST /api/listings/:id/report` `[auth]`
Body: `{ reason: string (1-500) }`. Increments `report_count_24h` for the listing. If threshold (`moderation_configs.private_report_threshold`, default 2) hit within 24h → `is_active=false`, write `auto_action_logs`. Returns `{ success: true }`.

---

## Messages — `app/api/messages/`

### `GET /api/messages/:conversationId` `[auth]`
RLS: only fetches rows where caller is sender or recipient (already enforced). Returns `getMessagesResponseSchema` ordered by `created_at asc`.

### `POST /api/messages` `[auth]`
Body: `sendMessageRequestSchema`. Server computes `conversation_id = [auth.uid(), recipientId].sort().join('_')`.

Flow:
1. Validate content length, image url format.
2. Optional spam check: if `image_hash` matches a recent message from same sender, flag.
3. URL/off-platform detection on content: regex `/(https?:\/\/|www\.|\bphone\b|\bwhatsapp\b|\bviber\b|\btelegram\b)/i` → `flagged_reason='url'` or `'off_platform'`, also set `showSenderTooltip=true` with translated copy.
4. Insert message. Return `sendMessageResponseSchema`.

### `POST /api/messages/report` `[auth]`
Body: `reportMessageRequestSchema`. Insert `chat_reports`. If report count for that message ≥ threshold → soft-hide.

### `GET /api/messages` `[auth]` (PROPOSED — listing user's conversations)
Returns distinct conversation IDs with last message + other participant summary. Backed by the `conversations` view (D8).

---

## Waitlist — `app/api/waitlist/`

### `POST /api/waitlist`
Body: `createWaitlistSignupRequestSchema`.

Flow:
1. Lowercase + trim email.
2. Generate `referral_code` (8 chars `[A-Z0-9]` excluding O/0/I/1 ambiguous).
3. If `referredByCode` provided, look it up; on hit, increment `referral_count` and `position_score += 10` for the referrer (transactional).
4. Insert. Return `createWaitlistSignupResponseSchema`.
5. Send confirmation email via Resend (subject and body from i18n keys `waitlist.email.subject`, `waitlist.email.body`).

Conflict (email already exists): return `409 { error: 'EMAIL_EXISTS' }` so the UI can route to `waitlist-success`.

### `GET /api/waitlist/check/:email`
No auth required (used during signup). Returns `checkWaitlistResponseSchema`. Rate-limited (5 req/min/IP).

### `GET /api/waitlist/referral/:code`
Returns `validateReferralResponseSchema`. Rate-limited (10 req/min/IP). `referrerEmail` is masked (`a***@b.com`) if returned.

### `GET /api/admin/waitlist` `[admin]`
Returns full list paginated for admin UI. CSV export via `?format=csv`.

---

## Assistant — `app/api/assistant/`

### `POST /api/assistant/chat`
Body: `assistantChatRequestSchema`. See `12_AI_ASSISTANT.md` for full logic. Summary:

1. Run keyword router (verbatim from `backend/src/routes/assistant.ts` `KNOWLEDGE_BASE` + `findIntent()`).
2. If matched → return immediately, `reply` from `KNOWLEDGE_BASE[intent].responses[language]`, plus 3 `suggestions` from same entry.
3. If unmatched:
   - Anon caller → return generic fallback (`assistant.fallback.unknown` translation key).
   - Authed caller → check Upstash rate limit `user:${id}:assistant:${YYYY-MM-DD}`. If `<20`, call Claude Haiku 4.5 with the system prompt (see `12`). Increment counter. Cap at 2000 tokens.
4. Return `assistantChatResponseSchema`.

### `GET /api/assistant/suggestions`
Query: `?page=home|browse|sell|listing`. Returns `assistantSuggestionsResponseSchema` — 3 contextual suggestion strings per page. Hardcoded map (see `12`).

---

## Appointments — `app/api/appointments/`

### `POST /api/appointments` `[auth]`
Body: `{ date: ISO string, timeSlot: 'morning' | 'afternoon', listingId?: string, storeId?: string }`. Insert with `status='pending'`. Email user (i18n: `appointment.email.confirmation`).

### `GET /api/appointments` `[auth]`
Returns the user's appointments ordered by `date asc`.

### `PATCH /api/appointments/:id/status` `[admin|staff]`
Body: `{ status, notes?, turnaroundHours? }`. Writes `audit_logs`.

### `GET /api/appointments/availability`
Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD&storeId?`. Returns `{ date, morning: { available, capacity }, afternoon: { available, capacity } }[]`. V1 capacity: hardcoded 4 per slot per store (PROPOSED).

---

## Users / Profiles — `app/api/users/`

### `GET /api/users/me` `[auth]`
Returns own profile + counts: active listings, sold count, trust event count.

### `PATCH /api/users/me/onboarding` `[auth]`
Body: `updateUserOnboardingRequestSchema`. Sets `onboarding_completed`, `selected_city`, `selected_country`, `is_eligible_city`, `language_pref`. Returns `updateUserOnboardingResponseSchema`.

### `GET /api/users/:handle` (PROPOSED)
Public profile page. Returns `{ handle, name, image, trust_event_count, listings_count }`. Used for `/u/[handle]`.

---

## Upload — `app/api/upload/`

### `POST /api/upload/listing-image` `[auth]`
Replaces `backend/src/routes/upload.ts`. Returns a Supabase Storage **signed upload URL** + the eventual public URL.

Body: `{ contentType: 'image/jpeg' | 'image/png' | 'image/webp', filename: string }`.

Response: `{ uploadUrl: string, publicUrl: string, storagePath: string }`. Client PUTs the file directly to `uploadUrl`. Server validates `contentType` and generates `storage_path = listings/${userId}/${uuid()}.${ext}`.

Rate-limited: 30 uploads / hour / user.

### `POST /api/upload/avatar` `[auth]` (PROPOSED)
Same pattern, bucket `avatars`, path `avatars/${userId}.{ext}`.

---

## Auth — `app/api/auth/`

Supabase Auth handles the heavy lifting. The wrapper routes are:

### `POST /api/auth/sign-up`
Body: `{ email, password, name?, languagePref }`. Calls `supabase.auth.signUp`. Trigger inserts `profiles` row. Sends magic-link verification email (Supabase config or Resend custom).

### `POST /api/auth/sign-in`
Body: `{ email, password }`. Calls `supabase.auth.signInWithPassword`. Sets HTTP-only cookies via `@supabase/ssr`.

### `POST /api/auth/sign-out`
Calls `supabase.auth.signOut`. Clears cookies.

### `GET /api/auth/callback?code=...`
OAuth (Google V2) and magic-link callback. Calls `supabase.auth.exchangeCodeForSession`.

### `POST /api/auth/reset-password`
Body: `{ email }`. Calls `supabase.auth.resetPasswordForEmail` with redirect URL.

---

## Admin — `app/api/admin/`

### `GET /api/admin/overview` `[admin]`
Returns: `{ pendingListings, fraudHolds, waitlistCount, last24hReports }`.

### `GET /api/admin/listings` `[admin]`
Query: `?status=pending&page=...`. Same shape as `GET /api/listings` but no public-visibility filter.

### `GET /api/admin/fraud-holds` `[admin]`
Returns active `fraud_holds` joined to the referenced entity. `?resolved=false` default.

### `POST /api/admin/fraud-holds/:id/release` `[admin]`
Sets `resolved_at=now()`, `resolved_by=auth.uid()`. Clears `is_held` on the referenced entity. Audit log.

---

## Rate limiting

| Endpoint | Limit | Key |
|---|---|---|
| `POST /api/assistant/chat` | 20/day for authed; 0/day for anon (router only) | `user:${id}:assistant:${YYYY-MM-DD}` |
| `POST /api/waitlist` | 5/hour/IP | `waitlist:${ip}` |
| `POST /api/listings` | 10/day/user | `listing-create:${id}:${YYYY-MM-DD}` |
| `POST /api/messages` | 60/hour/user | `messages:${id}` |
| `POST /api/upload/*` | 30/hour/user | `upload:${id}` |
| `POST /api/listings/:id/report` | 5/hour/user | `report:${id}` |

All via Upstash `@upstash/ratelimit`. Soft 429 with `{ error: 'RATE_LIMITED', retryAfter: seconds }`.

## Error contracts

```ts
type ApiError =
  | { error: 'VALIDATION', issues: z.ZodIssue[] }            // 400
  | { error: 'UNAUTHORIZED' }                                 // 401
  | { error: 'FORBIDDEN' }                                    // 403
  | { error: 'NOT_FOUND' }                                    // 404
  | { error: 'CONFLICT', reason: string }                     // 409
  | { error: 'RATE_LIMITED', retryAfter: number }             // 429
  | { error: 'HELD', message: string }                        // 423 (locked)
  | { error: 'INTERNAL' };                                    // 500
```

Always JSON, never HTML error pages.
