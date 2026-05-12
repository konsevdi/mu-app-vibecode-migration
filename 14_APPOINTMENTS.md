# 14 — Appointments

Source: `mobile/src/app/book-appointment.tsx` (205 lines), `backend/src/routes/appointments.ts` (76 lines), Prisma `Appointment` model.

## Route

`/book-appointment?listingId=<optional>&storeId=<optional>`. Auth required.

## Date generation

Verbatim from source `generateDates()`:

```ts
export function generateDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  let dayCount = 0;
  while (dates.length < 14) {
    const d = new Date(today);
    d.setDate(today.getDate() + dayCount);
    if (d.getDay() !== 0) {       // skip Sundays
      dates.push(d);
    }
    dayCount++;
  }
  return dates;
}
```

Produces the next 14 non-Sunday dates starting today. Render as a horizontal scrollable date strip:

```
[14   ][15   ][16   ][17   ][19   ][20   ]...
 ΤΡΙ    ΤΕΤ    ΠΕΜ    ΠΑΡ    ΚΥΡ    ΔΕΥ
 Μαρ    Μαρ    Μαρ    Μαρ    Μαρ    Μαρ
```

Localized weekday + month abbreviations via `date-fns/locale/el`.

## Time slot

Two slots only:

| Slot | Hours | Label el | Label en |
|---|---|---|---|
| `morning` | 09:00 – 14:00 | ΠΡΩΙ (09:00 – 14:00) | MORNING (09:00 – 14:00) |
| `afternoon` | 14:00 – 21:00 | ΑΠΟΓΕΥΜΑ (14:00 – 21:00) | AFTERNOON (14:00 – 21:00) |

User picks one. **No specific time within the slot** — the partner schedules internally.

## Store selection

If `?storeId` is in URL, lock to that store. Otherwise, list active visible stores in the user's city (`stores.visible_in_app=true`). V1 = 2 stores in Rhodes, so default-show both as radio cards.

## UI

```
┌───────────────────────────────────────────┐
│  Κράτηση Ελέγχου / Book Inspection         │
│                                            │
│  Επίλεξε ημερομηνία:                       │
│  [14] [15] [16] [17] [19] [20] [21] ...   │
│                                            │
│  Επίλεξε ώρα:                              │
│  ○ ΠΡΩΙ (09:00 – 14:00)                    │
│  ● ΑΠΟΓΕΥΜΑ (14:00 – 21:00)                │
│                                            │
│  Κατάστημα:                                │
│  ● iRepair Rhodes — Αμμοχωστου 18         │
│  ○ iRepair Spot — Αυστραλιας 84-86        │
│                                            │
│  Σημειώσεις (προαιρετικό):                 │
│  [                                  ]      │
│                                            │
│  💡 Διαγνωστικό κόστος: €10                │
│     Επιστρέφεται αν αγοράσεις.             │
│                                            │
│  [ Κράτηση ]                               │
└───────────────────────────────────────────┘
```

Below the form, a fallback link: "Δεν βρίσκεις διαθέσιμη ώρα; Κάνε κράτηση κατευθείαν στο `iRepair`." → opens `EXTERNAL_BOOKING_URL` (`https://public.irepair.gr/service-app`).

## API

`POST /api/appointments`:

```ts
{
  date: ISOString,
  timeSlot: 'morning' | 'afternoon',
  storeId?: string,
  listingId?: string,
  notes?: string,
}
```

Server flow:
1. Validate. Reject if `date` is in the past, on a Sunday, or > 30 days out.
2. Reject if user has 3+ pending appointments (rate limit).
3. Capacity check: count existing appointments for `(date, time_slot, store_id)`. If ≥ 4 (default capacity) → 409 `{ error: 'CONFLICT', reason: 'SLOT_FULL' }`.
4. Insert with `status='pending'`.
5. Send confirmation email (Resend, bilingual). Include map link, address, notes summary.
6. Return appointment.

## Email

Subject: `Επιβεβαίωση κράτησης — iRepair, <date>` / `Booking confirmation — iRepair, <date>`.

Body: date + slot, store name + address, "Φέρε τη συσκευή και την ταυτότητά σου." / "Bring the device and your ID.", €10 diagnostic note, change/cancel link `/appointments/<id>`.

## Statuses

| Status | Meaning |
|---|---|
| `pending` | Booked, awaiting partner confirmation |
| `approved` | Partner confirmed |
| `checked_in` | User showed up; technician started inspection |
| `completed` | Inspection done, `inspections` row created |
| `cancelled` | User or partner cancelled |

Admin (or store_manager staff role) transitions via `PATCH /api/appointments/:id/status`.

## User-facing appointment list

`/appointments`:
- Upcoming (status in pending/approved/checked_in).
- Past (completed/cancelled).
- Per-row: date, slot, store, status badge, link to listing if attached, cancel button (only if pending or approved AND ≥ 24h away).

## Cancellation

`PATCH /api/appointments/:id/status` with `{ status: 'cancelled' }`. Owner-only or admin. Within 24h of slot start → still allowed but flagged in details (cumulative late-cancels could trigger admin action).

## Capacity (PROPOSED)

V1 capacity = 4 per slot per store (~30 min each in a 5-hour window). Configurable via `stores` table (PROPOSED column `capacity_morning int default 4, capacity_afternoon int default 6`).

## Availability endpoint

`GET /api/appointments/availability?from=YYYY-MM-DD&to=YYYY-MM-DD&storeId=<id?>`:

```ts
// Response:
[
  { date: '2026-03-14', morning: { available: 3, capacity: 4 }, afternoon: { available: 0, capacity: 6 } },
  { date: '2026-03-15', morning: { available: 4, capacity: 4 }, afternoon: { available: 6, capacity: 6 } },
  ...
]
```

UI greys out fully-booked slots.

## Reminders

PROPOSED V2: email/SMS reminder 1 hour before slot. V1 = none.

## Edge cases

- Sunday selected by URL manipulation: server rejects.
- Past date: server rejects.
- Listing attached but listing was deleted: `listing_id` becomes null (FK `on delete set null`), appointment remains.
- User restricted: `423` returned.
- Store made invisible after user booked: appointment stays valid; admin handles ad-hoc.
