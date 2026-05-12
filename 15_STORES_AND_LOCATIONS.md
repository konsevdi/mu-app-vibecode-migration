# 15 — Stores & Locations

Source: `mobile/src/app/stores.tsx` (canonical store data, including phone/email/hours/services), `mobile/src/lib/stores.ts` (subset), Prisma `Store` model.

V1 = 2 stores in Rhodes. Schema is multi-store ready.

## Stores route

`/stores` — public page listing all `stores.visible_in_app=true` for the user's city.

Per-store card includes:
- Header: name (en) + `nameEl` (Greek) + "ΚΥΡΙΟ / PRIMARY" badge if `is_primary=true`.
- Tappable address card → opens `googleMapsUrl`.
- Hours: free-text `hours_note` (bilingual via `_en` variants).
- Phone: tap → `tel:` dial.
- Email: tap → `mailto:`.
- Services chips: array of service keys.
- Website button: opens `website` in new tab.
- "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ / BOOK APPOINTMENT" CTA → `/book-appointment?storeId=<id>`.

## Seed data (verbatim from `mobile/src/app/stores.tsx:28-65`)

### Store 1 — iRepair Rhodes (PRIMARY)

| Field | Value |
|---|---|
| `slug` | `irepair-rhodes-main` |
| `name` | `iRepair Rhodes` |
| `name_el` | `iRepair ΡΟΔΟΣ` |
| `address` | `Αμμοχωστου 18, 85131, Ροδος, Ελλαδα` |
| `address_en` | `Ammochostou 18, 85131, Rhodes, Greece` |
| `phone` | `+302241034175` |
| `email` | `rhodes@irepair.gr` |
| `hours_note` | `ΔΕΥ - ΠΑΡ 09:00-19:00, ΣΑΒ 09:00-15:00` |
| `hours_note_en` | `MON-FRI 09:00-19:00, SAT 09:00-15:00` |
| `services` | `[diagnostics, repairs, grading, sales]` |
| `lat` | `36.4493557` |
| `lng` | `28.2202755` |
| `is_primary` | `true` |
| `visible_in_app` | `true` |
| `website` | `https://irepair.gr/rhodes` |
| `maps_url` | `https://maps.app.goo.gl/34kjfjbVnCZSGNCc9` |
| `city` | `rhodes` |

### Store 2 — iRepair Spot

| Field | Value |
|---|---|
| `slug` | `irepair-rhodes-spot` |
| `name` | `iRepair Spot` |
| `name_el` | `iRepair Spot @ Public + home Νεα Μαρινα` |
| `address` | `Αυστραλιας 84-86, 85100, Ροδος, Ελλαδα` |
| `address_en` | `Australias 84-86, 85100, Rhodes, Greece` |
| `phone` | `+302241077637` |
| `email` | `publicrhodes@irepair.gr` |
| `hours_note` | `ΔΕΥ - ΠΑΡ 09:00-17:00` |
| `hours_note_en` | `MON - FRI 09:00-17:00` |
| `services` | `[diagnostics, grading]` |
| `lat` | `36.4378` |
| `lng` | `28.2406` |
| `is_primary` | `false` |
| `visible_in_app` | `true` |
| `website` | `https://irepair.gr/rhodes` |
| `maps_url` | `https://maps.app.goo.gl/S5tHHt7Lu6VBDT768` |
| `city` | `rhodes` |

PROPOSED `stores` columns to add:
- `website` text
- `maps_url` text
- `hours_note_en` text

The `services` column stays `jsonb` — values: `[{ key, label_en, label_el }]` if richer translations are needed. For V1, store an array of slugs and translate at render time:

```ts
const SERVICE_LABELS = {
  diagnostics: { el: 'ΔΙΑΓΝΩΣΤΙΚΑ', en: 'DIAGNOSTICS' },
  repairs:     { el: 'ΕΠΙΣΚΕΥΕΣ',  en: 'REPAIRS'     },
  grading:     { el: 'ΑΞΙΟΛΟΓΗΣΗ', en: 'GRADING'     },
  sales:       { el: 'ΠΩΛΗΣΕΙΣ',   en: 'SALES'       },
};
```

## Map rendering

`MAP_PROVIDER` placeholder (`google` or `mapbox`). V1 default: Google embed via `@vis.gl/react-google-maps`.

Each store card has an inline static map preview (a fixed-size image from `https://maps.googleapis.com/maps/api/staticmap?...` for Google or `mapbox/styles/v1/...static/...` for Mapbox).

Click → opens the store's `maps_url` in a new tab. This avoids loading a heavy interactive map on the listing page.

## "Use as meetup" CTAs

On listing detail (`mobile/src/app/listing/[id].tsx`), the safe-meetup section renders both stores in a compact card. Each card has two CTAs:
- **ΣΕΛΙΔΑ / PAGE** → `/stores#<slug>` anchor with smooth scroll.
- **ΧΑΡΤΗΣ / MAP** → opens `maps_url`.

## Admin behavior

- Stores are seeded once on initial deploy.
- Admin can edit any field via `/admin/stores` (PROPOSED) or Supabase SQL editor.
- Setting `visible_in_app=false` hides from public stores list and removes from booking flow.
- Setting `promo_enabled=false` removes the safe-meetup section on listings (would still appear on `/stores`).

## Partner billing fields

`partner_status`, `lead_fee_per_checkin`, `lead_fee_per_redeem` are unused in V1 (Prisma already has them). Kept in schema for V2 partner-billing reporting.

## Schema migration

```sql
alter table stores add column if not exists website text;
alter table stores add column if not exists maps_url text;
alter table stores add column if not exists hours_note_en text;
-- city FK
alter table stores add column if not exists city text references cities(slug);
update stores set city = 'rhodes' where city is null;
alter table stores alter column city set not null;
```

## RLS

```sql
alter table stores enable row level security;
create policy "Anyone can read visible stores" on stores
  for select using (visible_in_app = true);
create policy "Staff can edit stores" on stores
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'))
  );
```
