# 10 — i18n Copy Export

Source: `mobile/src/lib/languageStore.ts` (589 lines). Two locales: `el` (default), `en`. ~215 keys per locale.

## Critical rules

1. **Greek UPPERCASE strings have NO accents.** Examples:
   - `condition_new: "ΚΑΙΝΟΥΡΓΙΟ"` (not "ΚΑΙΝΟΎΡΓΙΟ")
   - `tab_browse: "ΑΝΑΖΗΤΗΣΗ"` (not "ΑΝΑΖΉΤΗΣΗ")
   - `home_title: "MOBILE UNIT"` (Latin, untouched)
2. **Greek lowercase strings carry accents stripped too** (per source convention):
   - `condition_new_desc: "Αχρησιμοποιητο, στην αρχικη συσκευασια"` (not "Αχρησιμοποίητο, στην αρχική συσκευασία")
3. **English follows normal casing** — uppercase for buttons/headers/labels, sentence case for descriptions.
4. **Default locale `el`** — sign-up trigger sets `language_pref = 'el'` (see `08_AUTH_AND_SESSION_EXPORT.md`).

## Stack mapping

| Source | Target |
|---|---|
| Zustand store + AsyncStorage | `next-intl` with App Router |
| Hardcoded object literal | `messages/el.json` + `messages/en.json` |
| `t(key)` function | `useTranslations()` hook + `getTranslations()` server util |
| Language toggle stored in `language-storage` AsyncStorage | Cookie `NEXT_LOCALE` + `profiles.language_pref` for authenticated users |

## next-intl folder layout

```
app/
  [locale]/
    layout.tsx
    page.tsx
    ...
i18n/
  request.ts                  // server-side locale resolver
  routing.ts                  // defineRouting({ locales: ['el','en'], defaultLocale: 'el' })
messages/
  el.json
  en.json
middleware.ts                 // next-intl middleware + Supabase session refresh
```

## Key inventory

Grouped exactly as in source. **DO NOT renumber or rename** — Codex should preserve keys so translators can diff against the current mobile app.

### browse (10 keys)
`browse_title, browse_subtitle, search_placeholder, all_categories, phones, tablets, laptops, accessories, verified_only, no_listings, results_singular, results_plural, try_different_filters`

### conditions (5 + 5 desc)
`condition_new, condition_like_new, condition_good, condition_fair, condition_parts`
`condition_new_desc, condition_like_new_desc, condition_good_desc, condition_fair_desc, condition_parts_desc`

### sell (14 keys)
`sell_title, sell_subtitle, photos_label, min_photos, title_label, category_label, condition_label, city_label, price_label, brand_label, model_label, location_label, description_label, publish_button, creating, pricing_guide, vat_free, check_pricing`

### sell extras (14 keys)
`login_to_sell, login_to_sell_desc, submitted_for_approval, submitted_for_approval_desc, missing_fields, missing_fields_desc, photos_required, photos_required_desc, select_brand, select_category_first, select_model, type_model, select_brand_first, more_needed, other_brand, description_placeholder, pricing_of_new`

### profile (13 keys)
`profile_title, my_listings, listings_count, views_count, create_new, no_listings_yet, create_first, settings, support, legal, sign_out, sign_in, sign_in_to_profile, manage_listings_desc, user_fallback, language_label`

### service (5 keys)
`service_title, grading_cta, book_appointment, diagnostic_fee, refunded_on_purchase`

### common (8 keys)
`loading, error, success, cancel, confirm, rhodes, add, remove`

### onboarding (5 + 6 value props)
`welcome_title, welcome_subtitle, get_started, have_account, skip, next`
`value_approved_title, value_approved_desc, value_pickup_title, value_pickup_desc, value_inspection_title, value_inspection_desc`

### city gate (6 keys)
`select_city, select_city_subtitle, available_now, coming_soon, other_city, use_location`

### waitlist (14 keys)
`join_waitlist, waitlist_title, waitlist_subtitle, email_label, interest_label, buyer, seller, both, phone_label, social_label, notes_label, referral_code_label, consent_label, submit_waitlist`

### waitlist success (7 keys)
`waitlist_success_title, waitlist_success_subtitle, your_referral_code, share_referral, share_button, copy_link, copied, view_demo, referral_bonus`

### demo mode (4 keys)
`demo_banner, demo_locked_title, demo_locked_subtitle, demo_locked_cta`

### cities (15 keys)
`city_rhodes, city_athens, city_thessaloniki, city_patras, city_heraklion, city_larissa, city_volos, city_ioannina, city_chania, city_london, city_berlin, city_paris, city_amsterdam, city_rome, city_madrid`

### countries (8 keys)
`country_greece, country_uk, country_germany, country_france, country_netherlands, country_italy, country_spain, country_other`

### listing detail (12 keys)
`listing_not_found, report_submitted, report_submitted_desc, report_listing, report_confirm, contact_seller, back, seller_label, member_since, description, condition, pickup_only, views`

### stores (8 keys)
`stores_title, open_in_maps, store_hours, store_services, diagnostics, repairs, grading, sales`

### book appointment (8 keys)
`book_appointment_title, select_date, select_time, morning, afternoon, diagnostic_info, confirm_booking, booking_confirmed`

### book appointment extras (9 keys)
`appointment_booked, appointment_booked_desc, booking_error, grading_at_irepair, grading_at_irepair_desc, diagnostic_fee_title, diagnostic_fee_refund, diagnostic_fee_info, booking, book_appointment_cta, external_booking`

### safety tips (7 keys)
`safe_meetup, safety_tips_title, safety_tip_1, safety_tip_2, safety_tip_3, safety_tip_4, safety_tip_5`

### auth (6 keys)
`email_placeholder, password_placeholder, forgot_password, create_account, login_title, register_title, or_continue_with`

### assistant (9 keys)
`assistant_title, assistant_subtitle, thinking, type_message, suggestions, hi_how_can_i_help, ask_about, open_assistant, close, send`

### tabs (4 keys)
`tab_home, tab_browse, tab_sell, tab_profile`

### home (5 keys)
`home_title, home_subtitle, recent_listings, see_all, featured, verified`

### sell categories (4 keys)
`category_phone, category_tablet, category_laptop, category_accessory`

### demo browse (8 keys)
`get_repair_quote, ask_us, buy_sell_greece, device_certification, categories, no_featured_yet, recent, all, no_listings_yet_demo`

## Missing keys (web-only screens — ADD in rebuild)

| Screen | New keys |
|---|---|
| `/[locale]/profile/delete` | `profile_delete_title, profile_delete_warning, profile_delete_confirm_input, profile_delete_button` |
| `/[locale]/profile/data-export` | `data_export_title, data_export_desc, data_export_button, data_export_throttled` |
| `/[locale]/auth/reset-password` | `reset_password_title, reset_password_email_sent, reset_password_new_password, reset_password_confirm` |
| `/[locale]/admin/*` | `admin_dashboard_title, admin_queue, admin_users, admin_listings, admin_reports, admin_fraud_holds, admin_appointments, admin_audit_log` |
| `/[locale]/legal/*` | `legal_terms, legal_privacy, legal_cookies, legal_gdpr` |
| Empty states | `messages_empty, appointments_empty, notifications_empty` |

## Typography rule enforcement

CI check (lint plugin): every Greek UPPERCASE string in `messages/el.json` must NOT contain any of `Ά Έ Ή Ί Ό Ύ Ώ ΐ ϊ ϋ ά έ ή ί ό ύ ώ ΰ` accents. Build script:

```ts
// scripts/check-greek-uppercase.ts
import el from '@/messages/el.json';
const ACCENTED = /[ΆΈΉΊΌΎΏΐϊϋάέήίόύώΰ]/;
const errors: string[] = [];
function walk(obj: unknown, path: string) {
  if (typeof obj === 'string') {
    if (obj === obj.toLocaleUpperCase('el-GR') && ACCENTED.test(obj)) {
      errors.push(`${path}: "${obj}"`);
    }
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`);
  }
}
walk(el, 'el');
if (errors.length) { console.error('Accented UPPERCASE Greek strings:\n' + errors.join('\n')); process.exit(1); }
```

Wire into GitHub Actions `pre-merge` workflow.

## Domain glossary (preserved from source)

| Term (el) | English |
|---|---|
| ΑΡΙΣΤΗ | EXCELLENT (Grade A) |
| ΚΑΛΗ | GOOD (Grade B) |
| ΜΕΤΡΙΑ | FAIR (Grade C) |
| ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ | FOR PARTS (Grade D) |
| ΒΑΘΜΟΛΟΓΗΣΗ ΣΤΟ IREPAIR | GET GRADED AT IREPAIR |
| ΑΓΓΕΛΙΑ | LISTING |
| ΠΟΛΗ | CITY |
| ΡΟΔΟΣ | RHODES |
| ΠΙΣΤΟΠΟΙΗΜΕΝΟ | VERIFIED |
| ΛΙΣΤΑ ΑΝΑΜΟΝΗΣ | WAITLIST |

These are the canonical Greek translations — match in admin and store-facing pages too.
