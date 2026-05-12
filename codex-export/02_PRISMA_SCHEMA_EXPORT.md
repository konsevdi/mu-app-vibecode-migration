# 02 — Prisma Schema Export

Source: `backend/prisma/schema.prisma` — **VERBATIM** below, with rebuild notes per model.

Datasource is `sqlite`. The rebuild moves to Postgres via Supabase. Type mappings:

| Prisma SQLite | Postgres |
|---|---|
| `String` (cuid) | `text` (uuid via `gen_random_uuid()` preferred for FK joins) |
| `String` (image arr JSON) | `text[]` |
| `Float` | `numeric(10,2)` for currency, `double precision` otherwise |
| `Boolean` | `boolean` |
| `DateTime` | `timestamptz` |
| `Int` | `integer` |
| `@@map("user")` | table name verbatim |

## Models

### User → `auth.users` + `public.profiles`

```prisma
model User {
  id                  String    @id
  email               String    @unique
  name                String?
  emailVerified       Boolean   @default(false)
  image               String?
  defaultCity         String?   // "rhodes" or other city
  onboardingCompleted Boolean   @default(false)
  selectedCity        String?
  selectedCountry     String?
  isEligibleCity      Boolean   @default(false)
  languagePref        String    @default("el")
  trustEventCount     Int       @default(0)
  fraudScore          Int       @default(0)   // 0-100
  isHeld              Boolean   @default(false)
  restrictedMode      Boolean   @default(false)
  restrictedUntil     DateTime?
  tokensDisabled      Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @default(now()) @updatedAt
}
```

**Rebuild**: split into Supabase `auth.users` (managed) and `public.profiles` (1:1 by `auth.users.id`). Move all extra fields (`defaultCity`, onboarding flags, fraud/trust columns, `languagePref`) into `profiles`. Default `languagePref='el'`.

### Session / Account / Verification

```prisma
model Session { id, expiresAt, token (unique), createdAt, updatedAt, ipAddress?, userAgent?, userId }
model Account { id, accountId, providerId, userId, accessToken?, refreshToken?, idToken?, ..., password? }
model Verification { id, identifier, value, expiresAt, createdAt, updatedAt }
```

**Rebuild**: drop entirely — Supabase Auth owns sessions, OAuth accounts, and email verifications via `auth.*` schema.

### Profile

```prisma
model Profile { id Int @id @default(autoincrement()), handle String @unique, userId String @unique }
```

**Rebuild**: merge into `public.profiles` as `handle text unique` column. Auto-generate from email local-part on signup via trigger.

### Listing → `public.listings`

```prisma
model Listing {
  id                String   @id @default(cuid())
  title             String
  description       String
  price             Float
  category          String   // "phone", "tablet", "laptop", "accessory"
  condition         String   // "new", "like_new", "good", "fair", "parts"
  brand             String?
  model             String?
  images            String   // JSON array of image URLs (min 3)
  location          String?
  city              String   // Required: "rhodes" etc.
  grade             String?  // "A" | "B" | "C" | "D"
  checklistComplete Boolean  @default(false)
  inspectionDate    DateTime?
  status            String   @default("pending") // "pending", "approved", "rejected"
  isActive          Boolean  @default(true)
  isFeatured        Boolean  @default(false)
  views             Int      @default(0)
  fraudScore        Int      @default(0)
  isHeld            Boolean  @default(false)
  isStore           Boolean  @default(false)   // "Sold by iRepair"
  reportCount24h    Int      @default(0)
  lastReportAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  sellerId          String
  @@index([category]) @@index([sellerId]) @@index([city]) @@index([status])
  @@map("listing")
}
```

**Rebuild**: `images` becomes `text[]` (no more `JSON.parse`). `category`, `condition`, `status`, `grade` become Postgres enums. Add `rejection_reason text` (MISSING in source) with check-constraint `IN ('photos','pricing','category','safety','other')`.

### Message → `public.messages`

```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String                       // derived: sorted UIDs joined by "_"
  senderId       String
  recipientId    String
  content        String
  imageUrl       String?
  imageHash      String?                      // For spam detection
  isHidden       Boolean  @default(false)
  flaggedReason  String?                      // "url", "off_platform", "image_spam", "reported"
  createdAt      DateTime @default(now())
  @@index([conversationId]) @@index([senderId]) @@index([recipientId])
}
```

**Rebuild**: keep verbatim. Add Realtime publication. `conversationId` derivation logic stays in app code (see `05_CHAT_AND_MESSAGES_EXPORT.md`).

### ChatReport / UserStrike / FraudHold

```prisma
model ChatReport { id, messageId, reporterId, reason, createdAt }
model UserStrike { id, userId, reason, createdAt, expiresAt (= createdAt + 90d) }
model FraudHold  { id, entityType, entityId, fraudScore, reason, missiveDraftId?, resolvedAt?, resolvedBy?, createdAt }
```

**Rebuild**: port verbatim. `entityType` becomes enum `('user','listing','chat','service','appointment')`.

### Appointment

```prisma
model Appointment {
  id                 String   @id @default(cuid())
  userId             String
  listingId          String?
  storeId            String?
  date               DateTime
  timeSlot           String                    // "morning" or "afternoon"
  status             String   @default("pending")  // "pending"|"approved"|"checked_in"|"completed"|"cancelled"
  tokenId            String?  @unique
  diagnosticRedeemed Boolean  @default(false)
  turnaroundHours    Int?
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**Rebuild**: `timeSlot` enum (`morning`|`afternoon`), `status` enum as above. State machine documented in `06_APPOINTMENTS_AND_INSPECTIONS_EXPORT.md`.

### Store / Staff / Inspection

```prisma
model Store {
  id, name, nameEl, address, addressEn?, phone?, hours?, hoursNote?, lat?, lng?,
  isPrimary, visibleInApp, promoEnabled,
  partnerStatus ("owned"|"partner"), leadFeePerCheckin, leadFeePerRedeem
}
model Staff { id, userId, storeId, role ("super_admin"|"admin"|"store_manager"|"moderator"), isActive, @@unique([userId, storeId]) }
model Inspection { id, listingId, storeId, inspectorId, grade, checklistJson (JSON), notes?, inspectedAt }
```

**Rebuild**: port verbatim. `role` enum. `checklistJson` becomes `jsonb`. Inspection checklist schema (keys: `screen`, `battery`, `accessories`, `imei_check`, `factory_reset`) — **PARTIAL** in source, schema must be finalized in `06_APPOINTMENTS_AND_INSPECTIONS_EXPORT.md`.

### Token (60s rotation / 72h TTL)

```prisma
model Token {
  id            String   @id @default(cuid())
  type          String   // "appointment", "reservation"
  entityId      String
  userId        String
  storeId       String?
  code          String                  // current 6-digit code
  codeRotatedAt DateTime @default(now())
  isActive      Boolean  @default(false) // enabled after admin approval
  isRedeemed    Boolean  @default(false)
  redeemedAt    DateTime?
  redeemedById  String?
  expiresAt     DateTime                 // 72h after approval
  createdAt     DateTime @default(now())
  @@unique([entityId, type])
  @@index([code]) @@index([userId])
}
```

**Rebuild**: keep schema. Implement rotation via `pg_cron` updating `code` + `codeRotatedAt` every 60s while `isActive AND NOT isRedeemed AND expiresAt > now()`. Client subscribes via Realtime instead of polling.

### AuditLog / AutoActionLog

```prisma
model AuditLog     { id, actorId, actorRole?, action, entityType, entityId, details?, ipAddress?, createdAt }
model AutoActionLog{ id, entityType, entityId, action, reason, details?, createdAt }
```

**Rebuild**: port verbatim. `details` becomes `jsonb`. RLS: only `staff` rows where `role IN ('admin','super_admin')` can read.

### GradeConfig / ModerationConfig

```prisma
model GradeConfig {
  storeId?  // null = global
  gradeA  Float  @default(1.00)
  gradeB  Float  @default(0.93)
  gradeC  Float  @default(0.85)
  gradeD  Float  @default(0.60)
}
model ModerationConfig {
  privateReportThreshold  Int  @default(2)
  storeReportThreshold    Int  @default(5)
  cooldownDays            Int  @default(7)
  limitedStateDays        Int  @default(7)
  strikeDecayDays         Int  @default(90)
  fraudHoldThreshold      Int  @default(80)
}
```

**Rebuild**: keep — seeded once on first deploy (see `seed-data.json`).

### WaitlistSignup

```prisma
model WaitlistSignup {
  id, email (unique), city, country, interestType ("buyer"|"seller"|"both"), consent (true required),
  phone?, socialHandle?, notes?, languagePref ("el"|"en", default "el"),
  referralCode (unique, 8 chars: "MU" + 6 from "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"),
  referredByCode?, referralCount @default(0), positionScore @default(0),
  createdAt
  @@index([referralCode]) @@index([referredByCode])
}
```

**Rebuild**: keep. Add Postgres trigger `before_insert_waitlist_signup` to:
1. Generate `referralCode` (retry on collision)
2. If `referredByCode` valid AND not self-referral: `UPDATE waitlist_signup SET referral_count = referral_count + 1, position_score = position_score + 3 WHERE referral_code = NEW.referredByCode`

## Summary diff vs Postgres rebuild

- `User`/`Profile` merge into `auth.users` + `public.profiles`
- `Session`/`Account`/`Verification` dropped (Supabase Auth owns)
- All `String` enum columns → real Postgres enums
- `images` (JSON in TEXT) → `text[]`
- `checklistJson`, `details` → `jsonb`
- Add `rejection_reason` to listings (MISSING in source)
- Add `is_demo boolean default false` to listings (PARTIAL — referenced by demo-browse but not in schema)
- Add `slug text unique` to listings for SEO-friendly URLs

See `15_SQL_MIGRATIONS.md` and `sql/001_initial_schema.sql` for the executable Postgres schema.
