# Mobile Unit

Μια marketplace εφαρμογη για αγορα και πωληση κινητων τηλεφωνων, tablets, laptops και αξεσουαρ στην Ελλαδα.

## Χαρακτηριστικα

### Για Αγοραστες
- **Περιηγηση Αγγελιων** - Αναζητηση και φιλτραρισμα συσκευων ανα κατηγορια
- **Φιλτρο Πιστοποιημενων** - Δες μονο πιστοποιημενες αγγελιες με βαθμολογηση iRepair
- **Προβολη Λεπτομερειων** - Πληρεις πληροφοριες, κατασταση, στοιχεια πωλητη
- **Συμβουλες Ασφαλειας** - Bilingual (EL/EN) tips για ασφαλεις συναλλαγες
- **Αναφορα Αγγελιων** - Report υποπτες αγγελιες

### Για Πωλητες
- **Δημιουργια Αγγελιων** - Καταχωρησε με 3-10 φωτογραφιες, οδηγος τιμων Pandas
- **Ελεγχος & Εγκριση** - Οι αγγελιες περνουν απο εγκριση πριν δημοσιευτουν
- **Διαχειριση Αγγελιων** - Δες τις ενεργες αγγελιες και προβολες
- **Πιστοποιηση** - Βαθμολογηση στο iRepair Ροδος (€10 διαγνωστικο)

### Κατηγοριες
- **ΚΙΝΗΤΑ** - Τηλεφωνα απο ολες τις μαρκες
- **TABLETS** - iPads, Android tablets και αλλα
- **LAPTOPS** - MacBooks, Windows laptops κ.λπ.
- **ΑΞΕΣΟΥΑΡ** - Θηκες, φορτιστες, ακουστικα κ.λπ.

### Βαθμολογιες Καταστασης & Τιμολογηση
| Κατασταση | Περιγραφη | % Τιμης Καινουργιου |
|-----------|-----------|---------------------|
| ΚΑΙΝΟΥΡΓΙΟ | Αχρησιμοποιητο | 85-95% |
| ΣΑΝ ΚΑΙΝΟΥΡΓΙΟ | Ελαχιστη χρηση | 75-88% |
| ΚΑΛΟ | Μικρα σημαδια χρησης | 60-75% |
| ΜΕΤΡΙΟ | Ορατη χρηση, λειτουργικο | 40-60% |
| ΑΝΤΑΛΛΑΚΤΙΚΑ | Για επισκευη μονο | 10-35% |

**Οδηγος Τιμολογησης**: [Pandas Pricing](https://pricing-v2.pandas.io/el-GR/irepair/smartphone)

## Καταστηματα (V1: ΡΟΔΟΣ)

### iRepair Rhodes (ΚΥΡΙΟ)
- Διευθυνση: Αμμοχωστου 18, 85131, Ροδος
- Ωρες: 09:00 - 21:00 (ΔΕΥΤΕΡΑ - ΣΑΒΒΑΤΟ)
- Υπηρεσιες: ΔΙΑΓΝΩΣΤΙΚΑ, ΕΠΙΣΚΕΥΕΣ, ΑΞΙΟΛΟΓΗΣΗ, ΠΩΛΗΣΕΙΣ

### iRepair Spot (Public Νεα Μαρινα)
- Διευθυνση: Αυστραλιας 84-86, 85100, Ροδος
- Ωρες: 10:00 - 22:00 (ΚΑΘΗΜΕΡΙΝΑ)
- Υπηρεσιες: ΔΙΑΓΝΩΣΤΙΚΑ, ΑΞΙΟΛΟΓΗΣΗ

## Token System

- Animated QR + rotating 6-digit code
- Ανανεωση καθε 60 δευτερολεπτα
- TTL: 72 ωρες μετα την εγκριση admin
- Online validation στο καταστημα

## Ασφαλεια & Moderation

### Anti-Scam Chat
- Αυτοματος αποκλεισμος URLs, shortlinks, off-platform patterns
- Ανιχνευση image spam (οριο: 3 εικονες/λεπτο)
- Συστημα strikes με 90-day decay

### Fraud Scoring
- Score 0-100 για χρηστες, αγγελιες, chats
- Auto-hold σε score >= 80
- Auto-hide: 2 reports για ιδιωτες, 5 για stores
- Pricing anomaly detection
- Missive drafts για επιθεωρηση

### Listing Approval Workflow
- Νεες αγγελιες status: "pending"
- Εμφανιζονται μονο μετα την εγκριση (status: "approved")
- Fraud check κατα τη δημιουργια

## Γλωσσα

### EL/EN Toggle
- Εναλλαγη γλωσσας στο Profile tab
- Ελληνικα σε ΚΕΦΑΛΑΙΑ χωρις τονους (per spec)
- Persisted με AsyncStorage

## Τοπικη Υπηρεσια

### Ραντεβου Βαθμολογησης
- Κλεισε ραντεβου in-app
- Διαγνωστικο τελος: **€10** (επιστρεφεται αν πουλησεις)
- Ωρες: Πρωι 09:00-14:00, Απογευμα 14:00-21:00
- External booking: public.irepair.gr/service-app

## Design

Η εφαρμογη διαθετει ενα **funky, neon-inspired design** με:
- **Κυριο Χρωμα**: Neon Magenta (#FF00FF)
- **Accent**: Electric Lime (#00FF88)
- **Επισημανση**: Gold (#FFD700)
- **Φοντο**: Deep Black με dark gradients

## Tech Stack

- **Frontend**: React Native + Expo SDK 53
- **Styling**: NativeWind (TailwindCSS) με Linear Gradients
- **Navigation**: Expo Router
- **State**: React Query + Zustand
- **Backend**: Hono + Prisma + SQLite
- **Auth**: Better Auth

## Δομη Εφαρμογης

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # Αρχικη οθονη (+ LAPTOPS category)
│   │   ├── browse.tsx     # Αναζητηση αγγελιων
│   │   ├── sell.tsx       # Δημιουργια αγγελιας
│   │   └── profile.tsx    # Προφιλ χρηστη
│   ├── listing/[id].tsx   # Λεπτομερειες αγγελιας
│   ├── book-appointment.tsx # Κλεισε ραντεβου
│   ├── stores.tsx         # Καταστηματα + Maps
│   ├── token.tsx          # QR + rotating code
│   ├── legal.tsx          # Νομικα/Disclaimer
│   ├── support.tsx        # Υποστηριξη
│   └── login.tsx          # Συνδεση/Εγγραφη
├── components/
│   ├── LanguageToggle.tsx # EL/EN toggle
│   ├── SafetyTips.tsx     # Bilingual safety tips
│   └── LoginWithEmailPassword.tsx
├── lib/
│   ├── api.ts             # API client
│   ├── languageStore.ts   # i18n store (Greek ALL CAPS no accents)
│   ├── constants.ts       # Pricing bands, URLs
│   └── cityStore.ts       # City selection
└── shared/
    └── contracts.ts       # API types
```

## Backend Schema

```
backend/prisma/schema.prisma

Models:
- User (fraud score, restricted mode, trust events)
- Listing (status workflow, grade, fraud score)
- Message (moderation, flags)
- Store (V1: Rhodes 2 points, multi-store ready)
- Staff (roles: super_admin, admin, store_manager, moderator)
- Inspection (grade A/B/C/D + checklist)
- Token (TTL 72h, rotation 60s, active after admin approval)
- Appointment (status workflow, diagnostic redeemed)
- AuditLog (all admin actions)
- AutoActionLog (auto-moderation history)
- GradeConfig (admin-configurable multipliers)
- ModerationConfig (thresholds, cooldowns)
```

## Σχεδιο Μελλοντικης Αναπτυξης

1. **Web Admin Dashboard** - RBAC για διαχειριση (REQUIRED)
2. **Verified Users** - 2 trust events requirement
3. **City Expansion** - Αθηνα, Θεσσαλονικη κ.λπ.
4. **Push Notifications** - Chat messages, price drops
5. **Partner Stores** - Lead fees, monthly statements
