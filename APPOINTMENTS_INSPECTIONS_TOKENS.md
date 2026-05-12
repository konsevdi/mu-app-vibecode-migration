# APPOINTMENTS, INSPECTIONS & TOKENS MIGRATION SPEC

**Status:** Appointments partially implemented (book + list only). Inspections, tokens, stores have schema but **no backend routes**. Token UI is client-side simulation.
**Target:** Supabase Postgres + Next.js web + React Native (Expo) mobile.
**Date:** 2026-05-12
**Source files:**
- `backend/prisma/schema.prisma` (Appointment, Store, Staff, Inspection, Token, FraudHold, AuditLog)
- `backend/src/routes/appointments.ts`
- `mobile/src/app/book-appointment.tsx`
- `mobile/src/app/stores.tsx`
- `mobile/src/app/token.tsx`

---

## 1. APPOINTMENT BOOKING

### 1.1 Current mobile route

`mobile/src/app/book-appointment.tsx` (Expo Router → `/book-appointment`).

Accepts query param `listingId` via `useLocalSearchParams<{ listingId?: string }>()` (line 35). Typical entry from a listing detail screen with `router.push({ pathname: "/book-appointment", params: { listingId } })`.

### 1.2 Form fields

| Field | UI | Type | Required | Source |
|---|---|---|---|---|
| `date` | Horizontal scroll of next 14 days, Sundays excluded | ISO string | yes | client-generated (`generateDates`, lines 14-27) |
| `timeSlot` | Two pill buttons: "morning" / "afternoon" | enum | yes | hardcoded; morning = 09:00-14:00, afternoon = 14:00-21:00 (display only) |
| `listingId` | Implicit from URL param | string \| null | no | passed through to backend |
| `notes` | **Not in UI** | string | no | accepted by backend Zod, never sent by mobile |

Submit handler (`book-appointment.tsx:42-50`):
```ts
return api.post("/api/appointments", {
  date: selectedDate.toISOString(),
  timeSlot: selectedSlot,
  listingId: listingId ?? null,
});
```

Also offers an "external booking" link (`https://public.irepair.gr/service-app`) opened via `WebBrowser.openBrowserAsync`.

### 1.3 Validation (current)

**Client (mobile):**
- 14-day window: `for (let i = 1; i <= 14; i++)` (line 18).
- Sunday excluded: `if (date.getDay() !== 0)` (line 22).
- Both date and time slot must be selected to enable the submit button (`disabled={!selectedDate || !selectedSlot}` line 177).
- Day 0 (today) excluded — loop starts at `i = 1`.

**Server (Zod, `appointments.ts:15-20`):**
```ts
const createAppointmentSchema = z.object({
  date: z.string(),
  timeSlot: z.enum(["morning", "afternoon"]),
  listingId: z.string().nullable().optional(),
  notes: z.string().optional(),
});
```
That's it. No date-range check, no Sunday check, no future-date check, no duplicate-booking check, no held-user check, no auth-role check — only that the user is logged in.

### 1.4 Backend route

`POST /api/appointments` (`backend/src/routes/appointments.ts:21-46`):

```ts
appointmentsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json();
    const data = createAppointmentSchema.parse(body);

    const appointment = await db.appointment.create({
      data: {
        userId: user.id,
        listingId: data.listingId ?? null,
        date: new Date(data.date),
        timeSlot: data.timeSlot,
        notes: data.notes ?? null,
      },
    });

    return c.json({
      id: appointment.id,
      date: appointment.date.toISOString(),
      timeSlot: appointment.timeSlot,
      status: appointment.status,
    }, 201);
  } catch (error) {
    console.error("Error creating appointment:", error);
    return c.json({ error: "Failed to create appointment" }, 500);
  }
});
```

`GET /api/appointments` (`appointments.ts:48-74`) returns the caller's own appointments, ordered by `date desc`.

No PATCH/PUT/DELETE endpoints exist.

### 1.5 Prisma model

`backend/prisma/schema.prisma:193-212`:
```prisma
model Appointment {
  id                 String   @id @default(cuid())
  userId             String
  listingId          String?
  storeId            String?
  date               DateTime
  timeSlot           String   // "morning" or "afternoon"
  status             String   @default("pending")
  tokenId            String?  @unique
  diagnosticRedeemed Boolean  @default(false)
  turnaroundHours    Int?
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([userId])
  @@index([listingId])
  @@index([storeId])
  @@map("appointment")
}
```

`storeId` is in the schema but **never set by any route today** — every appointment is created with `storeId = null`.

### 1.6 Status values

Default: `"pending"`. Documented in schema comment: `"pending" | "approved" | "checked_in" | "completed" | "cancelled"`. No route currently transitions status; once created, every row stays `pending` forever.

### 1.7 User permissions (today)

- Any authenticated user can POST `/api/appointments`.
- Any authenticated user can GET `/api/appointments` (own only — filtered by `userId`).
- No admin / staff / store-manager endpoints exist.

### 1.8 Store selection behavior

There is no store picker in the booking flow. `mobile/src/app/stores.tsx` is a separate **read-only** display page with hardcoded data. The booking POST does **not** include a `storeId`.

For V1, since there is currently only one primary store (`iRepair Rhodes`), the server should default `storeId` to the primary store row.

### 1.9 Listing context behavior

`listingId` is passed through from the URL → request body → DB row. It is not validated (no check that the listing exists or that the user is the buyer/seller) and has no side effects on the listing.

### 1.10 Response shape (current)

```json
{
  "id": "cl…",
  "date": "2026-05-13T00:00:00.000Z",
  "timeSlot": "morning",
  "status": "pending"
}
```
HTTP 201 on success, 401 unauthorized, 500 on any thrown error (including Zod parse failures — gap; should be 400).

---

## 2. APPOINTMENT RULES

### 2.1 Future date

**Not enforced server-side.** Client only offers days `today + 1 … today + 14`. A malicious or buggy client can POST a past date and it will be accepted.

V1: `check (date::date >= current_date)` at DB level + Zod refinement on the route.

### 2.2 Max 14 days

**Not enforced server-side.** Client cap only. V1: refinement `(new Date(data.date).getTime() - Date.now()) / 86400000 <= 14`.

### 2.3 Sundays excluded

**Not enforced server-side.** Client cap only. V1: refinement `new Date(data.date).getUTCDay() !== 0`. Beware UTC vs local — Greece is UTC+2/+3; doing the check in UTC may misclassify late-evening Saturday submissions as Sunday. Convert to Europe/Athens before checking.

### 2.4 Time slots

Hardcoded enum `"morning" | "afternoon"`. Display strings in mobile UI: morning = 09:00-14:00, afternoon = 14:00-21:00. No per-store hours validation today.

V1: Slots should be derived from `Store.hours` and a configurable per-store capacity (e.g. 8 slots per morning).

### 2.5 Duplicate booking behavior

**Not handled.** A user can book the same `(date, timeSlot)` arbitrarily many times. The DB has no unique constraint on `(userId, date, timeSlot)`.

V1: unique partial index `unique (user_id, date, time_slot) where status in ('pending','approved','checked_in')`. Returning a clear 409 with the existing appointment.

### 2.6 Cancelled appointment behavior

No cancel route. Once `status = "cancelled"` (set via admin tool that doesn't exist), there is no automatic refund of any diagnostic fee, no token revocation (none exists), and no listing-side update.

V1: cancel route sets status, revokes any active token (`is_active = false`), and removes the slot from any per-store capacity counter.

### 2.7 Held / restricted user behavior

`User.isHeld`, `User.restrictedMode`, `User.restrictedUntil`, `User.tokensDisabled` exist on the User model but **none are checked** in the appointment route. A held user can book freely today.

V1: handler-side guard:
```ts
if (user.isHeld) return c.json({ error: "Account under review" }, 403);
if (user.restrictedMode && (!user.restrictedUntil || user.restrictedUntil > new Date())) {
  return c.json({ error: "Account restricted" }, 403);
}
```
And matching RLS policy on insert (see §8).

---

## 3. STORE BEHAVIOR

### 3.1 Hardcoded stores (mobile)

`mobile/src/app/stores.tsx:27-63`. Two stores, both in Rhodes:

**Store 1 — `irepair-rhodes` (primary)**
- Name (EN): "iRepair Rhodes"
- Name (EL): "iRepair ΡΟΔΟΣ"
- Address: "Αμμοχωστου 18, 85131, Ροδος, Ελλαδα" / "Ammochostou 18, 85131, Rhodes, Greece"
- Phone: `+302241034175`
- Email: `rhodes@irepair.gr`
- Hours: 09:00-19:00 (Mon-Fri), 09:00-15:00 (Sat)
- Coordinates: `36.4493557, 28.2202755`
- Services: ΔΙΑΓΝΩΣΤΙΚΑ, ΕΠΙΣΚΕΥΕΣ, ΑΞΙΟΛΟΓΗΣΗ, ΠΩΛΗΣΕΙΣ
- Website: `https://irepair.gr/rhodes`
- Google Maps: `https://maps.app.goo.gl/34kjfjbVnCZSGNCc9`
- `isPrimary: true`

**Store 2 — `irepair-spot`**
- Name (EN): "iRepair Spot"
- Name (EL): "iRepair Spot @ Public + home Νεα Μαρινα"
- Address: "Αυστραλιας 84-86, 85100, Ροδος, Ελλαδα" / "Australias 84-86, 85100, Rhodes, Greece"
- Phone: `+302241077637`
- Email: `publicrhodes@irepair.gr`
- Hours: 09:00-17:00 (Mon-Fri)
- Coordinates: `36.4378, 28.2406`
- Services: ΔΙΑΓΝΩΣΤΙΚΑ, ΑΞΙΟΛΟΓΗΣΗ
- Website: `https://irepair.gr/rhodes`
- Google Maps: `https://maps.app.goo.gl/S5tHHt7Lu6VBDT768`
- `isPrimary: false`

### 3.2 `Store` table fields (Prisma)

`backend/prisma/schema.prisma:215-241`:
```prisma
model Store {
  id                String   @id @default(cuid())
  name              String
  nameEl            String
  address           String
  addressEn         String?
  phone             String?
  hours             String?
  hoursNote         String?
  lat               Float?
  lng               Float?
  isPrimary         Boolean  @default(false)
  visibleInApp      Boolean  @default(true)
  promoEnabled      Boolean  @default(true)
  partnerStatus     String   @default("owned")  // "owned" | "partner"
  leadFeePerCheckin Float    @default(0)
  leadFeePerRedeem  Float    @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  staff             Staff[]
  inspections       Inspection[]
  tokens            Token[]
  @@map("store")
}
```

Fields present in the hardcoded mobile data but **missing on the schema**: `email`, `services[]`, `hoursSat`, `website`, `googleMapsUrl`. V1 must add these (or model them as side tables — `StoreService`, `StoreHours`).

### 3.3 Missing store management API

No `/api/stores` endpoints exist. No admin endpoints to create/update stores or assign staff. Today the only way to add a store is to insert a row directly into the DB.

### 3.4 Recommended seed strategy

Create `backend/prisma/seed-stores.ts`:

```ts
await prisma.store.upsert({
  where: { id: "irepair-rhodes" },
  update: {},
  create: {
    id: "irepair-rhodes",
    name: "iRepair Rhodes",
    nameEl: "iRepair ΡΟΔΟΣ",
    address: "Αμμοχωστου 18, 85131, Ροδος, Ελλαδα",
    addressEn: "Ammochostou 18, 85131, Rhodes, Greece",
    phone: "+302241034175",
    hours: "Mon-Fri 09:00-19:00, Sat 09:00-15:00",
    hoursNote: "ΔΕΥ-ΠΑΡ 09:00-19:00, ΣΑΒ 09:00-15:00",
    lat: 36.4493557,
    lng: 28.2202755,
    isPrimary: true,
    visibleInApp: true,
  },
});
```
Run via `bunx prisma db seed` after each migration. Mobile should fetch from `GET /api/stores` instead of the hardcoded constant.

---

## 4. INSPECTION WORKFLOW

### 4.1 Current `Inspection` schema

`backend/prisma/schema.prisma:261-275`:
```prisma
model Inspection {
  id            String   @id @default(cuid())
  listingId     String
  storeId       String
  store         Store    @relation(fields: [storeId], references: [id])
  inspectorId   String   // Staff userId
  grade         String   // "A" | "B" | "C" | "D"
  checklistJson String   // JSON object with checklist items
  notes         String?
  inspectedAt   DateTime @default(now())

  @@index([listingId])
  @@index([storeId])
  @@map("inspection")
}
```

### 4.2 Implemented endpoints

**None.** Grep on `/home/user/workspace/backend/src/routes/` finds no `inspection*` route file and no inspection logic in `listings.ts`.

### 4.3 Implemented UI

**None.** No inspector / staff console exists in the mobile app or anywhere else.

### 4.4 Grade fields

Schema stores a single `grade` string. No min/max, no scoring sub-fields. Listing model has `grade` and `checklistComplete` fields that would mirror this, but no code currently writes them from an inspection.

V1 grading rubric (recommended, since none exists):

| Grade | Meaning | UI label |
|---|---|---|
| `A` | Like new — no functional or cosmetic issues | A — Mint |
| `B` | Minor cosmetic wear, fully functional | B — Good |
| `C` | Visible wear or one minor functional issue | C — Fair |
| `D` | Significant wear or functional defect | D — As-is |

### 4.5 `checklist_json` shape (recommended — not currently defined)

```ts
type ChecklistV1 = {
  version: "1.0";
  device: { brand: string; model: string; imei?: string; serial?: string };
  cosmetic: {
    screen: "ok" | "scratches" | "cracked";
    body:   "ok" | "scuffs" | "dented";
    camera: "ok" | "scratched";
  };
  functional: {
    display: "ok" | "dead_pixels" | "lines";
    touch: "ok" | "unresponsive_areas";
    battery_health_pct?: number;     // 0-100
    speakers: "ok" | "muffled" | "dead";
    microphone: "ok" | "muffled" | "dead";
    cameras: "ok" | "blurry" | "broken";
    wifi: "ok" | "fail";
    bluetooth: "ok" | "fail";
    cellular: "ok" | "fail";
    face_id_or_touch_id: "ok" | "fail" | "n/a";
    charging_port: "ok" | "intermittent" | "broken";
  };
  software: { icloud_locked: boolean; mdm_locked: boolean; us_carrier_locked: boolean };
  evidence: { photo_urls: string[] };
};
```
Store as a JSON column (`jsonb` in Postgres) so we can index sub-fields later.

### 4.6 Inspector permissions

Defined by `Staff.role` (schema: `"super_admin" | "admin" | "store_manager" | "moderator"`). No role-check middleware exists today.

V1: any active `Staff` row for the inspection's `storeId` with role in `("super_admin","admin","store_manager")` can create an inspection. `moderator` is for chat reports only.

### 4.7 Listing update after inspection

**Not implemented.** Inspection creation should (V1) transactionally:
1. Insert `inspection` row.
2. Update `listing` → `grade = inspection.grade`, `checklistComplete = true`, optionally `inspectionDate = inspection.inspectedAt`.
3. Mark the originating `appointment` → `status = "completed"`, `diagnosticRedeemed = true` (if applicable).
4. Insert `audit_log` row (`action = "create_inspection"`, `entityType = "inspection"`, `entityId = inspection.id`).

### 4.8 Missing pieces

- All routes (POST create, GET by listing, PATCH for re-grade).
- Staff console UI.
- Side-effect transaction (listing grade update, appointment completion, audit log).
- Photo upload pipeline for evidence URLs (could reuse the chat image upload path).
- Grade dispute / appeal flow (probably V2).

---

## 5. TOKEN WORKFLOW

### 5.1 Current `Token` schema

`backend/prisma/schema.prisma:278-298`:
```prisma
model Token {
  id            String    @id @default(cuid())
  type          String    // "appointment" | "reservation"
  entityId      String    // Appointment or Reservation ID
  userId        String
  storeId       String?
  store         Store?    @relation(fields: [storeId], references: [id])
  code          String    // Current 6-digit code
  codeRotatedAt DateTime  @default(now())
  isActive      Boolean   @default(false)   // Enabled after admin approval
  isRedeemed    Boolean   @default(false)
  redeemedAt    DateTime?
  redeemedById  String?
  expiresAt     DateTime
  createdAt     DateTime  @default(now())

  @@unique([entityId, type])
  @@index([code])
  @@index([userId])
  @@map("token")
}
```

### 5.2 Rotating 6-digit code logic

**Not implemented server-side.** The schema captures intent (`code`, `codeRotatedAt`) but nothing writes these fields today.

Client-side simulation in `mobile/src/app/token.tsx`:
```ts
const TOKEN_ROTATION_INTERVAL = 60; // seconds
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// setInterval(…1000ms…) counts down; on hit zero, generates a new random 6-digit code locally.
```
This is purely cosmetic — the code never reaches the server, never gets validated, never represents an actual booking.

### 5.3 Code rotation interval

Documented intent: **60 seconds** (schema comment "rotation 60s" line 278, client `TOKEN_ROTATION_INTERVAL = 60`).

V1 backend approach: derive the active code from a deterministic HMAC of `(token.id, floor(now()/60))`. No DB write per rotation; the staff scanner submits `code`, server recomputes for the current and previous 60s window and accepts either.

### 5.4 `expires_at` logic

Schema comment: "TTL 72h after approval" (line 278). Recommended: `expiresAt = approvedAt + 72h`. Setting `expiresAt` when admin sets `isActive = true`.

After `expiresAt`, the token is dead: redeem endpoint returns 410 Gone.

### 5.5 Redeem behavior

Currently: no redeem endpoint at all.

V1 contract:
```http
POST /api/tokens/redeem
Authorization: Bearer <staff session>
Body: { storeId: string, code: string }

200 { tokenId, appointmentId, userId, redeemedAt }
404 — no token matches code for this store/time window
410 — token expired
409 — token already redeemed
403 — caller is not staff at this storeId
```
Atomic update: `update token set is_redeemed = true, redeemed_at = now(), redeemed_by_id = staff.id where id = X and is_redeemed = false` then check `rowCount = 1` (else 409). Side effects: `appointment.status = "checked_in"`, `audit_log` row.

### 5.6 `tokensDisabled` behavior

`User.tokensDisabled: Boolean @default(false)` exists (User model). Set to `true` by `applyFraudHold` (fraud-scoring lib). Currently **not checked anywhere**. V1: token creation must skip / fail for `tokensDisabled = true` users; redeem must reject too.

### 5.7 Appointment approval creates token?

**No.** No approval endpoint, no token-creation side effect. The `@@unique([entityId, type])` constraint hints at the intent: exactly one active token per appointment.

V1 flow: `PATCH /api/admin/appointments/:id { status: "approved" }` → upsert one `token` row with `entityId = appointmentId, type = "appointment", isActive = true, expiresAt = now() + 72h`, and set `appointment.tokenId = token.id`.

### 5.8 Current `/token` route status

`mobile/src/app/token.tsx` exists and renders a fake rotating 6-digit code with a countdown ring. It does not fetch from the backend. The screen is reachable but not wired to any real appointment.

### 5.9 Missing UI / endpoints

- `POST /api/admin/appointments/:id/approve` (creates token).
- `POST /api/tokens/redeem` (staff).
- `GET /api/tokens/active?type=appointment&entityId=…` (user fetches their own).
- Staff scanner UI (web) — likely Next.js admin console; not in mobile scope.
- Mobile token screen needs to fetch a real token, then render the **server-derived** rotating code (HMAC + countdown locally synced to server time).

---

## 6. V1 RECOMMENDATION (opinionated)

### 6.1 Must ship in V1

- **POST /api/appointments** with full validation (Sunday block, future-date, ≤14 days, held-user block, single active booking per user-day-slot).
- **GET /api/appointments** (own).
- **PATCH /api/admin/appointments/:id** for status transitions: `pending → approved → checked_in → completed | cancelled`.
- **Stores in DB** + **GET /api/stores** so the mobile picker is data-driven.
- **Staff role check middleware** that reads from `Staff` table.
- **Audit log writes** for every status change (the schema is there; just call `prisma.auditLog.create` inside each admin action).
- **One-pager admin web console** (Next.js) for staff to approve/cancel/check-in.

### 6.2 Admin-only in V1

- Inspection creation (POST /api/admin/inspections) with grade + checklist JSON, called from the admin console.
- Token redeem (POST /api/tokens/redeem) — only callable by staff.
- All FraudHold review actions for `entityType = "appointment"`.

### 6.3 Defer to V1.5 / V2

- Per-store capacity / specific time slot allocation (we ship with two buckets: morning/afternoon).
- Inspector mobile UI — staff can use the admin web console for now.
- Per-store hours-aware booking slots.
- Email confirmations (V1.5; SMS later).
- Partner billing (`leadFeePerCheckin`, `leadFeePerRedeem`) — schema exists, defer logic.
- Inspection dispute / re-grade flow.

### 6.4 Should rotating token be in V1?

**Yes — but minimal.** A static 8-char code at approval time would work for a single store, but rotating tokens give us:
- No screenshot resale (codes are valid for 60s).
- Free abuse signal: a code submitted hours late is suspicious.

Implementation: derive on the server (`HMAC(secret, tokenId || floor(now/60))`) — no DB write per rotation, no cron job needed. Client polls `GET /api/tokens/:id` once every ~5 min for clock drift sync, then generates the displayed code locally from `tokenId + serverTimeOffset`. Staff scanner submits `code` to `/api/tokens/redeem`; server checks the current window and the previous 60s window for clock-skew tolerance.

### 6.5 Should inspector UI be in V1?

**No — admin web console is enough.** Mobile inspector UI is an iPad-class feature with photo capture, multi-step checklist, and offline support. Until we have ≥3 stores, a desktop console (laptop in the shop) is faster to ship and easier to fix.

### 6.6 Do appointments need email confirmation in V1?

**Not blocking — but cheap to add.** The mobile UI already shows an in-app `appointment_booked` alert. For V1:
- Send a confirmation email on POST (Resend or similar) — single template.
- Skip SMS, calendar invites (.ics), reminders — V1.5.

If we cannot wire email in time, the in-app confirmation + the staff console (which can phone the customer) is acceptable for two stores in Rhodes.

---

## 7. ADMIN / STAFF WORKFLOWS

All routes below assume a `requireStaff(role[])` middleware that resolves `Staff` for the caller and matches one of the allowed roles. All routes write to `audit_log` in the same transaction.

### 7.1 Approve appointment

```http
PATCH /api/admin/appointments/:id { storeId: "...", turnaroundHours?: number }
```
Roles: `super_admin | admin | store_manager`.

Transaction:
1. `appointment.status: "pending" → "approved"`; assign `storeId`, `turnaroundHours`.
2. Upsert `token { entityId=:id, type:"appointment", userId, storeId, isActive:true, expiresAt: now+72h, code: <hmac-seed> }`.
3. `appointment.tokenId = token.id`.
4. `audit_log { action: "approve_appointment", entityType: "appointment", entityId: :id, details: { storeId, turnaroundHours } }`.

### 7.2 Cancel appointment

```http
PATCH /api/admin/appointments/:id/cancel { reason: string }
```
Roles: `super_admin | admin | store_manager`. (Owner can also cancel via separate user endpoint.)

Transaction:
1. `appointment.status → "cancelled"`.
2. If token exists: `token.isActive = false`.
3. `audit_log { action: "cancel_appointment", details: { reason, cancelledBy: "staff"|"user" } }`.

### 7.3 Check in appointment

Driven by token redeem (§5.5). Direct route only as fallback:
```http
PATCH /api/admin/appointments/:id/check-in
```
Roles: `super_admin | admin | store_manager`.
- `status → "checked_in"`; `token.isRedeemed = true, redeemedAt = now, redeemedById = staff.id`.
- `audit_log { action: "check_in_appointment" }`.

### 7.4 Complete appointment

Driven by inspection creation (§7.6); also direct route:
```http
PATCH /api/admin/appointments/:id/complete
```
Roles: `super_admin | admin | store_manager`.
- `status → "completed"`; `diagnosticRedeemed = true` if applicable.
- `audit_log { action: "complete_appointment" }`.

### 7.5 Assign inspector

```http
PATCH /api/admin/appointments/:id/assign { inspectorId: string }
```
Roles: `super_admin | admin | store_manager`. Validates `inspectorId` is active staff at this store. No status change; written to `audit_log`. (We can also store the inspector on the appointment if helpful — add column `assignedInspectorId`.)

### 7.6 Create inspection

```http
POST /api/admin/inspections { listingId, storeId, appointmentId?, grade, checklistJson, notes? }
```
Roles: `super_admin | admin | store_manager`.

Transaction:
1. Insert `inspection`.
2. `listing.grade = inspection.grade`; `listing.checklistComplete = true`.
3. If `appointmentId`: `appointment.status → "completed"`.
4. `audit_log { action: "create_inspection", entityId: inspection.id, details: { listingId, grade } }`.

### 7.7 Update listing grade

Same as 7.6 — grade lives on `Inspection`. The listing's `grade` column is denormalized for fast filtering. Re-grade = create a new `Inspection`; the latest one (`order by inspectedAt desc`) is authoritative.

### 7.8 Write audit log

Every admin route inserts:
```ts
await tx.auditLog.create({
  data: {
    actorId: staff.userId,
    actorRole: staff.role,
    action,                            // e.g. "approve_appointment"
    entityType,                        // "appointment" | "inspection" | "token"
    entityId,
    details: JSON.stringify(extra),
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  },
});
```

---

## 8. SUPABASE SCHEMA / RLS

### 8.1 Postgres tables (deltas from Prisma)

```sql
create table public.stores (
  id                   text primary key,
  name                 text not null,
  name_el              text not null,
  address              text not null,
  address_en           text,
  phone                text,
  email                text,
  hours                text,
  hours_sat            text,
  hours_note           text,
  hours_note_en        text,
  lat                  double precision,
  lng                  double precision,
  is_primary           boolean not null default false,
  visible_in_app       boolean not null default true,
  promo_enabled        boolean not null default true,
  partner_status       text not null default 'owned' check (partner_status in ('owned','partner')),
  lead_fee_per_checkin numeric(10,2) not null default 0,
  lead_fee_per_redeem  numeric(10,2) not null default 0,
  services             text[] not null default '{}',
  website              text,
  google_maps_url      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.staff (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  store_id   text not null references public.stores(id) on delete cascade,
  role       text not null check (role in ('super_admin','admin','store_manager','moderator')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id)
);

create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  listing_id          uuid references public.listings(id) on delete set null,
  store_id            text references public.stores(id) on delete set null,
  date                date not null,
  time_slot           text not null check (time_slot in ('morning','afternoon')),
  status              text not null default 'pending'
                       check (status in ('pending','approved','checked_in','completed','cancelled')),
  token_id            uuid unique,
  diagnostic_redeemed boolean not null default false,
  turnaround_hours    int,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (date >= current_date),
  check (extract(dow from date) <> 0)    -- 0 = Sunday
);
create unique index appointments_no_dupe_active
  on public.appointments (user_id, date, time_slot)
  where status in ('pending','approved','checked_in');

create table public.tokens (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('appointment','reservation')),
  entity_id       uuid not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  store_id        text references public.stores(id) on delete set null,
  code_seed       text not null,                   -- HMAC seed; not displayed
  code_rotated_at timestamptz not null default now(),
  is_active       boolean not null default false,
  is_redeemed     boolean not null default false,
  redeemed_at     timestamptz,
  redeemed_by_id  uuid references auth.users(id),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  unique (entity_id, type)
);

create table public.inspections (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  store_id       text not null references public.stores(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  inspector_id   uuid not null references auth.users(id) on delete restrict,
  grade          text not null check (grade in ('A','B','C','D')),
  checklist_json jsonb not null,
  notes          text,
  inspected_at   timestamptz not null default now()
);
create index inspections_listing_idx on public.inspections(listing_id, inspected_at desc);
```

### 8.2 Helper function

```sql
-- True if caller is active staff at a store with one of the allowed roles
create or replace function public.is_staff(p_store_id text, p_roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and store_id = p_store_id
      and is_active = true and role = any (p_roles)
  );
$$;
```

### 8.3 RLS — appointment privacy

```sql
alter table public.appointments enable row level security;

-- Owner sees own
create policy appts_select_own on public.appointments
for select using (auth.uid() = user_id);

-- Store staff see appointments at their store
create policy appts_select_staff on public.appointments
for select using (
  store_id is not null
  and public.is_staff(store_id, array['super_admin','admin','store_manager','moderator'])
);

-- Insert as self, with held-user block and rule checks
create policy appts_insert_self on public.appointments
for insert with check (
  auth.uid() = user_id
  and date >= current_date
  and date <= current_date + interval '14 days'
  and extract(dow from date) <> 0
  and not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.is_held = true
        or (u.restricted_mode = true and (u.restricted_until is null or u.restricted_until > now())))
  )
);

-- Status updates only by staff. Owners may cancel.
create policy appts_update_staff on public.appointments
for update using (
  store_id is not null
  and public.is_staff(store_id, array['super_admin','admin','store_manager'])
);
create policy appts_update_self_cancel on public.appointments
for update using (auth.uid() = user_id)
  with check (status = 'cancelled');
```

### 8.4 RLS — store staff access

```sql
alter table public.stores enable row level security;
create policy stores_select_anyone on public.stores
for select using (visible_in_app = true or public.is_staff(id, array['super_admin','admin','store_manager','moderator']));

create policy stores_mutate_super on public.stores
for all using (
  exists (select 1 from public.staff where user_id = auth.uid() and role = 'super_admin' and is_active)
);
```

### 8.5 RLS — inspector permissions

```sql
alter table public.inspections enable row level security;

-- Staff see inspections at their store
create policy insp_select_staff on public.inspections
for select using (public.is_staff(store_id, array['super_admin','admin','store_manager','moderator']));

-- Seller can see inspections for their own listing
create policy insp_select_listing_owner on public.inspections
for select using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
);

-- Only store inspectors can insert
create policy insp_insert_inspector on public.inspections
for insert with check (
  auth.uid() = inspector_id
  and public.is_staff(store_id, array['super_admin','admin','store_manager'])
);
```

### 8.6 RLS — admin permissions

`super_admin` is the only role that may mutate `staff`, `stores`, and review `fraud_hold`:

```sql
create policy staff_super_only on public.staff
for all using (
  exists (select 1 from public.staff s2 where s2.user_id = auth.uid() and s2.role = 'super_admin' and s2.is_active)
);
```

### 8.7 RLS — token access rules

```sql
alter table public.tokens enable row level security;

-- Token owner sees only their own active tokens (never the raw seed)
create policy tokens_select_own on public.tokens
for select using (auth.uid() = user_id);

-- Store staff at the token's store can read & redeem
create policy tokens_select_staff on public.tokens
for select using (
  store_id is not null
  and public.is_staff(store_id, array['super_admin','admin','store_manager'])
);
create policy tokens_update_staff on public.tokens
for update using (
  store_id is not null
  and public.is_staff(store_id, array['super_admin','admin','store_manager'])
);
-- No INSERT policy for clients — tokens only created via server-side service role.
```

Use a Supabase view (`tokens_public`) that excludes `code_seed` and exposes only `id, expires_at, is_active, is_redeemed, store_id` for clients.

---

## 9. TESTS

Vitest + Supabase test client. Each test seeds `irepair-rhodes`, an `alice` user, and where relevant a staff user `karen` at Rhodes.

### 9.1 Valid booking
```ts
test("valid booking on a weekday within 14 days succeeds", async () => {
  const date = nextMonday().toISOString();
  const res = await api.post("/api/appointments", { date, timeSlot: "morning" }, aliceToken);
  expect(res.status).toBe(201);
  expect(res.body.status).toBe("pending");
});
```

### 9.2 Sunday rejected
```ts
test("Sunday is rejected", async () => {
  const date = nextSunday().toISOString();
  const res = await api.post("/api/appointments", { date, timeSlot: "morning" }, aliceToken);
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/sunday|closed/i);
});
```

### 9.3 Date > 14 days rejected
```ts
test("date more than 14 days in the future is rejected", async () => {
  const date = new Date(Date.now() + 20 * 86400_000).toISOString();
  const res = await api.post("/api/appointments", { date, timeSlot: "morning" }, aliceToken);
  expect(res.status).toBe(400);
});
```

### 9.4 Held user rejected
```ts
test("held user cannot book", async () => {
  await db.user.update({ where: { id: alice.id }, data: { isHeld: true } });
  const res = await api.post("/api/appointments", { date: nextMonday().toISOString(), timeSlot: "morning" }, aliceToken);
  expect(res.status).toBe(403);
});
```

### 9.5 User sees own appointment
```ts
test("user can read own appointment", async () => {
  const created = await api.post("/api/appointments", { date: nextMonday().toISOString(), timeSlot: "morning" }, aliceToken);
  const list = await api.get("/api/appointments", aliceToken);
  expect(list.body.appointments.some((a: any) => a.id === created.body.id)).toBe(true);
});
```

### 9.6 User cannot see another user's appointment
```ts
test("bob cannot see alice's appointment", async () => {
  const a = await api.post("/api/appointments", { date: nextMonday().toISOString(), timeSlot: "morning" }, aliceToken);
  // Even by id-guessing — RLS on direct select returns no rows for bob
  const bobView = await supabase.from("appointments").select("*").eq("id", a.body.id).auth(bobToken);
  expect(bobView.data).toEqual([]);
});
```

### 9.7 Staff sees store appointment
```ts
test("Rhodes staff sees appointments at Rhodes after approval assigns store", async () => {
  const a = await api.post("/api/appointments", { date: nextMonday().toISOString(), timeSlot: "morning" }, aliceToken);
  await api.patch(`/api/admin/appointments/${a.body.id}`, { storeId: "irepair-rhodes" }, karenToken);
  const staffView = await supabase.from("appointments").select("*").eq("id", a.body.id).auth(karenToken);
  expect(staffView.data?.[0]?.id).toBe(a.body.id);
});
```

### 9.8 Token creation is idempotent
```ts
test("approving the same appointment twice yields one token", async () => {
  const a = await api.post("/api/appointments", { date: nextMonday().toISOString(), timeSlot: "morning" }, aliceToken);
  await api.patch(`/api/admin/appointments/${a.body.id}`, { storeId: "irepair-rhodes" }, karenToken);
  await api.patch(`/api/admin/appointments/${a.body.id}`, { storeId: "irepair-rhodes" }, karenToken);
  const tokens = await db.token.findMany({ where: { entityId: a.body.id, type: "appointment" } });
  expect(tokens.length).toBe(1);
  expect(tokens[0].isActive).toBe(true);
});
```

### 9.9 (Additional) Duplicate booking rejected
```ts
test("second booking for same user/date/slot is rejected", async () => {
  const date = nextMonday().toISOString();
  await api.post("/api/appointments", { date, timeSlot: "morning" }, aliceToken);
  const dupe = await api.post("/api/appointments", { date, timeSlot: "morning" }, aliceToken);
  expect(dupe.status).toBe(409);
});
```

### 9.10 (Additional) Redeem token completes appointment
```ts
test("staff redeems token → appointment moves to checked_in", async () => {
  const a = await api.post("/api/appointments", { date: nextMonday().toISOString(), timeSlot: "morning" }, aliceToken);
  await api.patch(`/api/admin/appointments/${a.body.id}`, { storeId: "irepair-rhodes" }, karenToken);
  const token = await db.token.findFirst({ where: { entityId: a.body.id } })!;
  const code = computeHmacCode(token.codeSeed, Math.floor(Date.now() / 60000));
  const res = await api.post("/api/tokens/redeem", { storeId: "irepair-rhodes", code }, karenToken);
  expect(res.status).toBe(200);
  const updated = await db.appointment.findUnique({ where: { id: a.body.id } });
  expect(updated?.status).toBe("checked_in");
});
```

---

## 10. KNOWN GAPS / V1 MUST-FIX

1. **No PATCH/PUT/DELETE on appointments** — full status machine missing.
2. **No server-side validation** for Sunday / 14-day / future-date / duplicate.
3. **`storeId` never set** by the booking route.
4. **Stores hardcoded in mobile** — no `/api/stores`, no DB seed.
5. **No inspection endpoints**, no inspector UI, no listing-grade side effect.
6. **No token endpoints**, no rotation, no redeem.
7. **`User.tokensDisabled` and `User.isHeld` are dead fields** — set but never read.
8. **AuditLog is dead** — model exists, zero writes anywhere in backend code.
9. **No staff middleware** — `Staff.role` defined but no role checks at runtime.
10. **Only 2 Prisma migrations exist** (`init`, `add_listings`) — Appointment, Store, Staff, Token, Inspection, FraudHold, AuditLog tables have **never been created in the DB**. Even the appointment booking route would fail today if it ran against a fresh DB; it works only because someone has manually applied the schema.
