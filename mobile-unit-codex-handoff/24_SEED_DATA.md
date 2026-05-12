# 24 — Seed Data

What ships in the database on first boot. Source of truth: `seed-data.json` (alongside this doc) — code reads it via `scripts/seed.ts`. Idempotent: re-running `bun run db:seed` should never duplicate.

## Cities (15 rows)

V1 ships only **Rhodes** as eligible. The remaining 14 are stored as `is_eligible=false` so the city-gate UI can render them as "Coming soon" and feed waitlist signups.

| Slug | el | en | Country | Eligible | Order |
|---|---|---|---|---|---|
| `rhodes` | Ροδος | Rhodes | Greece | true | 1 |
| `athens` | Αθηνα | Athens | Greece | false | 2 |
| `thessaloniki` | Θεσσαλονικη | Thessaloniki | Greece | false | 3 |
| `patras` | Πατρα | Patras | Greece | false | 4 |
| `heraklion` | Ηρακλειο | Heraklion | Greece | false | 5 |
| `larissa` | Λαρισα | Larissa | Greece | false | 6 |
| `volos` | Βολος | Volos | Greece | false | 7 |
| `ioannina` | Ιωαννινα | Ioannina | Greece | false | 8 |
| `chania` | Χανια | Chania | Greece | false | 9 |
| `london` | London | London | United Kingdom | false | 10 |
| `berlin` | Berlin | Berlin | Germany | false | 11 |
| `paris` | Paris | Paris | France | false | 12 |
| `amsterdam` | Amsterdam | Amsterdam | Netherlands | false | 13 |
| `rome` | Rome | Rome | Italy | false | 14 |
| `madrid` | Madrid | Madrid | Spain | false | 15 |

## Stores (1 row — V1)

Only the primary iRepair Rhodes store. Multi-store schema is ready (see `15_STORES_AND_LOCATIONS.md`) but only one row in V1.

| Field | Value |
|---|---|
| `id` | `store_irepair_rhodes` (deterministic — used by app code) |
| `name` | iRepair Rhodes |
| `name_el` | iRepair Ροδος |
| `address` | Plateia Kyprou 3, Rhodes 851 00 |
| `address_en` | Plateia Kyprou 3, Rhodes 851 00 |
| `phone` | +30 2241 0xx xxx (**MISSING** — fill before launch) |
| `hours` | Mon–Sat 09:00–21:00 |
| `hours_note` | Κυριακη κλειστα |
| `hours_note_en` | Closed Sunday |
| `website` | https://irepair.gr |
| `maps_url` | (**MISSING** — fill before launch) |
| `city` | `rhodes` |
| `lat` | 36.4378 (**APPROXIMATE** — geocode the real address) |
| `lng` | 28.2237 (**APPROXIMATE**) |
| `is_primary` | true |
| `visible_in_app` | true |
| `promo_enabled` | true |
| `partner_status` | `owned` |
| `lead_fee_per_checkin` | 0 |
| `lead_fee_per_redeem` | 0 |

## Grade config (1 row — global default)

| Field | Value |
|---|---|
| `id` | `grade_config_default` |
| `store_id` | NULL (global) |
| `grade_a` | 1.00 |
| `grade_b` | 0.93 |
| `grade_c` | 0.85 |
| `grade_d` | 0.60 |

VERBATIM from `mobile/src/lib/constants.ts`.

## Moderation config (1 row)

| Field | Value |
|---|---|
| `id` | `moderation_config_default` |
| `private_report_threshold` | 2 |
| `store_report_threshold` | 5 |
| `cooldown_days` | 7 |
| `limited_state_days` | 7 |
| `strike_decay_days` | 90 |
| `fraud_hold_threshold` | 80 |

VERBATIM from `ModerationConfig` defaults in `backend/prisma/schema.prisma`.

## Staff (0 rows V1, document on first deploy)

The first super_admin is created post-launch via Supabase Studio:

1. Create user account through the app (with admin@APP_DOMAIN).
2. In Studio, `update profiles set role='super_admin' where email='admin@APP_DOMAIN';`
3. Insert into `staff` table: `(user_id, store_id, role='super_admin', is_active=true)`.

Document this as runbook step. Don't seed staff rows because the user_id requires an actual `auth.users` row.

## Featured listings — V1 launch fixture

To avoid an empty-marketplace launch, the iRepair team will pre-seed 8–12 "store listings" with `is_store=true`. These are real devices iRepair is selling, not user-submitted. Seed via authenticated admin login + the regular create-listing flow; do not bake into `seed-data.json` because images need real CDN URLs.

PROPOSED: a `scripts/seed-featured.ts` that reads a small JSON of real listings + image URLs and inserts them through the same API the app uses (ensures every validation runs).

## Idempotency

`scripts/seed.ts` pattern for each table:

```ts
for (const city of seedData.cities) {
  await supabaseAdmin
    .from('cities')
    .upsert(city, { onConflict: 'slug' });
}
```

Run after every migration deploy. Safe to run repeatedly.

## seed-data.json shape

```jsonc
{
  "cities": [
    { "slug": "rhodes", "name_el": "Ροδος", "name_en": "Rhodes", "country": "Greece", "is_eligible": true, "display_order": 1 },
    { "slug": "athens", "name_el": "Αθηνα", "name_en": "Athens", "country": "Greece", "is_eligible": false, "display_order": 2 },
    // ... 13 more — see file
  ],
  "stores": [
    {
      "id": "store_irepair_rhodes",
      "name": "iRepair Rhodes",
      "name_el": "iRepair Ροδος",
      "address": "Plateia Kyprou 3, Rhodes 851 00",
      "address_en": "Plateia Kyprou 3, Rhodes 851 00",
      "phone": null,
      "hours": "Mon–Sat 09:00–21:00",
      "hours_note": "Κυριακη κλειστα",
      "hours_note_en": "Closed Sunday",
      "website": "https://irepair.gr",
      "maps_url": null,
      "city": "rhodes",
      "lat": 36.4378,
      "lng": 28.2237,
      "is_primary": true,
      "visible_in_app": true,
      "promo_enabled": true,
      "partner_status": "owned",
      "lead_fee_per_checkin": 0,
      "lead_fee_per_redeem": 0
    }
  ],
  "grade_config": [
    { "id": "grade_config_default", "store_id": null, "grade_a": 1.00, "grade_b": 0.93, "grade_c": 0.85, "grade_d": 0.60 }
  ],
  "moderation_config": [
    {
      "id": "moderation_config_default",
      "private_report_threshold": 2,
      "store_report_threshold": 5,
      "cooldown_days": 7,
      "limited_state_days": 7,
      "strike_decay_days": 90,
      "fraud_hold_threshold": 80
    }
  ]
}
```

Save the full version as `seed-data.json` alongside this file in the bundle.

## What is NOT seeded

- Users / profiles — created on signup via Supabase trigger.
- Listings — created by users (or admin via `scripts/seed-featured.ts`).
- Appointments, messages, audit log — runtime only.
- Inspections — created post-grading at the store.
- Tokens — issued by the appointment flow.
