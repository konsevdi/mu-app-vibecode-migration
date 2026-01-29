# Mobile Unit - Redesign & Publication Plan

## Overview
This plan addresses font sizing, Greek tonality (accents), and prepares the app for web publication.

---

## PHASE 1: FONT SIZE STANDARDIZATION

### Current Issues
- Inconsistent font sizes across files (10px to 80px Tailwind + arbitrary inline values like 28px, 36px)
- Mixed styling approaches (Tailwind classes + inline StyleSheet)
- No responsive scaling for different devices

### Solution: Standardized Type Scale

```
Display:    40px (text-4xl)  - App name, major headlines
H1:         32px (text-3xl)  - Page titles, section headers
H2:         24px (text-2xl)  - Card titles, prices
H3:         20px (text-xl)   - Subtitles, emphasized text
Body:       14px (text-base) - Primary content
Small:      12px (text-sm)   - Secondary text, labels
XS:         10px (text-xs)   - Badges, metadata
```

### Files to Update
1. src/app/(tabs)/index.tsx - Use text-4xl for "Mobile Unit", text-2xl for section titles
2. src/app/(tabs)/browse.tsx - Use text-3xl for headers, text-base for content
3. src/app/(tabs)/sell.tsx - Standardize form labels to text-sm
4. src/app/(tabs)/profile.tsx - Consistent header sizing
5. src/app/listing/[id].tsx - Price text-3xl, title text-2xl
6. src/app/onboarding.tsx - Replace inline fontSize with Tailwind
7. src/app/waitlist.tsx - Replace inline fontSize with Tailwind
8. src/app/waitlist-success.tsx - Replace inline fontSize with Tailwind
9. src/components/AssistantChat.tsx - Standardize to Tailwind classes

---

## PHASE 2: GREEK TONALITY (ACCENTS)

### Rule
- **UPPERCASE Greek text**: NO ACCENTS (τόνοι)
  - ✓ ΚΑΛΟ, ΜΕΤΡΙΟ, ΑΓΟΡΑ
  - ✗ ΚΑΛΌ, ΜΈΤΡΙΟ, ΑΓΟΡΆ

- **lowercase Greek text**: WITH ACCENTS
  - ✓ Καλώς ήρθες, Αναζήτηση
  - ✗ Καλως ηρθες, Αναζητηση

### Files Requiring Tonality Fixes

#### A. Already Correct (in languageStore.ts)
The translation store correctly follows the pattern:
- `browse_title: "ΑΓΟΡΑ"` (uppercase, no accent)
- `browse_subtitle: "Ανακάλυψε συσκευές κοντά σου"` (lowercase, with accents)

#### B. Hardcoded Strings to Fix

1. **src/app/listing/[id].tsx**
   - Line 42-46: conditionLabels - lowercase with accents ✓
   - Line 136: Alert title "Αναφορά Υποβλήθηκε" - lowercase ✓
   - Line 170: "Η αγγελία δεν βρέθηκε" - lowercase ✓

2. **src/app/(tabs)/index.tsx**
   - Line 48-51: conditionLabels duplicated - consolidate

3. **src/app/(tabs)/browse.tsx**
   - Line 46-49: conditionLabels duplicated - consolidate

4. **src/app/(tabs)/sell.tsx**
   - Line 46-50: conditionLabels duplicated - consolidate
   - Multiple hardcoded labels need translation keys

5. **src/app/demo-browse.tsx**
   - Line 100-103: conditionLabels duplicated - consolidate

6. **src/app/book-appointment.tsx**
   - Multiple hardcoded Greek strings

7. **src/components/SafetyTips.tsx**
   - Hardcoded safety tips

8. **src/app/stores.tsx**
   - Store names and descriptions

### Action Items
1. Create centralized conditionLabels in a shared file
2. Add missing translation keys to languageStore.ts
3. Replace all hardcoded strings with translation calls
4. Verify uppercase text has no accents
5. Verify lowercase text has correct accents

---

## PHASE 3: TRANSLATION CONSOLIDATION

### Current State
- 111 keys in languageStore.ts
- ~296 hardcoded strings across 24 files

### New Translation Keys Needed

```typescript
// Add to languageStore.ts

// Listing Detail
listing_not_found: "Η αγγελία δεν βρέθηκε" / "Listing not found",
report_submitted: "Αναφορά υποβλήθηκε" / "Report submitted",
report_submitted_desc: "Ευχαριστούμε για την αναφορά. Θα εξετάσουμε την αγγελία." / "Thank you. We'll review this listing.",
report_listing: "Αναφορά αγγελίας" / "Report listing",
report_confirm: "Θέλετε να αναφέρετε αυτή την αγγελία;" / "Report this listing?",
contact_seller: "ΕΠΙΚΟΙΝΩΝΙΑ ΜΕ ΠΩΛΗΤΗ" / "CONTACT SELLER",
back: "ΠΙΣΩ" / "BACK",
seller_label: "ΠΩΛΗΤΗΣ" / "SELLER",
member_since: "Μέλος από" / "Member since",
description: "ΠΕΡΙΓΡΑΦΗ" / "DESCRIPTION",
condition: "ΚΑΤΑΣΤΑΣΗ" / "CONDITION",
pickup_only: "ΠΑΡΑΛΑΒΗ ΜΟΝΟ" / "PICKUP ONLY",
views: "προβολές" / "views",

// Conditions with descriptions
condition_new_desc: "Αχρησιμοποίητο, στην αρχική συσκευασία" / "Unused, in original packaging",
condition_like_new_desc: "Ελάχιστη χρήση, άριστη κατάσταση" / "Minimal use, excellent condition",
condition_good_desc: "Μικρά σημάδια χρήσης" / "Minor signs of use",
condition_fair_desc: "Φανερή χρήση, πλήρως λειτουργικό" / "Visible use, fully functional",
condition_parts_desc: "Για ανταλλακτικά μόνο" / "For parts only",

// Book Appointment
book_appointment_title: "ΚΛΕΙΣΕ ΡΑΝΤΕΒΟΥ" / "BOOK APPOINTMENT",
select_time: "ΕΠΙΛΕΞΕ ΩΡΑ" / "SELECT TIME",
morning: "ΠΡΩΙ" / "MORNING",
afternoon: "ΑΠΟΓΕΥΜΑ" / "AFTERNOON",
diagnostic_info: "Διαγνωστικό τέλος €10 (επιστρέφεται αν αγοράσεις)" / "Diagnostic fee €10 (refunded on purchase)",

// Stores
stores_title: "ΚΑΤΑΣΤΗΜΑΤΑ" / "STORES",
open_in_maps: "ΑΝΟΙΓΜΑ ΣΤΟ ΧΑΡΤΗ" / "OPEN IN MAPS",
store_hours: "ΩΡΑΡΙΟ" / "HOURS",

// Safety
safe_meetup: "ΑΣΦΑΛΗΣ ΣΥΝΑΝΤΗΣΗ" / "SAFE MEETUP",
safety_tips_title: "ΣΥΜΒΟΥΛΕΣ ΑΣΦΑΛΕΙΑΣ" / "SAFETY TIPS",

// Auth
email_placeholder: "Email" / "Email",
password_placeholder: "Κωδικός" / "Password",
forgot_password: "Ξέχασα τον κωδικό" / "Forgot password",
create_account: "Δημιουργία λογαριασμού" / "Create account",

// Assistant
assistant_title: "Βοηθός" / "Assistant",
assistant_subtitle: "Οδηγός αγορών" / "Buyer's guide",
thinking: "Σκέφτομαι..." / "Thinking...",
type_message: "Γράψε μήνυμα..." / "Type a message...",
suggestions: "ΠΡΟΤΑΣΕΙΣ" / "SUGGESTIONS",
```

---

## PHASE 4: WEB APP PREPARATION

### Already Done
- PWA manifest at public/manifest.json
- PWA meta tags in src/app/+html.tsx
- Responsive utilities in src/lib/responsive.ts

### Still Needed

1. **Test Web Build**
   ```bash
   bun run web
   ```

2. **Verify PWA Assets**
   - Need icon files: icon-192x192.png, icon-512x512.png, apple-touch-icon.png
   - Need favicon files: favicon.ico, favicon-16x16.png, favicon-32x32.png
   - Need og-image.png for social sharing

3. **Test Install Flow**
   - Open in Safari/Chrome
   - Test "Add to Home Screen"
   - Verify standalone mode works

4. **Cross-Browser Testing**
   - Safari (iOS/macOS)
   - Chrome (Android/Desktop)
   - Firefox

---

## PHASE 5: IMPLEMENTATION ORDER

### Step 1: Create Shared Constants (Priority: HIGH)
Create src/lib/conditions.ts with centralized condition data

### Step 2: Expand Translations (Priority: HIGH)
Add ~50 new keys to languageStore.ts

### Step 3: Fix Font Sizes (Priority: MEDIUM)
Update all screens to use standardized Tailwind classes

### Step 4: Replace Hardcoded Strings (Priority: HIGH)
Update all 24 files to use translation system

### Step 5: Verify Tonality (Priority: HIGH)
Audit all Greek text for correct accent usage

### Step 6: Create PWA Assets (Priority: MEDIUM)
Generate icon files for web installation

### Step 7: Test Web Build (Priority: HIGH)
Verify app works in browser and can be installed

---

## Files to Modify

| File | Changes |
|------|---------|
| src/lib/languageStore.ts | Add ~50 new translation keys |
| src/lib/conditions.ts | NEW: Centralized condition data |
| src/app/(tabs)/index.tsx | Use translations, fix font sizes |
| src/app/(tabs)/browse.tsx | Use translations, fix font sizes |
| src/app/(tabs)/sell.tsx | Use translations, fix font sizes |
| src/app/(tabs)/profile.tsx | Use translations |
| src/app/listing/[id].tsx | Use translations, fix font sizes |
| src/app/book-appointment.tsx | Use translations |
| src/app/stores.tsx | Use translations |
| src/app/onboarding.tsx | Fix inline font sizes |
| src/app/waitlist.tsx | Fix inline font sizes |
| src/app/waitlist-success.tsx | Fix inline font sizes |
| src/app/demo-browse.tsx | Use centralized conditions |
| src/components/AssistantChat.tsx | Use translations |
| src/components/SafetyTips.tsx | Use translations |
| src/components/LoginWithEmailPassword.tsx | Use translations |
| public/ | Add PWA icon assets |

---

## Success Criteria

1. ✓ All font sizes follow the standardized type scale
2. ✓ No hardcoded Greek strings in component files
3. ✓ All uppercase Greek text has NO accents
4. ✓ All lowercase Greek text has CORRECT accents
5. ✓ Language toggle switches ALL text (not just some)
6. ✓ Web app can be installed as PWA
7. ✓ App renders correctly on mobile, tablet, and desktop
8. ✓ No TypeScript errors
9. ✓ No console warnings
