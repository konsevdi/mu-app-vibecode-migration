# 06 — Appointments and Inspections Export

## Appointment schema

From `backend/prisma/schema.prisma:193-212`:

```
id, userId, listingId?, storeId?,
date, timeSlot ("morning"|"afternoon"),
status ("pending"|"approved"|"checked_in"|"completed"|"cancelled") default "pending",
tokenId? @unique, diagnosticRedeemed default false, turnaroundHours?, notes?, createdAt, updatedAt
```

Postgres:

```sql
create type appointment_status   as enum ('pending','approved','checked_in','completed','cancelled');
create type appointment_timeslot as enum ('morning','afternoon');

create table public.appointments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  listing_id           text references public.listings(id),
  store_id             text references public.stores(id),
  date                 date not null,
  time_slot            appointment_timeslot not null,
  status               appointment_status not null default 'pending',
  token_id             text unique,
  diagnostic_redeemed  boolean not null default false,
  turnaround_hours     integer,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.appointments(user_id);
create index on public.appointments(listing_id);
create index on public.appointments(store_id);
```

## Current source — what exists

`backend/src/routes/appointments.ts` (76 lines) is intentionally minimal:

| Method | Path | Implemented? |
|---|---|---|
| POST | `/api/appointments` | yes — creates `pending` row. Body: `{ date, timeSlot, listingId?, notes? }` |
| GET | `/api/appointments` | yes — list user's appointments |
| approve / reject | — | **MISSING** |
| check-in | — | **MISSING** |
| token issuance | — | **MISSING** |
| store-side validation | — | **MISSING** |
| slot conflict check | — | **MISSING** |

Mobile screen `mobile/src/app/book-appointment.tsx` (204 lines) calls only `POST /api/appointments`. `storeId` is not sent — `store_id` always null in current data.

## State machine (rebuild)

```
pending ──(admin approve)──► approved ──(token issued)──► (user has token) ──(staff scan @ store)──► checked_in ──(visit complete)──► completed
   │                            │
   │                            └──(no-show 24h after date)──► cancelled
   └──(user cancel)──► cancelled
   └──(admin reject)──► cancelled
```

Transitions allowed:
- `pending → approved` by `staff` with `role IN ('admin','super_admin','store_manager')`
- `pending → cancelled` by user (self) OR admin
- `approved → checked_in` by `staff` (any active role at the store)
- `checked_in → completed` by staff
- any → `cancelled` by admin

## Token rotation (60s / 72h TTL)

Source schema (`backend/prisma/schema.prisma:277-298`):

```
type ("appointment"|"reservation"), entityId, userId, storeId?,
code (6-digit), codeRotatedAt,
isActive (enabled after admin approval), isRedeemed, redeemedAt?, redeemedById?,
expiresAt (72h after approval), createdAt
@@unique([entityId, type])
@@index([code])
```

Mobile `mobile/src/app/token.tsx` (260 lines) **polls every 10s** — replace with Supabase Realtime channel on the token row.

### Rotation job (Postgres pg_cron)

```sql
-- runs every 60 seconds
select cron.schedule('rotate_tokens', '* * * * *', $$
  update public.tokens
  set code = lpad((floor(random()*1000000))::int::text, 6, '0'),
      code_rotated_at = now()
  where is_active = true
    and is_redeemed = false
    and expires_at > now();
$$);
```

Client subscribes:

```ts
supabase.channel(`token:${tokenId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `id=eq.${tokenId}` },
      (p) => setCode(p.new.code))
  .subscribe();
```

### Redeem (staff scan)

Server route (service-role) `POST /api/tokens/redeem`:

```ts
// body: { code, storeId, staffUserId }
// check: token exists, isActive, not isRedeemed, expiresAt > now(), storeId match
// transition: appointment.status = 'checked_in', tokens.is_redeemed = true, redeemedAt = now(), redeemedById = staffUserId
// audit log: actor = staffUserId, action = 'redeem_token', entity = appointment
```

Holds: if the user has `isHeld=true` OR `tokensDisabled=true`, the token rotation skips them (already covered by `is_active=false`) and redemption returns 403.

## Inspection schema

From `backend/prisma/schema.prisma:261-275`:

```
id, listingId, storeId, inspectorId, grade ("A"|"B"|"C"|"D"),
checklistJson (string — JSON), notes?, inspectedAt
```

**MISSING**: the JSON shape of `checklistJson` is not documented anywhere in source. Standard schema for rebuild (mirrors iRepair's intake form — confirm with store):

```jsonc
{
  "physical_condition": "A" | "B" | "C" | "D",
  "screen": { "ok": true, "burn_in": false, "cracks": false, "dead_pixels": 0 },
  "battery": { "health_percent": 92, "cycle_count": 240 },
  "imei_check": { "blacklisted": false, "carrier_locked": false },
  "factory_reset": true,
  "accessories": { "charger": true, "box": false, "cable": true, "earphones": false },
  "ports": { "charging": "ok", "headphone": "n/a", "speaker": "ok" },
  "biometric": { "face_id": "ok", "touch_id": "n/a" },
  "notes": "minor scratch on bezel, no dent",
  "inspected_by_signature": "irepair-rhodes-staff-12"
}
```

After inspection, update the listing:

```sql
update public.listings set
  grade = $grade,
  checklist_complete = true,
  inspection_date = now(),
  status = 'approved'    -- inspection auto-approves
where id = $listing_id;
```

Then `INSERT INTO inspections (...)` records the audit-grade record (immutable post-insert).

## Trust event tracking

`mobile/src/lib/verification.ts:9`: `isUserVerified(trustEventCount) => trustEventCount >= 2`. The column exists on the User model but **the source never increments it**. The rebuild needs to.

Trust events to count (one increment per event, idempotent via UNIQUE constraint):

| Event | Where to increment |
|---|---|
| `completed_grade` | Inspection insert trigger |
| `completed_appointment` | Appointment status → `completed` trigger |
| `completed_transaction` | V2 — when in-app transactions exist |
| `partner_vouch` | Manual admin action |

```sql
create table public.trust_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  event_type    text not null check (event_type in ('completed_grade','completed_appointment','completed_transaction','partner_vouch')),
  source_entity_type text,
  source_entity_id   text,
  created_at    timestamptz not null default now(),
  unique (user_id, event_type, source_entity_type, source_entity_id)
);

-- after-insert trigger: increment profile.trust_event_count
create function bump_trust_count() returns trigger as $$
begin
  update public.profiles set trust_event_count = trust_event_count + 1
  where id = new.user_id;
  return new;
end; $$ language plpgsql;

create trigger trust_event_inserted after insert on public.trust_events
for each row execute function bump_trust_count();
```

## Diagnostic fee

`backend/src/routes/assistant.ts:87` — hardcoded `diagnosticFee: 10` (€10). Refunded on purchase. **No payment processing in V1**. The `diagnosticRedeemed` flag on `appointments` is set by store staff at checkout — when the customer buys the device, the staff toggles this flag, which is a manual indication that the €10 was applied to the purchase.

V2: integrate Stripe Connect for in-app payment. Schema is ready — `appointments.diagnostic_redeemed` becomes "diagnostic fee was applied to a transaction in our system" instead of "store said yes verbally."
