# 16 — i18n and Copy

## Library choice (decision D8)

Use **next-intl** with App Router. Locales are part of the URL path (`/el/...`, `/en/...`) so each language is independently cacheable on Vercel's edge network. Default locale: `el`. Fallback: `en`.

```bash
bun add next-intl
```

`middleware.ts` redirects `/` → `/el` based on cookie / `Accept-Language`.

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware';
export default createMiddleware({
  locales: ['el', 'en'],
  defaultLocale: 'el',
  localePrefix: 'always',
});
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

## Greek casing rules (VERBATIM from source)

Two strict rules that must be preserved character-for-character:

1. **UPPERCASE Greek strings carry NO accents.** Greek typography drops tonos marks when text is set in all caps. `ΕΓΓΡΑΦΗ`, not `ΕΓΓΡΑΦΉ`. `ΑΓΟΡΑ`, not `ΑΓΟΡΆ`.
2. **lowercase / Title Case Greek strings keep accents.** `Καλώς ήρθες` — but the source file has it stripped (`Καλως ηρθες`) because the original designer chose unaccented sentence case as a style. Keep the source values verbatim. Do NOT auto-add accents.

Do not run any tooling that "fixes" Greek accents. If a translator delivers re-accented strings, that is a separate product decision — flag it, don't apply silently.

Test fixture (any deviation = bug):

```
ΑΓΟΡΑ, ΚΑΙΝΟΥΡΓΙΟ, ΣΑΝ ΚΑΙΝΟΥΡΓΙΟ, ΑΞΕΣΟΥΑΡ, ΡΟΔΟΣ, ΠΩΛΗΣΗ, ΕΓΓΡΑΦΗ, ΑΣΦΑΛΗΣ ΣΥΝΑΝΤΗΣΗ
```

## File layout

```
messages/
  el.json   — Greek (default)
  en.json   — English
```

Each is a flat key-value JSON. The source has ~210 keys grouped by section (browse, sell, profile, onboarding, city gate, waitlist, listing detail, stores, book-appointment, safety tips, auth, assistant, tabs, home). Keep the grouping as JSON comment-free sections in code via nested objects, e.g.:

```json
{
  "browse": { "title": "ΑΓΟΡΑ", "subtitle": "Ανακαλυψε συσκευες κοντα σου" },
  "common": { "loading": "ΦΟΡΤΩΣΗ...", "error": "ΣΦΑΛΜΑ" }
}
```

Then translators see structure. In code: `const t = useTranslations('browse'); t('title')`.

## Source of truth

`mobile/src/lib/languageStore.ts` in the Expo source has the full `translations` object — `el` and `en` keyed identically. The next section is the **full export** of those keys. Treat it as VERBATIM.

## Full key table (VERBATIM from source)

> 210 keys total. Re-keyed by group below. Greek values in `el` column are the canonical source values — copy character-for-character.

### Browse

| Key | el | en |
|---|---|---|
| `browse.title` | ΑΓΟΡΑ | BROWSE |
| `browse.subtitle` | Ανακαλυψε συσκευες κοντα σου | Discover devices near you |
| `browse.search_placeholder` | Αναζητηση... | Search... |
| `browse.all_categories` | ΟΛΑ | ALL |
| `browse.phones` | ΚΙΝΗΤΑ | PHONES |
| `browse.tablets` | TABLETS | TABLETS |
| `browse.laptops` | LAPTOPS | LAPTOPS |
| `browse.accessories` | ΑΞΕΣΟΥΑΡ | ACCESSORIES |
| `browse.verified_only` | ΜΟΝΟ ΠΙΣΤΟΠΟΙΗΜΕΝΑ | VERIFIED ONLY |
| `browse.no_listings` | ΔΕΝ ΒΡΕΘΗΚΑΝ ΑΓΓΕΛΙΕΣ | NO LISTINGS FOUND |
| `browse.results_singular` | αποτελεσμα | result |
| `browse.results_plural` | αποτελεσματα | results |
| `browse.try_different_filters` | Δοκιμασε διαφορετικα φιλτρα η αναζητηση | Try different filters or search |

### Condition labels (UPPERCASE = no accents)

| Key | el | en |
|---|---|---|
| `condition.new` | ΚΑΙΝΟΥΡΓΙΟ | NEW |
| `condition.like_new` | ΣΑΝ ΚΑΙΝΟΥΡΓΙΟ | LIKE NEW |
| `condition.good` | ΚΑΛΟ | GOOD |
| `condition.fair` | ΜΕΤΡΙΟ | FAIR |
| `condition.parts` | ΑΝΤΑΛΛΑΚΤΙΚΑ | FOR PARTS |

### Condition descriptions (lowercase = with accents NOT preserved in source — keep as-is)

| Key | el | en |
|---|---|---|
| `condition.new_desc` | Αχρησιμοποιητο, στην αρχικη συσκευασια | Unused, in original packaging |
| `condition.like_new_desc` | Ελαχιστη χρηση, αριστη κατασταση | Minimal use, excellent condition |
| `condition.good_desc` | Μικρα σημαδια χρησης | Minor signs of use |
| `condition.fair_desc` | Φανερη χρηση, πληρως λειτουργικο | Visible use, fully functional |
| `condition.parts_desc` | Για ανταλλακτικα μονο | For parts only |

### Sell

| Key | el | en |
|---|---|---|
| `sell.title` | ΝΕΑ ΑΓΓΕΛΙΑ | NEW LISTING |
| `sell.subtitle` | Πουλησε τη συσκευη σου στο Mobile Unit | Sell your device on Mobile Unit |
| `sell.photos_label` | ΦΩΤΟΓΡΑΦΙΕΣ (3-10) | PHOTOS (3-10) |
| `sell.min_photos` | Ελαχιστο 3 φωτογραφιες | Minimum 3 photos required |
| `sell.title_label` | ΤΙΤΛΟΣ | TITLE |
| `sell.category_label` | ΚΑΤΗΓΟΡΙΑ | CATEGORY |
| `sell.condition_label` | ΚΑΤΑΣΤΑΣΗ | CONDITION |
| `sell.city_label` | ΠΟΛΗ | CITY |
| `sell.price_label` | ΤΙΜΗ | PRICE |
| `sell.brand_label` | ΜΑΡΚΑ | BRAND |
| `sell.model_label` | ΜΟΝΤΕΛΟ | MODEL |
| `sell.location_label` | ΤΟΠΟΘΕΣΙΑ | LOCATION |
| `sell.description_label` | ΠΕΡΙΓΡΑΦΗ | DESCRIPTION |
| `sell.publish_button` | ΔΗΜΟΣΙΕΥΣΗ ΑΓΓΕΛΙΑΣ | PUBLISH LISTING |
| `sell.creating` | ΔΗΜΙΟΥΡΓΙΑ... | CREATING... |
| `sell.pricing_guide` | ΟΔΗΓΟΣ ΤΙΜΟΛΟΓΗΣΗΣ | PRICING GUIDE |
| `sell.vat_free` | Χωρις ΦΠΑ για μεταχειρισμενα | VAT-free for used items |
| `sell.check_pricing` | Δες Τιμες Αγορας Pandas | Check Pandas Pricing |
| `sell.login_to_sell` | ΣΥΝΔΕΣΟΥ ΓΙΑ ΝΑ ΠΟΥΛΗΣΕΙΣ | SIGN IN TO SELL |
| `sell.login_to_sell_desc` | Δημιουργησε λογαριασμο για να καταχωρησεις τις συσκευες σου | Create an account to list your devices |
| `sell.submitted_for_approval` | ΥΠΟΒΛΗΘΗΚΕ ΓΙΑ ΕΓΚΡΙΣΗ | SUBMITTED FOR APPROVAL |
| `sell.submitted_for_approval_desc` | Η αγγελια σου υποβληθηκε και θα εγκριθει συντομα | Your listing was submitted and will be approved soon |
| `sell.missing_fields` | ΛΕΙΠΟΥΝ ΣΤΟΙΧΕΙΑ | MISSING FIELDS |
| `sell.missing_fields_desc` | Συμπληρωσε ολα τα υποχρεωτικα πεδια | Fill in all required fields |
| `sell.photos_required` | ΑΠΑΙΤΟΥΝΤΑΙ ΦΩΤΟΓΡΑΦΙΕΣ | PHOTOS REQUIRED |
| `sell.photos_required_desc` | Προσθεσε τουλαχιστον 3 φωτογραφιες | Add at least 3 photos |
| `sell.select_brand` | Επιλεξε μαρκα | Select brand |
| `sell.select_category_first` | Επιλεξε πρωτα κατηγορια | Select category first |
| `sell.select_model` | Επιλεξε μοντελο | Select model |
| `sell.type_model` | Γραψε μοντελο | Type model |
| `sell.select_brand_first` | Επιλεξε πρωτα μαρκα | Select brand first |
| `sell.more_needed` | ΑΚΟΜΑ | MORE |
| `sell.other_brand` | ΑΛΛΟ | OTHER |
| `sell.description_placeholder` | Περιγραψε τη συσκευη σου, συμπεριλαμβανομενων τυχον γρατζουνιων, αξεσουαρ, υγεια μπαταριας κ.λπ. | Describe your device, including any scratches, accessories, battery health, etc. |
| `sell.pricing_of_new` | της τιμης καινουργιου | of new price |
| `sell.category_phone` | ΚΙΝΗΤΟ | PHONE |
| `sell.category_tablet` | TABLET | TABLET |
| `sell.category_laptop` | LAPTOP | LAPTOP |
| `sell.category_accessory` | ΑΞΕΣΟΥΑΡ | ACCESSORY |

### Profile

| Key | el | en |
|---|---|---|
| `profile.title` | ΠΡΟΦΙΛ | PROFILE |
| `profile.my_listings` | ΟΙ ΑΓΓΕΛΙΕΣ ΜΟΥ | MY LISTINGS |
| `profile.listings_count` | ΑΓΓΕΛΙΕΣ | LISTINGS |
| `profile.views_count` | ΠΡΟΒΟΛΕΣ | VIEWS |
| `profile.create_new` | ΔΗΜΙΟΥΡΓΗΣΕ ΝΕΑ ΑΓΓΕΛΙΑ | CREATE NEW LISTING |
| `profile.no_listings_yet` | Δεν εχεις ακομα αγγελιες | You have no listings yet |
| `profile.create_first` | Δημιουργησε την πρωτη σου | Create your first one |
| `profile.settings` | ΡΥΘΜΙΣΕΙΣ | SETTINGS |
| `profile.support` | ΥΠΟΣΤΗΡΙΞΗ | SUPPORT |
| `profile.legal` | ΝΟΜΙΚΑ | LEGAL |
| `profile.sign_out` | ΑΠΟΣΥΝΔΕΣΗ | SIGN OUT |
| `profile.sign_in` | ΣΥΝΔΕΣΗ | SIGN IN |
| `profile.sign_in_to_profile` | Συνδεσου στο προφιλ σου | Sign in to your profile |
| `profile.manage_listings_desc` | Διαχειρισου τις αγγελιες και τις ρυθμισεις του λογαριασμου σου | Manage your listings and account settings |
| `profile.user_fallback` | Χρηστης | User |
| `profile.language_label` | ΓΛΩΣΣΑ | LANGUAGE |

### Services / Stores / Appointments

| Key | el | en |
|---|---|---|
| `service.title` | ΥΠΗΡΕΣΙΕΣ | SERVICES |
| `service.grading_cta` | ΒΑΘΜΟΛΟΓΗΣΗ ΣΤΟ IREPAIR | GET GRADED AT IREPAIR |
| `service.book_appointment` | ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ | BOOK APPOINTMENT |
| `service.diagnostic_fee` | ΔΙΑΓΝΩΣΤΙΚΟ ΤΕΛΟΣ | DIAGNOSTIC FEE |
| `service.refunded_on_purchase` | Επιστρεφεται αν αγορασετε | Refunded on purchase |
| `stores.title` | ΚΑΤΑΣΤΗΜΑΤΑ | STORES |
| `stores.open_in_maps` | ΑΝΟΙΓΜΑ ΣΤΟ ΧΑΡΤΗ | OPEN IN MAPS |
| `stores.hours` | ΩΡΑΡΙΟ | HOURS |
| `stores.services` | ΥΠΗΡΕΣΙΕΣ | SERVICES |
| `stores.diagnostics` | ΔΙΑΓΝΩΣΤΙΚΑ | DIAGNOSTICS |
| `stores.repairs` | ΕΠΙΣΚΕΥΕΣ | REPAIRS |
| `stores.grading` | ΑΞΙΟΛΟΓΗΣΗ | GRADING |
| `stores.sales` | ΠΩΛΗΣΕΙΣ | SALES |
| `appointment.title` | ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ | BOOK APPOINTMENT |
| `appointment.select_date` | ΕΠΙΛΕΞΕ ΗΜΕΡΟΜΗΝΙΑ | SELECT DATE |
| `appointment.select_time` | ΕΠΙΛΕΞΕ ΩΡΑ | SELECT TIME |
| `appointment.morning` | ΠΡΩΙ | MORNING |
| `appointment.afternoon` | ΑΠΟΓΕΥΜΑ | AFTERNOON |
| `appointment.diagnostic_info` | Διαγνωστικο τελος €10 (επιστρεφεται αν αγορασεις) | Diagnostic fee €10 (refunded on purchase) |
| `appointment.confirm_booking` | ΕΠΙΒΕΒΑΙΩΣΗ ΡΑΝΤΕΒΟΥ | CONFIRM BOOKING |
| `appointment.booking_confirmed` | Το ραντεβου επιβεβαιωθηκε! | Booking confirmed! |
| `appointment.booked` | ΡΑΝΤΕΒΟΥ ΚΛΕΙΣΤΗΚΕ! | APPOINTMENT BOOKED! |
| `appointment.booked_desc` | Θα λαβετε επιβεβαιωση συντομα | You'll receive confirmation shortly |
| `appointment.booking_error` | Δοκιμαστε ξανα η χρησιμοποιηστε το online booking | Try again or use online booking |
| `appointment.grading_at_irepair` | Βαθμολογηση στο iRepair | Grading at iRepair |
| `appointment.grading_at_irepair_desc` | Ελα να βαθμολογησουμε τη συσκευη σου στο iRepair Rhodes | Get your device graded at iRepair Rhodes |
| `appointment.diagnostic_fee_title` | €10 ΔΙΑΓΝΩΣΤΙΚΟ | €10 DIAGNOSTIC FEE |
| `appointment.diagnostic_fee_refund` | Επιστρεφεται αν αγορασετε | Refunded on purchase |
| `appointment.diagnostic_fee_info` | Το διαγνωστικο τελος καλυπτει τον ελεγχο της συσκευης και την εκδοση βαθμολογιας. Επιστρεφεται πληρως εαν πουλησετε τη συσκευη μεσω Mobile Unit. | The diagnostic fee covers device inspection and grading. Fully refunded if you sell your device through Mobile Unit. |
| `appointment.booking` | ΚΡΑΤΗΣΗ... | BOOKING... |
| `appointment.book_cta` | ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ | BOOK APPOINTMENT |
| `appointment.external_booking` | Η κλεισε online στο iRepair.gr | Or book online at iRepair.gr |

### Common / actions

| Key | el | en |
|---|---|---|
| `common.loading` | ΦΟΡΤΩΣΗ... | LOADING... |
| `common.error` | ΣΦΑΛΜΑ | ERROR |
| `common.success` | ΕΠΙΤΥΧΙΑ | SUCCESS |
| `common.cancel` | ΑΚΥΡΩΣΗ | CANCEL |
| `common.confirm` | ΕΠΙΒΕΒΑΙΩΣΗ | CONFIRM |
| `common.rhodes` | ΡΟΔΟΣ | RHODES |
| `common.add` | ΠΡΟΣΘΗΚΗ | ADD |
| `common.remove` | ΑΦΑΙΡΕΣΗ | REMOVE |
| `common.back` | ΠΙΣΩ | BACK |
| `common.close` | Κλεισιμο | Close |
| `common.send` | Αποστολη | Send |
| `common.see_all` | ΔΕΣ ΟΛΑ | SEE ALL |

### Onboarding + Value props

| Key | el | en |
|---|---|---|
| `onboarding.welcome_title` | Καλως ηρθες στο Mobile Unit | Welcome to Mobile Unit |
| `onboarding.welcome_subtitle` | Επιλεγμενες αγγελιες. Ασφαλης παραλαβη. Τοπικα. | Curated listings. Safe meetups. Local. |
| `onboarding.get_started` | Ξεκινα | Get Started |
| `onboarding.have_account` | Εχω ηδη λογαριασμο | I have an account |
| `onboarding.skip` | Παραλειψη | Skip |
| `onboarding.next` | Επομενο | Next |
| `value.approved_title` | Εγκεκριμενες Αγγελιες | Approved Listings |
| `value.approved_desc` | Καθε αγγελια ελεγχεται απο την ομαδα μας | Every listing is reviewed by our team |
| `value.pickup_title` | Ασφαλης Παραλαβη | Safe Pickup |
| `value.pickup_desc` | Συναντησεις σε επιλεγμενα σημεια | Meet at designated locations |
| `value.inspection_title` | Ελεγχος & Βαθμολογηση | Inspection & Grading |
| `value.inspection_desc` | Προαιρετικος ελεγχος απο τεχνικους | Optional tech inspection |

### City Gate

| Key | el | en |
|---|---|---|
| `city.select` | Επελεξε Πολη | Select City |
| `city.select_subtitle` | Για να δεις αγγελιες κοντα σου | To see listings near you |
| `city.available_now` | Διαθεσιμο τωρα | Available now |
| `city.coming_soon` | Συντομα | Coming soon |
| `city.other` | Αλλη πολη / Εξωτερικο | Other city / Abroad |
| `city.use_location` | Χρηση τοποθεσιας μου | Use my location |

### Waitlist

| Key | el | en |
|---|---|---|
| `waitlist.join` | Μπες στη λιστα αναμονης | Join the waitlist |
| `waitlist.title` | Λιστα Αναμονης | Waitlist |
| `waitlist.subtitle` | Θα σε ειδοποιησουμε οταν ειμαστε διαθεσιμοι στην περιοχη σου | We'll notify you when we're available in your area |
| `waitlist.email_label` | EMAIL | EMAIL |
| `waitlist.interest_label` | ΕΝΔΙΑΦΕΡΟΝ | INTEREST |
| `waitlist.buyer` | Αγοραστης | Buyer |
| `waitlist.seller` | Πωλητης | Seller |
| `waitlist.both` | Και τα δυο | Both |
| `waitlist.phone_label` | ΤΗΛΕΦΩΝΟ (προαιρετικο) | PHONE (optional) |
| `waitlist.social_label` | INSTAGRAM/SOCIAL (προαιρετικο) | INSTAGRAM/SOCIAL (optional) |
| `waitlist.notes_label` | ΣΗΜΕΙΩΣΕΙΣ (προαιρετικο) | NOTES (optional) |
| `waitlist.referral_code_label` | ΚΩΔΙΚΟΣ ΠΡΟΣΚΛΗΣΗΣ (προαιρετικο) | REFERRAL CODE (optional) |
| `waitlist.consent` | Συμφωνω να λαμβανω ειδοποιησεις | I agree to receive notifications |
| `waitlist.submit` | Εγγραφη | Submit |
| `waitlist.success_title` | Εισαι στη λιστα! | You're on the list! |
| `waitlist.success_subtitle` | Θα σε ειδοποιησουμε οταν ανοιξουμε στην περιοχη σου | We'll notify you when we launch in your area |
| `waitlist.your_referral_code` | Ο κωδικος προσκλησης σου | Your referral code |
| `waitlist.share_referral` | Μοιρασου και ανεβα στη λιστα | Share to move up the list |
| `waitlist.share_button` | Κοινοποιηση | Share |
| `waitlist.copy_link` | Αντιγραφη link | Copy link |
| `waitlist.copied` | Αντιγραφηκε! | Copied! |
| `waitlist.view_demo` | Δες Demo | View Demo |
| `waitlist.referral_bonus` | +3 θεσεις για καθε φιλο | +3 positions per friend |
| `waitlist.demo_banner` | Demo Mode | Demo Mode |
| `waitlist.demo_locked_title` | Διαθεσιμο μονο στη Ροδο | Only available in Rhodes |
| `waitlist.demo_locked_subtitle` | Προς το παρον ειμαστε διαθεσιμοι μονο στη Ροδο | Currently we're only available in Rhodes |
| `waitlist.demo_locked_cta` | Μπες στη λιστα αναμονης | Join the waitlist |

### Cities + Countries

> See `04_DATA_MODEL.md` for slugs. Display strings only here.

| Key | el | en |
|---|---|---|
| `city.rhodes` | Ροδος | Rhodes |
| `city.athens` | Αθηνα | Athens |
| `city.thessaloniki` | Θεσσαλονικη | Thessaloniki |
| `city.patras` | Πατρα | Patras |
| `city.heraklion` | Ηρακλειο | Heraklion |
| `city.larissa` | Λαρισα | Larissa |
| `city.volos` | Βολος | Volos |
| `city.ioannina` | Ιωαννινα | Ioannina |
| `city.chania` | Χανια | Chania |
| `city.london` | London | London |
| `city.berlin` | Berlin | Berlin |
| `city.paris` | Paris | Paris |
| `city.amsterdam` | Amsterdam | Amsterdam |
| `city.rome` | Rome | Rome |
| `city.madrid` | Madrid | Madrid |
| `country.greece` | Ελλαδα | Greece |
| `country.uk` | United Kingdom | United Kingdom |
| `country.germany` | Germany | Germany |
| `country.france` | France | France |
| `country.netherlands` | Netherlands | Netherlands |
| `country.italy` | Italy | Italy |
| `country.spain` | Spain | Spain |
| `country.other` | Αλλη χωρα | Other country |

### Listing detail + reporting

| Key | el | en |
|---|---|---|
| `listing.not_found` | Η αγγελια δεν βρεθηκε | Listing not found |
| `listing.report_submitted` | Αναφορα υποβληθηκε | Report submitted |
| `listing.report_submitted_desc` | Ευχαριστουμε για την αναφορα. Θα εξετασουμε την αγγελια. | Thank you for the report. We'll review this listing. |
| `listing.report` | Αναφορα αγγελιας | Report listing |
| `listing.report_confirm` | Θελετε να αναφερετε αυτη την αγγελια; | Do you want to report this listing? |
| `listing.contact_seller` | ΕΠΙΚΟΙΝΩΝΙΑ ΜΕ ΠΩΛΗΤΗ | CONTACT SELLER |
| `listing.seller_label` | ΠΩΛΗΤΗΣ | SELLER |
| `listing.member_since` | Μελος απο | Member since |
| `listing.description` | ΠΕΡΙΓΡΑΦΗ | DESCRIPTION |
| `listing.condition` | ΚΑΤΑΣΤΑΣΗ | CONDITION |
| `listing.pickup_only` | ΠΑΡΑΛΑΒΗ ΜΟΝΟ | PICKUP ONLY |
| `listing.views` | προβολες | views |

### Safety

| Key | el | en |
|---|---|---|
| `safety.meetup` | ΑΣΦΑΛΗΣ ΣΥΝΑΝΤΗΣΗ | SAFE MEETUP |
| `safety.tips_title` | ΣΥΜΒΟΥΛΕΣ ΑΣΦΑΛΕΙΑΣ | SAFETY TIPS |
| `safety.tip_1` | Συναντησου παντα σε δημοσιο χωρο | Always meet in a public place |
| `safety.tip_2` | Χρησιμοποιησε τα καταστηματα iRepair για ασφαλεις συναντησεις | Use iRepair shops for safe meetups |
| `safety.tip_3` | Ελεγξε τη συσκευη πριν πληρωσεις | Inspect the device before paying |
| `safety.tip_4` | Μην πληρωνεις ποτε εκ των προτερων | Never pay upfront |
| `safety.tip_5` | Αν κατι φαινεται πολυ καλο για να ειναι αληθινο, πιθανοτατα δεν ειναι | If it seems too good to be true, it probably is |

### Auth

| Key | el | en |
|---|---|---|
| `auth.email_placeholder` | Email | Email |
| `auth.password_placeholder` | Κωδικος | Password |
| `auth.forgot_password` | Ξεχασα τον κωδικο | Forgot password |
| `auth.create_account` | Δημιουργια λογαριασμου | Create account |
| `auth.login_title` | ΣΥΝΔΕΣΗ | LOGIN |
| `auth.register_title` | ΕΓΓΡΑΦΗ | REGISTER |
| `auth.or_continue_with` | η συνεχισε με | or continue with |

### Assistant

| Key | el | en |
|---|---|---|
| `assistant.title` | Βοηθος | Assistant |
| `assistant.subtitle` | Οδηγος αγορων | Buyer's guide |
| `assistant.thinking` | Σκεφτομαι... | Thinking... |
| `assistant.type_message` | Γραψε μηνυμα... | Type a message... |
| `assistant.suggestions` | ΠΡΟΤΑΣΕΙΣ | SUGGESTIONS |
| `assistant.hi_how_can_i_help` | Γεια! Πως μπορω να βοηθησω; | Hi! How can I help you? |
| `assistant.ask_about` | Ρωτα με για τιμες, συσκευες η ασφαλεια | Ask me about pricing, devices, or safety |
| `assistant.open` | Ανοιξε τον βοηθο | Open assistant |

### Tabs + Home

| Key | el | en |
|---|---|---|
| `tab.home` | ΑΡΧΙΚΗ | HOME |
| `tab.browse` | ΑΝΑΖΗΤΗΣΗ | BROWSE |
| `tab.sell` | ΠΩΛΗΣΗ | SELL |
| `tab.profile` | ΠΡΟΦΙΛ | PROFILE |
| `home.title` | MOBILE UNIT | MOBILE UNIT |
| `home.subtitle` | Αγορασε και πουλησε συσκευες στη Ροδο | Buy and sell devices in Rhodes |
| `home.recent_listings` | ΠΡΟΣΦΑΤΕΣ ΑΓΓΕΛΙΕΣ | RECENT LISTINGS |
| `home.featured` | ΠΡΟΤΕΙΝΟΜΕΝΑ | FEATURED |
| `home.verified` | ΠΙΣΤΟΠΟΙΗΜΕΝΟ | VERIFIED |
| `home.get_repair_quote` | Ζητα προσφορα επισκευης | Get repair quote |
| `home.ask_us` | Ρωτα μας | Ask us |
| `home.buy_sell_greece` | Αγορα & Πωληση συσκευων στην Ελλαδα | Buy & Sell devices in Greece |
| `home.device_certification` | Πιστοποιηση & Διαγνωστικα συσκευων | Device certification & diagnostics |
| `home.categories` | ΚΑΤΗΓΟΡΙΕΣ | CATEGORIES |
| `home.no_featured_yet` | Δεν υπαρχουν ακομα προτεινομενα | No featured listings yet |
| `home.recent` | ΠΡΟΣΦΑΤΑ | RECENT |
| `home.all` | ΟΛΑ | ALL |
| `home.no_listings_yet` | Δεν υπαρχουν ακομα αγγελιες | No listings yet |

## Plural handling

Two source keys: `results_singular` and `results_plural`. Migrate to ICU MessageFormat under next-intl:

```json
"browse.results": "{count, plural, =0 {καμια αγγελια} one {# αποτελεσμα} other {# αποτελεσματα}}"
```

For en: `"{count, plural, =0 {no results} one {# result} other {# results}}"`. Map: in the new layout, `count` is a numeric arg.

## Number, currency, date formatting

Use `Intl.NumberFormat` and `Intl.DateTimeFormat`. The currency placeholder is `CURRENCY` (V1=`EUR`, symbol `€`, position before number for English and after number for Greek? — **source always uses `€X` prefix style**, keep that). Date format: `dd/MM/yyyy` for `el`, `MMM d, yyyy` for `en`. Member-since uses `Member since YYYY` (year only).

## Greek-specific gotchas

- **`σ` vs `ς`**: final sigma is `ς`, anywhere else `σ`. Translators sometimes break this. Lint check: regex `σ(?=[\s.,!?;:)])` should yield no matches in `el.json`.
- **No `;` for question marks** — Greek uses `;` (ano teleia) as its question mark already. Source uses `;` correctly in `assistant.hi_how_can_i_help` (`Γεια! Πως μπορω να βοηθησω;`). Do not "correct" this.
- **`σ` in UPPERCASE**: when upper-casing Greek text in the browser (`toLocaleUpperCase('el-GR')`), JS handles final sigma correctly *only* with the locale tag — bare `.toUpperCase()` will mangle it. Avoid runtime case conversion on Greek; store the strings already cased.

## Server vs client

next-intl works in both. For RSC: `import { getTranslations } from 'next-intl/server'`. For client components: `useTranslations`. Keep the message JSON files in `messages/` and load them via `next-intl/config`.

## SEO / hreflang

`generateMetadata` should emit `alternates: { languages: { el: '/el/...', en: '/en/...' } }`. Add the same to the sitemap.

## Missing strings (PARTIAL)

The source covers V1 flows. The following strings are referenced in spec but not in the source — fill before launch:

- 404 / 500 page copy
- Email transactional templates (auth, waitlist confirm, appointment confirm, listing-approved, listing-rejected)
- Admin dashboard (V2)
- Cookie consent banner (Greek GDPR — PROPOSED)
- iRepair partner copy on stores page (PARTIAL)

See `27_PARTIAL_AND_MISSING.md`.
