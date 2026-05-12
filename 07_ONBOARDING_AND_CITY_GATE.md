# 07 — Onboarding & City Gate

Source: `mobile/src/app/onboarding.tsx` (1242 lines), `mobile/src/lib/onboardingStore.ts`. Behavior translates directly to a `/onboarding` Next.js route group.

## Flow

Three views, single page, no URL changes (controlled by client state). Persisted in zustand store + a server round-trip on completion.

```
welcome ──▶ carousel (3 slides) ──▶ city-gate
                                      │
                ┌─────────────────────┼───────────────────────┐
                ▼                     ▼                       ▼
        Rhodes selected         Greek city                 European city
        (is_eligible)           (waitlist)                 (waitlist)
                │                     │                       │
                ▼                     ▼                       ▼
            /(marketplace)      /waitlist?city=...         /waitlist?city=...
```

## View 1 — Welcome

Full-bleed gradient background. Hero text:

| Key | el | en |
|---|---|---|
| `onboarding.welcome.brand` | **MOBILE UNIT** | **MOBILE UNIT** |
| `onboarding.welcome.tagline` | Η ΑΓΟΡΑ ΕΜΠΙΣΤΟΣΥΝΗΣ ΓΙΑ ΧΡΗΣΙΜΟΠΟΙΗΜΕΝΕΣ ΣΥΣΚΕΥΕΣ | THE TRUSTED MARKETPLACE FOR USED DEVICES |
| `onboarding.welcome.cta` | ΣΥΝΕΧΕΙΑ | CONTINUE |

Language toggle in top-right (EL / EN, persisted via the language store immediately).

## View 2 — Carousel

Three slides, horizontal swipe (use `embla-carousel-react` on web). Each slide:

| Slide | Icon | Color | Title (el / en) | Body (el / en) |
|---|---|---|---|---|
| 1 | SHIELD | `#00FF88` | ΠΙΣΤΟΠΟΙΗΜΕΝΕΣ ΣΥΣΚΕΥΕΣ / VERIFIED DEVICES | Καθε συσκευη ελεγχεται απο τους τεχνικους του `iRepair`. / Every device is checked by `iRepair` technicians. |
| 2 | PIN | `#00BFFF` | ΤΟΠΙΚΗ ΑΓΟΡΑ / LOCAL MARKETPLACE | Αγορες και πωλησεις στην `PRIMARY_CITY`. Παραλαβη απο κοντα, χωρις αποστολες. / Buying and selling in `PRIMARY_CITY`. Local pickup, no shipping. |
| 3 | CHECKLIST | `#FFD700` | ΕΛΕΓΧΟΣ ΠΟΙΟΤΗΤΑΣ / QUALITY CHECK | Καθε συσκευη βαθμολογειται A, B, C ή D. Διαφανεια χωρις εκπληξεις. / Every device is graded A, B, C, or D. Transparency, no surprises. |

Slide 3 has a "repair upsell" card below the carousel content:

| Key | el | en |
|---|---|---|
| `onboarding.repair.title` | ΧΡΕΙΑΖΕΣΑΙ ΕΠΙΣΚΕΥΗ; | NEED A REPAIR? |
| `onboarding.repair.body` | Κανε κρατηση στο `iRepair` τωρα. Διαγνωση €10, επιστρεπτεα αν αγορασεις. | Book at `iRepair` now. €10 diagnostic, refundable on purchase. |
| `onboarding.repair.cta` | ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ | BOOK APPOINTMENT |

CTA opens external `EXTERNAL_BOOKING_URL` in a new tab. Tracks event `repair_upsell_clicked` with `{ source: 'onboarding' }`.

"Next" / "ΕΠΟΜΕΝΟ" advances to view 3.

## View 3 — City Gate

Header:
- el: "ΣΕ ΠΟΙΑ ΠΟΛΗ ΕΙΣΑΙ;"
- en: "WHICH CITY ARE YOU IN?"

Best-match card (top) — `PRIMARY_CITY`:

```
┌────────────────────────────────────────────┐
│ 🟢 BEST MATCH / ΚΑΛΥΤΕΡΟ ΤΑΙΡΙΑΣΜΑ        │
│                                            │
│  RHODES • GREECE                           │
│  Έτοιμη για χρηση. / Ready to use.        │
│                                            │
│  [ΕΙΣΟΔΟΣ / ENTER]                         │
└────────────────────────────────────────────┘
```

Below the best-match card, two collapsible sections:

1. **Άλλες πόλεις στην Ελλάδα / Other cities in Greece** — 8 cards (Athens, Thessaloniki, Patras, Heraklion, Larissa, Volos, Ioannina, Chania). Each card label: "JOIN WAITLIST". Click → `/waitlist?city=<slug>`.
2. **Ευρώπη / Europe** — 6 cards (London, Berlin, Paris, Amsterdam, Rome, Madrid). Same waitlist routing.

Source data: seed `cities` table from `seed-data.json`. Only `PRIMARY_CITY` (`rhodes`) has `is_eligible=true`.

## State management

Replace `mobile/src/lib/onboardingStore.ts` with a Zustand store + cookie sync.

```ts
// lib/stores/onboarding.ts
type OnboardingState = {
  onboardingCompleted: boolean;
  selectedCity: string | null;
  selectedCountry: string | null;
  isEligibleCity: boolean;
  hydrated: boolean;
  // ...
  setCity: (slug: string) => void;
  complete: () => void;
  reset: () => void;
};
```

Persist subset (`onboardingCompleted`, `isEligibleCity`, `selectedCity`, `selectedCountry`) to `localStorage` via `zustand/middleware`. **Also** call `PATCH /api/users/me/onboarding` on completion when the user is signed in, so the server is the source of truth.

Hydration: use a `useOnboardingHydrated()` hook that flips `true` after the first client render (`useEffect(() => setHydrated(true), [])`). Server components read state from cookies + `profiles` row instead.

## Tourist mode

`TOURIST_MODE_ENABLED = false` in the source. Locked off. **Don't** add a "I'm just visiting" path in V1.

## Re-onboarding

A signed-in user can re-run onboarding via `Profile → Settings → Re-run onboarding`. This clears `onboarding_completed`, `selected_city`, `selected_country`, `is_eligible_city` in both the store and the DB.

## Edge cases

- **Authed user lands on `/onboarding` already completed:** middleware redirects to `/` (or `/demo-browse` if not eligible).
- **Anon user picks Rhodes:** routes to `/login?next=/` since marketplace requires auth for sell/contact. Browse is still possible anon.
- **Anon user picks waitlist city:** they go through `/waitlist` without auth.
- **Language switch mid-flow:** state persists, only labels change.

## Analytics events

Per `27_OPEN_QUESTIONS.md`, these events should be fired when the events table lands:
- `onboarding_started` — first view of `/onboarding`.
- `onboarding_view_carousel` — slide index transitions.
- `onboarding_repair_upsell_clicked` — slide 3 CTA.
- `onboarding_city_selected` — `{ city, isEligible }`.
- `onboarding_completed` — final state write.
