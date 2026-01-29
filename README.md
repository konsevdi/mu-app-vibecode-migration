# Mobile Unit

Μια marketplace εφαρμογη για αγορα και πωληση κινητων τηλεφωνων, tablets, laptops και αξεσουαρ στην Ελλαδα.

## Web App

Η εφαρμογη ειναι διαθεσιμη ως PWA (Progressive Web App):
- **Web URL**: Accessible via Vibecode preview
- **PWA Support**: Μπορεις να την "εγκαταστησεις" στην αρχικη οθονη
- **Responsive**: Λειτουργει σε ολες τις συσκευες (mobile, tablet, desktop)

## Χαρακτηριστικα

### Onboarding & City Gate
- **Welcome Screen** - Καλως ηρθες στο Mobile Unit με animated logo
- **Value Carousel** - 3 slides: Approved Listings, Safe Pickup, Inspection & Grading
- **City Gate** - Επιλογη πολης με Rhodes διαθεσιμο τωρα
- **Language Toggle** - EL/EN visible σε ολες τις onboarding οθονες (top-right)
- **Demo Mode** - Περιηγηση αγγελιων για μη-eligible πολεις (actions locked)

### AI Assistant (Οδηγος Αγορων)
- **Floating Chat Button** - Διαθεσιμος σε ολες τις οθονες
- **Buyer's Guide** - Προτασεις συσκευων αναλογα με budget
- **Pricing Help** - Βοηθεια τιμολογησης για πωλητες
- **Safety Tips** - Συμβουλες ασφαλειας
- **Bilingual** - Υποστηριζει EL/EN
- **Context-Aware** - Γνωριζει σε ποια σελιδα βρισκεσαι

### Waitlist System
- **Waitlist Signup** - Email, city, country, interest type (buyer/seller/both)
- **Referral System** - Μοναδικος κωδικος MU XXXXXX, +3 θεσεις ανα referral
- **iOS Native Share** - Share sheet με referral link
- **Deep Links** - mobileunit://waitlist?ref=REFCODE

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

### Rate Limiting
- Standard: 100 requests/minute για γενικα endpoints
- Strict: 10 requests/minute για auth και sensitive endpoints
- Per-user και per-IP tracking

### Input Sanitization
- XSS prevention με HTML escaping
- SQL injection detection
- URL validation
- Deep object sanitization

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

### Responsive Design
- **Mobile-first**: Βελτιστοποιημενο για κινητα
- **Tablet**: Προσαρμοσμενα grids (3+ columns)
- **Desktop/Web**: Centered layout με max-width 1024px
- **Dynamic scaling**: Fonts και paddings προσαρμοζονται

### Premium Animation System
Η εφαρμογη εχει Apple-level motion design με:
- **Consistent Timing**: Micro (120ms), Small (200ms), Medium (280ms), Page (360ms)
- **Premium Easing**: cubic-bezier(0.2, 0.8, 0.2, 1) για ομαλες μεταβασεις
- **Reduce Motion Support**: Σεβεται την προσβασιμοτητα iOS/Android
- **Staggered Animations**: 50ms μεταξυ στοιχειων για cascade effect
- **Haptic Feedback**: Light/Medium feedback σε ολα τα interactions
- **Skeleton Loaders**: Premium loading states

### Accessibility
- WCAG AA compliant color contrast
- accessibilityRole και accessibilityLabel σε ολα τα interactive elements
- Minimum touch target 44x44pt

### Animation Files
- `src/lib/animations.ts` - Animation utilities, timing, easing, hooks
- `src/lib/responsive.ts` - Responsive breakpoints και utilities
- `src/components/LanguageTogglePill.tsx` - Animated language toggle pill
- `src/components/AnimatedButton.tsx` - Premium animated button component
- `src/components/AssistantChat.tsx` - AI chatbot component

## Tech Stack

- **Frontend**: React Native + Expo SDK 53
- **Styling**: NativeWind (TailwindCSS) με Linear Gradients
- **Navigation**: Expo Router
- **State**: React Query + Zustand
- **Backend**: Hono + Prisma + SQLite
- **Auth**: Better Auth
- **Animations**: react-native-reanimated v3

## Δομη Εφαρμογης

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx    # Tab layout + AI Assistant
│   │   ├── index.tsx      # Αρχικη οθονη
│   │   ├── browse.tsx     # Αναζητηση αγγελιων
│   │   ├── sell.tsx       # Δημιουργια αγγελιας
│   │   └── profile.tsx    # Προφιλ χρηστη
│   ├── +html.tsx          # PWA meta tags
│   ├── onboarding.tsx     # Welcome + Carousel + City Gate
│   ├── waitlist.tsx       # Waitlist signup form
│   ├── waitlist-success.tsx # Success + referral share
│   ├── demo-browse.tsx    # Demo mode (locked actions)
│   ├── listing/[id].tsx   # Λεπτομερειες αγγελιας
│   ├── book-appointment.tsx # Κλεισε ραντεβου
│   ├── stores.tsx         # Καταστηματα + Maps
│   ├── token.tsx          # QR + rotating code
│   ├── legal.tsx          # Νομικα/Disclaimer
│   ├── support.tsx        # Υποστηριξη
│   └── login.tsx          # Συνδεση/Εγγραφη
├── components/
│   ├── AssistantChat.tsx       # AI chatbot (buyer's guide)
│   ├── LanguageToggle.tsx      # EL/EN toggle (normal + compact)
│   ├── LanguageTogglePill.tsx  # Floating pill toggle (premium)
│   ├── AnimatedButton.tsx      # Premium animated button
│   ├── SafetyTips.tsx          # Bilingual safety tips
│   └── LoginWithEmailPassword.tsx
├── lib/
│   ├── api.ts             # API client
│   ├── animations.ts      # Premium animation system
│   ├── responsive.ts      # Responsive utilities
│   ├── languageStore.ts   # i18n store (Greek ALL CAPS no accents)
│   ├── conditions.ts      # Centralized device condition data
│   ├── onboardingStore.ts # Onboarding state + city data
│   ├── constants.ts       # Pricing bands, URLs
│   └── cityStore.ts       # City selection
├── shared/
│   └── contracts.ts       # API types
└── public/
    └── manifest.json      # PWA manifest
```

## Backend

```
backend/
├── src/
│   ├── routes/
│   │   ├── assistant.ts   # AI chatbot API
│   │   ├── listings.ts    # Listings CRUD
│   │   ├── messages.ts    # Chat messages
│   │   ├── waitlist.ts    # Waitlist signup
│   │   └── users.ts       # User management
│   ├── lib/
│   │   ├── rate-limiter.ts   # Rate limiting middleware
│   │   ├── sanitize.ts       # Input sanitization
│   │   ├── fraud-scoring.ts  # Fraud detection
│   │   └── chat-moderation.ts # Chat anti-scam
│   ├── auth.ts            # Better Auth config
│   └── index.ts           # Hono app
└── prisma/
    └── schema.prisma      # Database schema
```

## API Endpoints

### Assistant
- `POST /api/assistant/chat` - Send message to AI assistant
- `GET /api/assistant/suggestions` - Get contextual suggestions

### Waitlist
- `POST /api/waitlist` - Signup for waitlist
- `GET /api/waitlist/check/:email` - Check if already on waitlist
- `GET /api/waitlist/referral/:code` - Validate referral code

### Users
- `GET /api/users/me` - Get current user info
- `PATCH /api/users/onboarding` - Update onboarding status

### Listings
- `GET /api/listings` - List all listings
- `POST /api/listings` - Create new listing
- `GET /api/listings/:id` - Get listing details
- `POST /api/listings/:id/report` - Report listing

## Σχεδιο Μελλοντικης Αναπτυξης

1. **Web Admin Dashboard** - RBAC για διαχειριση (REQUIRED)
2. **Verified Users** - 2 trust events requirement
3. **City Expansion** - Αθηνα, Θεσσαλονικη κ.λπ.
4. **Push Notifications** - Chat messages, price drops
5. **Partner Stores** - Lead fees, monthly statements
6. **OpenAI Integration** - Advanced AI assistant με real API
