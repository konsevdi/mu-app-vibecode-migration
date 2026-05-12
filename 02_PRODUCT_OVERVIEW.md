# 02 — Product Overview

## What is it

`APP_NAME` (V1 = **Mobile Unit**) is a **trusted secondhand marketplace** for phones, tablets, laptops, and accessories. The differentiator is **physical inspection + graded condition** by a partner workshop (`PARTNER_NAME`, V1 = **iRepair**) instead of seller-only self-attestation.

## Who it serves

Three audiences, ranked:

1. **Buyers in the eligible city** (`PRIMARY_CITY`, V1 = **Rhodes, Greece**). They get full marketplace access: browse, filter, contact seller, optionally book an inspection appointment.
2. **Sellers in the eligible city.** They list a device, optionally bring it to `PARTNER_NAME` for a grade, then deal with buyers via chat + pickup.
3. **Waitlist signups** from other Greek cities (Athens, Thessaloniki, Patras, Heraklion, Larissa, Volos, Ioannina, Chania) and European cities (London, Berlin, Paris, Amsterdam, Rome, Madrid). They get a stripped-down `/demo-browse` and a waitlist form. Their position score and referral count are tracked.

## Why it exists

Online used-phone marketplaces in Greece have a fraud and quality problem. The product hypothesis: pairing a marketplace with a physical inspection partner that grades each device A/B/C/D collapses buyer uncertainty enough to lift conversion. The first deployment is one city, one partner, then expand by toggling `cities.is_eligible=true` per location and onboarding more workshops.

## Core flows

- **Onboarding → city gate.** Three-view flow: welcome → carousel (3 slides) → city select. Rhodes shows a "BEST MATCH" card; other cities route to waitlist. Persisted in `onboarding-storage` AsyncStorage key (see `mobile/src/lib/onboardingStore.ts`).
- **Browse.** Tabs home, search, category filter (phone/tablet/laptop/accessory), `verifiedOnly` toggle. Listings come from `/api/listings?...`.
- **Listing detail.** Hero image carousel + gallery, grade chip, seller card, mailto-based contact, "Get Graded" CTA if not yet inspected, `iRepair` store cards, report button. Safe-meetup tips only when viewer's city = listing's city = Rhodes.
- **Sell.** 7-step form: category → brand → model → condition → photos (3-10) → price + title + description → preview. Pricing band guidance from `lib/conditions.ts` + `lib/constants.ts`.
- **Chat.** 1-to-1 messaging keyed by deterministic `conversation_id = [userA, userB].sort().join("_")`. No reservation, no order state — see D1.
- **AI assistant.** Floating button on tab bar opens chat overlay. Greek/English. Keyword router first, Claude Haiku 4.5 fallback for signed-in users (see D4).
- **Appointments.** Book a slot at `PARTNER_NAME` for grading. Skips Sundays, morning (09:00-14:00) or afternoon (14:00-21:00). External fallback: `https://public.irepair.gr/service-app`.
- **Waitlist.** Off-city signups capture email, city, country, interestType (BUYER / SELLER / BOTH / REPAIR), phone, social handle, notes, referral, consent.
- **Admin.** Four routes for staff (D5). Approve/reject listings, release fraud holds, export waitlist CSV.

## Tone & visual identity

- **Bilingual el/en**, default `el`. Greek tonality rule: **UPPERCASE strings have NO accents**, lowercase strings have accents (e.g. "ΑΓΟΡΑ" vs "Αγορά"). The translation tables in `mobile/src/lib/languageStore.ts` already encode this — preserve verbatim.
- **Neon-on-dark palette.** Primary accents: `#FF00FF` (magenta), `#00FF88` (green), `#00BFFF` (cyan), `#FFD700` (gold). Dark backgrounds (`#0A0A0A`, `#1A1A1A`). High-contrast for outdoor mobile readability.
- **Card-heavy, image-forward.** Listings are visual; the first photo is the cover.
- **Direct, no-cute copy.** "PICKUP ONLY" not "Local Handoff Required". "ΓΙΝΕ Ο ΠΡΩΤΟΣ ΠΩΛΗΤΗΣ" not "Be the first to list!".

## Out of scope for V1

- Reservation / payment / escrow / order lifecycle (D1).
- Shipping (D10 — pickup only, locked).
- Inspector mobile app + token QR flow (D9).
- Push notifications (post-launch; web uses email for fraud + appointment confirmations).
- Loyalty / referral rewards beyond capturing `referralCount` on `waitlist_signups`.
- Multi-partner per city. One city = one `iRepair` partner for V1.

## Success metric (V1)

Approved listings × buyer-initiated chats per week in the eligible city. Track via the events table (PROPOSED, see `04_DATA_MODEL.md`).
