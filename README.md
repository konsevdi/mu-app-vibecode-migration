# Mobile Unit

Μια marketplace εφαρμογή για αγορά και πώληση κινητών τηλεφώνων, tablets, laptops και αξεσουάρ στην Ελλάδα.

## Χαρακτηριστικά

### Για Αγοραστές
- **Περιήγηση Αγγελιών** - Αναζήτηση και φιλτράρισμα συσκευών ανά κατηγορία
- **Φίλτρο Πιστοποιημένων** - Δες μόνο πιστοποιημένες αγγελίες με βαθμολόγηση iRepair
- **Προβολή Λεπτομερειών** - Πλήρεις πληροφορίες, κατάσταση, στοιχεία πωλητή
- **Συμβουλές Ασφαλείας** - Bilingual (EL/EN) tips για ασφαλείς συναλλαγές
- **Αναφορά Αγγελιών** - Report ύποπτες αγγελίες

### Για Πωλητές
- **Δημιουργία Αγγελιών** - Καταχώρησε με 3-10 φωτογραφίες, οδηγός τιμών Pandas
- **Έλεγχος & Έγκριση** - Οι αγγελίες περνούν από έγκριση πριν δημοσιευτούν
- **Διαχείριση Αγγελιών** - Δες τις ενεργές αγγελίες και προβολές
- **Πιστοποίηση** - Βαθμολόγηση στο iRepair Ρόδος (€10 διαγνωστικό)

### Κατηγορίες
- **Κινητά** - Τηλέφωνα από όλες τις μάρκες
- **Tablets** - iPads, Android tablets και άλλα
- **Laptops** - MacBooks, Windows laptops κ.λπ.
- **Αξεσουάρ** - Θήκες, φορτιστές, ακουστικά κ.λπ.

### Βαθμολογίες Κατάστασης & Τιμολόγηση
| Κατάσταση | Περιγραφή | % Τιμής Καινούργιου |
|-----------|-----------|---------------------|
| Καινούργιο | Αχρησιμοποίητο | 85-95% |
| Σαν Καινούργιο | Ελάχιστη χρήση | 75-88% |
| Καλό | Μικρά σημάδια χρήσης | 60-75% |
| Μέτριο | Ορατή χρήση, λειτουργικό | 40-60% |
| Ανταλλακτικά | Για επισκευή μόνο | 10-35% |

**Οδηγός Τιμολόγησης**: [Pandas Pricing](https://pricing-v2.pandas.io/el-GR/irepair/smartphone)

## Ασφάλεια & Moderation

### Anti-Scam Chat
- Αυτόματος αποκλεισμός URLs, shortlinks, off-platform patterns (WhatsApp/Telegram)
- Ανίχνευση image spam (όριο: 3 εικόνες/λεπτό)
- Σύστημα strikes με 90-day decay

### Fraud Scoring
- Score 0-100 για χρήστες, αγγελίες, chats
- Auto-hold σε score >= 80
- Auto-hide: 2 reports για ιδιώτες, 5 για stores
- Pricing anomaly detection
- Missive drafts για επιθεώρηση

### Listing Approval Workflow
- Νέες αγγελίες status: "pending"
- Εμφανίζονται μόνο μετά την έγκριση (status: "approved")
- Fraud check κατά τη δημιουργία

## Γλώσσα

### EL/EN Toggle
- Εναλλαγή γλώσσας στο Profile tab
- Ελληνικά σε ΚΕΦΑΛΑΙΑ χωρίς τόνους
- Persisted με AsyncStorage

## Τοπική Υπηρεσία

**iRepair Ρόδος** - Συνεργάτης για πιστοποίηση και διαγνωστικά συσκευών.

### Ραντεβού Βαθμολόγησης
- Κλείσε ραντεβού in-app
- Διαγνωστικό τέλος: **€10** (επιστρέφεται αν πουλήσεις)
- Ώρες: Πρωί 09:00-14:00, Απόγευμα 14:00-21:00
- External booking: public.irepair.gr/service-app

### Πόλη & Ασφαλής Συνάντηση
- Κάθε αγγελία απαιτεί επιλογή πόλης (V1: μόνο Ρόδος)
- Safe meeting point: **iRepair Ρόδος - Αμμοχώστου 18**

## Legal & Support

- **Νομικά/Legal**: Αποποίηση ευθύνης, χωρίς εγγύηση Vibecode
- **Υποστήριξη/Support**: Email, Τηλέφωνο, Διεύθυνση

## Design

Η εφαρμογή διαθέτει ένα **funky, neon-inspired design** με:
- **Κύριο Χρώμα**: Neon Magenta (#FF00FF)
- **Accent**: Electric Lime (#00FF88)
- **Επισήμανση**: Gold (#FFD700)
- **Φόντο**: Deep Black με dark gradients
- **Στυλ**: Bold typography, glowing borders, neon accents

## Tech Stack

- **Frontend**: React Native + Expo SDK 53
- **Styling**: NativeWind (TailwindCSS) με Linear Gradients
- **Navigation**: Expo Router
- **State**: React Query + Zustand
- **Backend**: Hono + Prisma + SQLite
- **Auth**: Better Auth

## Δομή Εφαρμογής

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # Αρχική οθόνη
│   │   ├── browse.tsx     # Αναζήτηση αγγελιών
│   │   ├── sell.tsx       # Δημιουργία αγγελίας
│   │   └── profile.tsx    # Προφίλ χρήστη
│   ├── listing/
│   │   └── [id].tsx       # Λεπτομέρειες αγγελίας
│   ├── book-appointment.tsx # Κλείσε ραντεβού
│   ├── legal.tsx          # Νομικά/Disclaimer
│   ├── support.tsx        # Υποστήριξη
│   └── login.tsx          # Σύνδεση/Εγγραφή
├── components/
│   ├── LanguageToggle.tsx # EL/EN toggle
│   ├── SafetyTips.tsx     # Bilingual safety tips
│   └── LoginWithEmailPassword.tsx
├── lib/
│   ├── api.ts             # API client
│   ├── authClient.ts      # Auth client
│   ├── languageStore.ts   # i18n store
│   └── cityStore.ts       # City selection
└── shared/
    └── contracts.ts       # API types, pricing bands
```

## Backend Routes

```
backend/src/routes/
├── listings.ts     # CRUD + report + fraud check
├── appointments.ts # Booking ραντεβού
└── messages.ts     # Chat με anti-scam
```

## Σχέδιο Μελλοντικής Ανάπτυξης

1. **Web Admin Dashboard** - RBAC για διαχείριση
2. **Token System** - Animated QR + rotating 6-digit
3. **Verified Users** - 2 trust events requirement
4. **City Expansion** - Αθήνα, Θεσσαλονίκη κ.λπ.
5. **Push Notifications** - Chat messages, price drops
