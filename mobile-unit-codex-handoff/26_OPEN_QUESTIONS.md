# 26 — Open Questions

Decisions that need a product owner before or shortly after the rebuild kicks off. Each item lists a recommendation, but the call belongs to the founders / iRepair team.

## A. Brand + naming

**A1. Final consumer brand: `Mobile Unit` or something else?**
Source uses "Mobile Unit" everywhere — Greek string `MOBILE UNIT`, Greek subtitle `Αγορασε και πουλησε συσκευες στη Ροδο`. If the brand changes, the `APP_NAME` placeholder + 4–5 `home.*` translations + email templates need a sweep.
*Recommendation*: keep "Mobile Unit" — it's neutral, English-readable, and the iRepair partnership is sub-branded.

**A2. Domain.**
`APP_DOMAIN=mobile-unit.example` is a placeholder. Greek operators expect `.gr`; international audiences are happier with `.com`/`.io`. Buy both, redirect.
*Recommendation*: `mobileunit.gr` primary, `mobileunit.app` alias. Decide before email-domain SPF/DKIM setup.

## B. Geography + rollout

**B1. Second city after Rhodes — Athens or Crete (Heraklion)?**
Athens is the largest pool; Crete is closer to existing iRepair operational reach. The waitlist data we collect will answer this, but a tentative target affects featured-listing seeding.
*Recommendation*: wait 6 weeks post-launch, then decide on waitlist + referral density per city.

**B2. International (`London`, `Berlin`, etc.) — keep as visible "Coming soon"?**
Source shows them. They're aspirational right now and might confuse Greek-only users.
*Recommendation*: keep in `cities` table but only render in the city-gate when language is `en` or user explicitly toggles "Show abroad". Saves clutter in the default Greek flow.

## C. Auth + onboarding

**C1. 2FA: optional or required for staff?**
Source has no MFA. Supabase MFA is GA.
*Recommendation*: required for staff (any user with non-`user` role), optional for users V1, prompted in V1.1.

**C2. Apple sign-in: launch with it, or add post-launch?**
Source includes nothing for OAuth. iOS users expect it.
*Recommendation*: include in V1 — it's 30 minutes of Supabase config plus a button. Reduces signup friction significantly for the iPhone-heavy Greek demographic.

**C3. Phone number — required, optional, never?**
Greeks heavily use phone for IRL meetups, but storing PII expands GDPR scope.
*Recommendation*: optional on profile, required on listings (the seller phone replaces in-app chat at the safe-meetup step). Mask in chat UI (`+30 6** *** 4321`); reveal only after the buyer confirms intent.

## D. Commerce + monetization

**D1. Free V1, monetize V2 — what's the V2 model?**
Options: featured-listing fee, verified-badge fee, transaction fee, iRepair grading fee revshare.
*Recommendation*: out of scope V1, but bake commerce primitives (Stripe Connect, signed-receipt issuance) into the listing-create flow as no-op stubs so V2 doesn't require schema churn.

**D2. iRepair diagnostic fee — €10, who collects?**
Source says €10, refunded on purchase. Today the user pays iRepair in-store. The app doesn't process payments. Keep that?
*Recommendation*: V1 yes, no payment processing — the appointment flow is "book, walk in, pay there". V2 collect in-app.

**D3. Featured listing — paid or curated?**
Source has `is_featured` flag but no charging mechanism. Currently admin-curated for V1.
*Recommendation*: admin-curated through V1. Audit who toggles it (the audit log helps).

## E. AI assistant

**E1. Assistant scope — buyer-only guide, or also a seller helper?**
Source positions it as `Οδηγος αγορων` (Buyer's guide). Sellers could also use price-suggestion / listing-improvement help.
*Recommendation*: V1 buyer-only as documented. V1.1 add seller mode triggered from the sell screen.

**E2. Greek dialect — formal `εσεις` or informal `εσυ`?**
Source uses informal (`Καλως ηρθες`, `Πως μπορω να βοηθησω`). Consistent with Instagram/marketplace tone, but some older users may prefer formal.
*Recommendation*: keep informal — Greeks 18–45 are the primary segment.

**E3. Assistant safety — refuse pricing claims it can't substantiate?**
The grounding facts include PRICING_BANDS. If a user asks "what's a fair price for iPhone 13?" without a listing context, the bands give a range.
*Recommendation*: ground all price answers in PRICING_BANDS or refuse. Document the refusal copy.

## F. Fraud + moderation

**F1. Auto-hide thresholds — current source: 2 reports private / 5 store / 24h window. Right calibration?**
Tightening reduces scams, loosens annoys users. No data yet to calibrate.
*Recommendation*: keep source defaults for V1. Surface admin dashboard tile that shows daily auto-hide counts so we can adjust.

**F2. Strike decay — 90 days. Right number?**
Source default. Some marketplaces use 180.
*Recommendation*: 90 days. Aligns with Greek small-claims windows. Revisit at 6 months.

**F3. Super Admin approval queue — Slack notification or email or admin web UI?**
Source references `missiveDraftId` suggesting Missive.
*Recommendation*: Missive if iRepair already has a license; otherwise Slack `#trust-and-safety` channel + email fallback. Build the admin web queue in V1.1 — V1 is too early.

## G. i18n + accessibility

**G1. Default locale — keep `el`?**
Source defaults to `el`. SEO benefit for the Greek site is real.
*Recommendation*: yes. Use `Accept-Language` header to override for non-Greek visitors.

**G2. UPPERCASE Greek — keep accent-stripped, or restore?**
Source enforces no accents in UPPERCASE. Some Greek typography purists prefer kept accents (especially in print). Web convention is mixed.
*Recommendation*: keep accent-stripped (the source choice). Document for translators. Adding accents later is a one-time string sweep.

**G3. RTL / Arabic / Hebrew — ever?**
Not in V1. Affects layout decisions.
*Recommendation*: build LTR-only V1. Add `dir="auto"` on `<html>` so we don't paint ourselves into a corner.

## H. Mobile (post-launch)

**H1. PWA install banner or native Expo app?**
Vibecode mobile app is being deprecated. Web is V1.
*Recommendation*: PWA banner in V1.1 (Workbox, manifest, offline browse fallback). Real Expo native app in V2 with `react-native-web` shared code path or fresh Expo Router 4 with the same lib/.

**H2. Push notifications for chat — V1 web push, or wait for native?**
Web push has limited support on iOS Safari (16.4+ only, install-to-home-screen required). Conversion-killing.
*Recommendation*: skip web push V1. Email digest for unread messages instead.

## I. Operations

**I1. Hosting region — Vercel global Edge or pinned to `fra1`?**
Greek users get sub-50ms from FRA. Global Edge gives best WV everywhere but costs more.
*Recommendation*: Edge for marketing + read paths; `fra1` for write paths (closer to Supabase eu-west-1).

**I2. Status page — public or internal?**
*Recommendation*: public minimal page at `status.APP_DOMAIN`. Builds trust; we'll be honest about incidents.

**I3. Customer support inbox — Resend + manual Gmail, or full helpdesk?**
*Recommendation*: V1 Gmail or Missive. Helpdesk (Helpscout / Plain) at 100 users/week.

## J. Legal

**J1. Terms of service + privacy policy translation — who owns?**
Source has a `legal.tsx` placeholder.
*Recommendation*: Greek lawyer drafts both in Greek; English is professional translation. Budget €1.5–3k.

**J2. Cookie consent — granular categories or simple accept/reject?**
*Recommendation*: simple "Accept analytics?" toggle V1. Granular V1.1 if analytics audit demands it.

**J3. KYC for high-value listings (€500+)?**
Greek law for marketplace operators: technically minimal duty, but EU Digital Services Act for "trader" users requires identity verification.
*Recommendation*: V1 we are not a "trader marketplace" — users are C2C. DSA compliance for V1.5 once professional sellers (iRepair-style) come on.

## K. Data + analytics

**K1. PostHog cookieless mode vs full?**
*Recommendation*: full with explicit consent — better data, GDPR-safe via consent.

**K2. Funnel definition — what's "activation"?**
Source has no analytics. Need to define for the team.
*Recommendation*: activation = user posts a listing OR responds to a message. Pick one to chart; refine over first month.

## L. Performance

**L1. ISR vs full SSR for browse?**
Browse changes constantly; ISR with `revalidate: 60` is a sweet spot for SEO + freshness.
*Recommendation*: `revalidate: 60` on browse, on-demand revalidation when a listing is approved.

**L2. CDN cache for listing detail?**
Stale-while-revalidate, 5min TTL.

## M. Compliance edge cases

**M1. User exports their data and finds another user's email referenced (e.g., a recipient_id in messages they sent). Is that exposed?**
Per GDPR right-to-access, you provide all data **about** the requester. Other users' identifiers within their data are theirs; redact opaque IDs but include conversation participant **counterparties' handles** (not emails).
*Recommendation*: build the export script with redaction defaults from day one. Avoids a rewrite later.

**M2. Greek consumer protection — return policy for digital marketplaces?**
We're a peer-to-peer facilitator, not a seller. Disclaim in TOS that we don't process the transaction.

---

## Decision log template

For every Open Question that gets resolved, append a one-liner here. Future teams will thank us.

```
A1 — 2026-MM-DD — Decided: keep "Mobile Unit" — Founders, Slack #brand
A2 — 2026-MM-DD — Decided: mobileunit.gr primary
...
```
