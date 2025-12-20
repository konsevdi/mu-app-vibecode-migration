# Mobile Unit

A marketplace app for buying and selling mobile phones, tablets, and accessories in Greece.

## Features

### For Buyers
- **Browse Listings** - Search and filter devices by category (phones, tablets, accessories)
- **View Details** - See full device information, condition, seller details
- **Contact Sellers** - Reach out directly via email

### For Sellers
- **Create Listings** - List your devices with photos, descriptions, and pricing
- **Manage Listings** - View your active listings and track views
- **Get Verified** - Visit iRepair Rhodes for device diagnostics

### Categories
- **Phones** - Mobile phones from all brands
- **Tablets** - iPads, Android tablets, and more
- **Accessories** - Cases, chargers, headphones, etc.

### Condition Grades
- **New** - Brand new, unused
- **Like New** - Barely used, perfect condition
- **Good** - Minor signs of wear
- **Fair** - Visible wear, fully functional

## Local Service

**iRepair Rhodes** - Our partner location in Rhodes, Greece for device verification and diagnostics. Get your device certified before selling to build buyer trust.

## Tech Stack

- **Frontend**: React Native + Expo SDK 53
- **Styling**: NativeWind (TailwindCSS)
- **Navigation**: Expo Router
- **State**: React Query + Zustand
- **Backend**: Hono + Prisma + SQLite
- **Auth**: Better Auth

## App Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # Home screen
│   │   ├── browse.tsx     # Browse/search listings
│   │   ├── sell.tsx       # Create listing
│   │   └── profile.tsx    # User profile
│   ├── listing/
│   │   └── [id].tsx       # Listing detail
│   └── login.tsx          # Authentication
├── components/
│   └── LoginWithEmailPassword.tsx
├── lib/
│   ├── api.ts             # API client
│   └── authClient.ts      # Auth client
└── shared/
    └── contracts.ts       # API types
```

## Monetization Plan (Future Growth)

1. **Featured Listings** - Pay to boost visibility
2. **Premium Sellers** - More listings, analytics dashboard
3. **Transaction Fees** - Small percentage on completed sales
4. **Verified Badges** - Trust certification via iRepair diagnostics
5. **In-app Booking** - Schedule diagnostic appointments

## Colors

- **Primary**: Deep navy (#0F172A)
- **Accent**: Electric teal (#06B6D4)
- **CTA**: Coral (#F97316)
- **Background**: Slate (#1E293B)
