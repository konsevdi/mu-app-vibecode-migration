# 16 — API Contracts

Web target uses **Server Actions** for mutations originating in the UI, and **Route Handlers** (`app/api/.../route.ts`) for cross-app endpoints (Realtime callbacks, deep links, webhook receivers, signed-URL minting, admin tools that need a stable URL).

Zod schemas live in `lib/contracts.ts` (single file, mirrors `shared/contracts.ts` in source). Use the same schema on the server (parse request) and the client (validate before submit).

## Mapping table — source → target

| Source endpoint | Web target | Type |
|---|---|---|
| `POST /api/listings` | server action `createListing(formData)` | mutation |
| `GET /api/listings` | server-render `/[locale]/browse` with searchParams | RSC |
| `GET /api/listings/:id` | server-render `/[locale]/listing/[slug]` | RSC |
| `PUT /api/listings/:id` | server action `updateListing(id, formData)` | mutation |
| `DELETE /api/listings/:id` | server action `deleteListing(id)` | mutation |
| `POST /api/listings/:id/report` | server action `reportListing(id, reason)` | mutation |
| `POST /api/messages` | server action `sendMessage(payload)` | mutation, returns sanitized message |
| `GET /api/messages/conversations` | server-render `/[locale]/messages` | RSC |
| `GET /api/messages/:conversationId` | RSC + Realtime subscribe | RSC + client |
| `POST /api/messages/:id/report` | server action `reportMessage(id, reason)` | mutation |
| `POST /api/appointments` | server action `bookAppointment(payload)` | mutation |
| `GET /api/appointments` | server-render `/[locale]/appointments` | RSC |
| `POST /api/waitlist` | route handler `app/api/waitlist/route.ts` (POST) | public — anon allowed |
| `GET /api/waitlist/check/:email` | route handler — anon | public |
| `GET /api/waitlist/referral/:code` | route handler — anon | public |
| `PATCH /api/users/onboarding` | server action `completeOnboarding(payload)` | mutation |
| `GET /api/users/me` | server util `getCurrentUser()` | RSC |
| `POST /api/upload/image` | route handler `app/api/upload/sign/route.ts` returning signed URL | special |
| `POST /api/assistant/message` | route handler with streaming response | streaming |
| `POST /api/auth/sign-in/email` | server action via Supabase Auth | mutation |
| `POST /api/auth/sign-up/email` | server action via Supabase Auth | mutation |
| `POST /api/auth/sign-out` | server action | mutation |
| (NEW) `POST /api/admin/listings/:id/approve` | route handler | staff-only |
| (NEW) `POST /api/admin/listings/:id/reject` | route handler | staff-only |
| (NEW) `POST /api/admin/appointments/:id/approve` | route handler | staff-only |
| (NEW) `POST /api/admin/tokens/redeem` | route handler | staff-only |
| (NEW) `POST /api/admin/fraud-holds/:id/resolve` | route handler | super_admin |

## Zod schemas to lift verbatim

Already defined in `shared/contracts.ts`. Copy without modification, then drop the obsolete (`citySchema = z.enum(["rhodes"])` should become free-form text and validate against the cities table at runtime).

```ts
export const categorySchema      = z.enum(["phone","tablet","laptop","accessory"]);
export const conditionSchema     = z.enum(["new","like_new","good","fair","parts"]);
export const gradeSchema         = z.enum(["A","B","C","D"]);
export const listingStatusSchema = z.enum(["pending","approved","rejected","removed","draft","sold"]);
export const interestTypeSchema  = z.enum(["buyer","seller","both"]);
export const langSchema          = z.enum(["el","en"]);
export const timeSlotSchema      = z.enum(["morning","afternoon"]);
```

`citySchema` becomes:

```ts
export const citySchema = z.string().min(1).max(64);
// server-side: validate against `select 1 from public.cities where name = $1`
```

## listingSchema (target)

```ts
export const listingSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1500),
  price: z.number().nonnegative(),
  category: categorySchema,
  condition: conditionSchema,
  brand: z.string().nullable(),
  model: z.string().nullable(),
  images: z.array(z.string()).min(3).max(10),
  city: citySchema,
  grade: gradeSchema.nullable(),
  checklistComplete: z.boolean(),
  inspectionDate: z.string().datetime().nullable(),
  status: listingStatusSchema.default("pending"),
  rejectionReason: z.string().nullable(),
  isActive: z.boolean(),
  isStore: z.boolean(),
  isDemo: z.boolean(),
  viewCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sellerId: z.string().uuid(),
  seller: z.object({
    id: z.string().uuid(),
    handle: z.string().nullable(),
    image: z.string().nullable(),
    trustEventCount: z.number().int().nonnegative(),
  }).optional(),
});
```

Note: `isFeatured` is GONE (source had it; never set anywhere). Replaced by ordering on `created_at desc` + admin `pin` action that sets a separate `pinned_until` column if/when needed.

## sendMessageRequestSchema (verbatim)

```ts
export const sendMessageRequestSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
  imageHash: z.string().optional(),
  listingId: z.string().uuid().optional(),
});
```

## sendMessageResponseSchema

```ts
export const sendMessageResponseSchema = z.object({
  message: messageSchema,
  showSenderTooltip: z.boolean(),
  senderTooltip: z.string().optional(),
});
```

`senderTooltip` is the verbatim string from source: `"Links are blocked for safety. Please share details without links."`

## bookAppointmentRequestSchema

```ts
export const bookAppointmentRequestSchema = z.object({
  date: z.string().date(),                  // YYYY-MM-DD
  timeSlot: timeSlotSchema,
  listingId: z.string().uuid().optional(),
  storeId: z.string().optional(),           // NEW — source omitted, add to support multi-store
  notes: z.string().max(500).optional(),
});
```

## createWaitlistSignupRequestSchema (verbatim)

```ts
export const createWaitlistSignupRequestSchema = z.object({
  email: z.string().email(),
  city: z.string().min(1),
  country: z.string().min(1),
  interestType: z.enum(["buyer","seller","both"]),
  consent: z.boolean().refine((v) => v === true, { message: "Consent is required" }),
  phone: z.string().optional(),
  socialHandle: z.string().optional(),
  notes: z.string().max(500).optional(),
  languagePref: z.enum(["el","en"]).default("el"),
  referredByCode: z.string().optional(),
});
```

## userOnboardingRequestSchema

```ts
export const userOnboardingRequestSchema = z.object({
  selectedCity: z.string().min(1),
  selectedCountry: z.string().min(1),
  isEligibleCity: z.boolean(),
  languagePref: z.enum(["el","en"]).default("el"),
  onboardingCompleted: z.boolean().default(true),
});
```

## assistantMessageRequestSchema

```ts
export const assistantMessageRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  threadId: z.string().uuid().optional(),
});
```

Response is a **streaming** SSE response (not JSON). See `20_AGENTS.md` for the Claude integration.

## Error envelope

Every server action returns a discriminated union — never throw to client.

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: 'validation' | 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limited' | 'held' | 'unknown'; message: string; field?: string };
```

Route handlers return:

```jsonc
// 400
{ "error": "validation", "issues": [/* zod issues */] }
// 401
{ "error": "unauthorized" }
// 403 (held)
{ "error": "forbidden", "code": "held", "message": "Account under review" }
// 429
{ "error": "rate_limited", "retryAfter": 60 }
```

HTTP status mirrors the kind: 400 / 401 / 403 / 404 / 429 / 500.

## Listing hold flow

Source returns 202 on hold (`backend/src/routes/listings.ts:190-194`):

```ts
return c.json({ error: "Listing under review", held: true }, 202);
```

Web target: server action returns

```ts
{ ok: false, code: 'held', message: 'Listing under review' }
```

Client renders a toast and reroutes to `/profile`. Audit log records the hold.

## Idempotency keys

For mutations that the user could double-submit (listing create, appointment booking, waitlist signup), accept an `Idempotency-Key` header. Server stores `(user_id, idempotency_key, response_hash)` for 24h; second call with same key returns cached response.

```sql
create table public.idempotency_keys (
  key          text not null,
  user_id      uuid,
  scope        text not null,
  response_json jsonb not null,
  expires_at   timestamptz not null,
  primary key (scope, key)
);
```

## Pagination

`searchParams.cursor` (opaque base64) and `searchParams.limit` (default 20, max 50). No `offset` — cursor-based to avoid skew under heavy listing churn. Listing search results sorted by `(created_at desc, id desc)` so cursor = `(created_at, id)`.
