# 13 — Inspection & Grading

Source: Prisma models `Inspection`, `GradeConfig`, listing fields `grade`, `checklist_complete`, `inspection_date`; UI in `mobile/src/app/listing/[id].tsx`, `mobile/src/lib/verification.ts`, `mobile/src/lib/constants.ts`, `shared/contracts.ts`.

Per D9, **inspection tokens are V2** — V1 stores grade results directly on the listing row.

## Grade scale

```ts
const GRADE_LABELS = {
  A: { el: 'ΑΡΙΣΤΗ',           en: 'EXCELLENT',     color: '#00FF88' },
  B: { el: 'ΚΑΛΗ',             en: 'GOOD',           color: '#00BFFF' },
  C: { el: 'ΜΕΤΡΙΑ',           en: 'FAIR',           color: '#FFD700' },
  D: { el: 'ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ', en: 'FOR PARTS',      color: '#FF6B6B' },
} as const;
```

Mirrors `mobile/src/lib/verification.ts:9-14` and source `Inspection.grade`.

## Grade multipliers (from `lib/constants.ts`)

```ts
const GRADE_MULTIPLIERS = {
  A: 1.00,
  B: 0.93,
  C: 0.85,
  D: 0.60,
};
```

Used to compute a **fair-price suggestion**: `suggested = retail_price * GRADE_MULTIPLIERS[grade]`. Surfaced on listing detail under "Πληροφορίες τιμής" / "Price info" when both retail price and grade are known.

Editable per-store and globally via `grade_configs` (D4 + Prisma `GradeConfig`).

## Trust event count

`profiles.trust_event_count`:
- +1 for each completed inspection (post-grade).
- +1 for each successful (admin-confirmed) transaction (V2).

`isUserVerified(profile) = profile.trust_event_count >= 2` (`mobile/src/lib/verification.ts:17`). Renders the green-check "ΕΠΑΛΗΘΕΥΜΕΝΟΣ" badge in listings and chat.

## Inspection flow (V1, no inspector app)

1. Buyer or seller hits "Κράτηση Ελέγχου / Book inspection" on a listing → routes to `/book-appointment?listingId=<id>`.
2. They schedule. See `14_APPOINTMENTS.md`.
3. They bring the device to the seeded store at the scheduled time.
4. The store's technician fills the checklist on **the Supabase Dashboard SQL editor** OR via a simple `/admin/inspections/new` form (PROPOSED minimal admin UI):

```
Form fields:
- listing (typeahead by title/brand/model)
- store (dropdown)
- inspector (auth.uid auto-fill)
- grade: A | B | C | D
- checklist items (JSON form): screen, battery, ports, buttons, camera, speakers, etc.
- notes (textarea)
```

5. Submit creates `inspections` row AND updates the linked listing:
   - `grade = <grade>`
   - `checklist_complete = true`
   - `inspection_date = now()`
6. Trigger increments seller's `trust_event_count`.

## Checklist JSON shape

Stored in `inspections.checklist_json`:

```json
{
  "screen": { "ok": true, "notes": "minor wear top edge" },
  "battery_health_pct": 89,
  "buttons": { "power": true, "volume": true, "home": null },
  "ports": { "charging": true, "audio": true },
  "camera": { "front": true, "back": true },
  "speakers": true,
  "biometrics": { "fingerprint": true, "face": null },
  "imei_blacklist": false,
  "water_damage": false,
  "warranty_until": null
}
```

This is the recommended schema — admin tooling can render it as a checklist on the listing detail under "Λεπτομερειες ελεγχου / Inspection details".

## Listing detail rendering

When `grade` is set:

```
┌────────────────────────────────────────────┐
│  ✅ ΕΛΕΓΧΘΗΚΕ ΑΠΟ iRepair                 │
│  Βαθμολογία: [A] ΑΡΙΣΤΗ                    │
│  Ημερομηνία: 14 Μαρ 2026                  │
│                                            │
│  ▸ Δες λεπτομερειες ελεγχου                │
└────────────────────────────────────────────┘
```

Click "Δες λεπτομερειες" expands an accordion with the parsed checklist JSON.

When grade is unset: show CTA "Κανε τη συσκευη πιστοποιημενη / Get your device verified" → routes to `/book-appointment?listingId=<id>`.

## Seller incentive

The "Get Graded" CTA wording emphasizes: **graded listings sell faster and at higher prices** (point to the `GRADE_MULTIPLIERS` table). Diagnostic fee €10 is refundable if the buyer purchases.

## Token model (V2 — see D9)

Schema is preserved in `tokens` table. V1 doesn't use it. V2 design (for reference):
- After admin approves an appointment, a 6-digit rotating code is generated.
- Code rotates every 60s on the user's screen (TOTP-style).
- Store technician scans / types the code; backend validates against `tokens.code` (within 60s tolerance).
- On successful redeem, `tokens.is_redeemed=true, redeemed_at=now()`. The redeem unlocks the inspector form.

For V1, just enable a hardcoded staff role to access `/admin/inspections/new` directly.

## Grade-edit safeguards

- Once `grade` is set, only `staff` or `admin` can change it.
- Owner can request re-inspection; that creates a new `inspections` row but does NOT overwrite the previous one until the new one is submitted.
- `grade_configs` is admin-only. Changes don't retroactively update existing listings — multipliers apply at render time.

## Multi-store readiness

Schema supports multiple stores per city; V1 has 2 in Rhodes. `inspections.store_id` records which store performed the inspection. When V2 opens a second city, simply add a `cities` row with `is_eligible=true` + a `stores` row.

## What's intentionally NOT included in V1

- Inspector mobile app — too much scope.
- Live photo capture during inspection — manual photos uploaded after.
- Diagnostic PDF report — V2 polish.
- iRepair API integration for syncing inspection records — manual entry V1, API V2.
- Disputes / re-inspection workflow — admin handles ad-hoc.
