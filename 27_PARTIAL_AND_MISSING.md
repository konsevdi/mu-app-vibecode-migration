# 27 — PARTIAL and MISSING items

The source is intentionally rough in places. This file enumerates everything marked **PARTIAL** (started, not finished) or **MISSING** (referenced but never built) across the bundle, so Codex knows what needs filling vs. what's done.

## PARTIAL — started in source, finish in rebuild

| # | Item | Source state | Rebuild scope |
|---|---|---|---|
| P1 | **Listing photo upload** | Uses Vibecode proxy; multi-photo + min/max enforced client-side; no EXIF strip; no blurhash | Replace with Supabase signed URLs + client-side EXIF strip + blurhash on upload (`@plaiceholder/base64`). See `09_LISTINGS_FLOW.md` + `19_SUPABASE_SETUP.md`. |
| P2 | **Chat realtime** | Polling on a 3s interval | Supabase Realtime channel per conversationId. See `10_MESSAGING_AND_CHAT.md`. |
| P3 | **Auth — password reset** | Better Auth endpoint exists but no UI screen | Build `/auth/reset-password` + `/auth/reset-password/confirm` flows on Supabase Auth. |
| P4 | **Onboarding step 4 (notifications opt-in)** | Mobile uses native permission; web has no analog without push | Replace with a "subscribe to email updates" toggle. PROPOSED. |
| P5 | **City gate "use my location"** | Mobile uses `expo-location`; web has the equivalent | Use `navigator.geolocation` with explicit consent banner; map to nearest eligible city using a server-side function `pick_city_for_coords(lat, lng)`. |
| P6 | **Stores page** | One store hard-coded in `mobile/src/app/stores.tsx` | Read from `stores` table, render list/grid with map. |
| P7 | **Inspection record creation** | Schema exists, no UI on mobile | Build admin UI in V1.1. V1: insert via Supabase Studio if needed. Listing fields (`grade`, `inspection_date`, `checklist_complete`) update via a service-role admin script. |
| P8 | **Fraud admin dashboard** | Server logic + log tables; no UI | V1: query via Supabase Studio. V1.1: dedicated `/admin/holds` page. |
| P9 | **AI assistant grounding facts** | System prompt defined; grounding facts (current listings, store hours) injected manually | Build a Postgres function `get_assistant_context(user_id)` that returns a JSON blob; inject as a cached system block. |
| P10 | **Appointment token rotation (60s)** | Schema has `code_rotated_at`; mobile screen polls every 10s | Server-side `pg_cron` job rotates active tokens every 60s; client subscribes via Realtime. |
| P11 | **i18n: pluralization keys** | Two separate keys (`results_singular`, `results_plural`) | Migrate to ICU MessageFormat (see `16_I18N_AND_COPY.md`). |
| P12 | **Demo browse mode** | Renders mock listings; shown when city-gate fails | Web version: server route that returns 12 curated demo listings (filtered from real listings flagged `is_demo=true` OR seeded fixtures). Keep "Demo Mode" banner. |
| P13 | **Verification badge logic** | "Verified after 2+ trust events" rule lives in `lib/verification.ts`; trust event sources defined loosely | Document trust event sources explicitly: completed-grade, completed-appointment, completed-transaction (V2), partner-vouch. Code reads from `trust_event_count` column. |
| P14 | **Pricing guide** | Modal that links to PANDAS_PRICING_URL; PRICING_BANDS shown inline | Same on web; add a "show bands for this category" expandable card. |
| P15 | **Support page** | Static content placeholder | Real FAQ entries (Greek + English) needed before launch — coordinate with iRepair support team. |

## MISSING — referenced but never built

| # | Item | Where referenced | Decision required |
|---|---|---|---|
| M1 | **`iRepair Rhodes` real phone, maps URL, photo** | `stores` seed data | Get from iRepair owner before launch |
| M2 | **Email transactional templates** (auth confirm, password reset, listing approved/rejected, appointment confirm, waitlist confirm, fraud-hold notify) | Throughout | Build React Email templates, see `21_THIRD_PARTY_INTEGRATIONS.md` |
| M3 | **404 / 500 / maintenance page copy** | Mobile has none — needs web equivalents | Draft in `el` + `en`; design follows `17_DESIGN_SYSTEM.md` |
| M4 | **OpenGraph / Twitter card images per locale** | Marketing pages | Generate at build time via `app/opengraph-image.tsx` per route. |
| M5 | **Sitemap entries for cities not yet eligible** | SEO | Decide: do we expose `/el/coming-soon/athens` waitlist landings? Greek SEO juice is real. Recommendation: yes, build templated page per city. |
| M6 | **Robots.txt rules for staging/preview** | `app/robots.ts` | `Disallow: /` on staging + preview (env-driven). |
| M7 | **Manifest.json for PWA** | None | Build basic web app manifest (icon, theme color, name) even pre-PWA install support. |
| M8 | **Greek legal text** (Terms, Privacy, Cookies) | `legal.tsx` is a stub | External — lawyer. See `26_OPEN_QUESTIONS.md` J1. |
| M9 | **Returns / dispute resolution policy** | None | We facilitate, not transact — TOS clarifies. Greek lawyer drafts. |
| M10 | **Admin web UI** | Schema supports it; UI doesn't exist | V1: Supabase Studio. V1.1: build `/admin/*` routes with RLS-gated access. |
| M11 | **Inspection checklist UI** | `Inspection.checklistJson` column expected JSON; format not documented | Define schema in `13_INSPECTION_AND_GRADING.md` — keys for screen condition, battery health, accessories, etc. iRepair's existing intake form is the source. |
| M12 | **Pricing tiers for sell page** | "of new price" hint with bands shown but no integration with Pandas pricing scraper | V1: link out. V1.1: optional scrape via server-side fetch with cache. |
| M13 | **Multi-photo carousel on listing detail (web)** | Mobile uses a horizontal ScrollView | Build `<ListingGallery>` with thumbnails + full-screen lightbox. |
| M14 | **Empty state for "no messages yet"** | Mobile screen has it; web doesn't exist yet | Build per `17_DESIGN_SYSTEM.md` EmptyState. |
| M15 | **Cookie consent banner** | None | Library + translations + integration with PostHog gating. See `22_RATE_LIMITING_AND_SECURITY.md`. |
| M16 | **Auth: account deletion UI** | None | Required for GDPR. Build `/profile/delete` with 30-day soft-delete grace. |
| M17 | **Data export UI** | None | `/profile/data-export` route emits JSON archive. GDPR right-to-access. |
| M18 | **Localized SMS sender ID** | Not in V1 | When SMS lands V1.1+, configure ID per locale. |
| M19 | **Profile photo upload** | `profiles.image` column exists; no UI | Defer to V1.1. Use email-hash gravatar fallback meanwhile. |
| M20 | **Verified-seller badge tooltip text** | Badge component referenced but tooltip text not in i18n | Add to `messages/*.json`. |
| M21 | **Search ranking / sort options on browse** | Default newest-first; no other sort | V1 keep newest-first only. V1.1 add "price low→high", "price high→low", "verified first". |
| M22 | **Push notifications, in-app notifications center** | None | Out of scope V1. |
| M23 | **Referral counter back-fill** | `WaitlistSignup.referralCount` not auto-incremented anywhere visible | When a new waitlist signup arrives with `referredByCode`, increment the referrer's `referral_count` and `position_score` (+3 per referral) via Postgres trigger. |
| M24 | **Cookie consent JSON for el+en** | None | Generate. |
| M25 | **Pricing-aware fraud heuristic** | Fraud score system exists; "price far below market" signal not implemented | V1.1: server-side check against PRICING_BANDS — listings priced < 50% of band minimum flagged for review. |
| M26 | **i18n: condition descriptions, value props for screens unique to web** | Source covers mobile screens | New web-only screens (404, status, data export, account delete confirm) need new keys. |
| M27 | **iRepair grading SLA copy** | "Turnaround hours" referenced; not surfaced | Once we have a real SLA from iRepair, add a copy block to the appointment flow. |
| M28 | **Listing approval reason codes** | Status `rejected` but no reason field | Add `rejection_reason text` to listings with a check constraint over known codes (`photos`, `pricing`, `category`, `safety`, `other`). |
| M29 | **Sitemap localization** | `app/sitemap.ts` not yet written | Generate per-locale entries; reference each canonical URL twice with hreflang. |
| M30 | **Backups runbook** | Backup job exists in `20_CI_CD.md`; restore steps not documented | Write `OPERATIONS.md` with restore commands. |

## How to use this list

- Before launch, all **MISSING** items in section A–H above must either ship or have a documented "we accept this risk for V1" entry in the decision log.
- **PARTIAL** items: each has an owner in the rebuild team. Track in Linear / Jira / etc.
- Re-read this file at the **V1 cut** date — anything still **MISSING** is a launch blocker unless explicitly waived.
