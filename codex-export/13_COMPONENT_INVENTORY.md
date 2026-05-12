# 13 — Component Inventory

Every component in `mobile/src/components/` and their web replacement.

## Mobile components (source)

| File | Lines | Role | Web replacement |
|---|---|---|---|
| `AnimatedButton.tsx` | ~50 | Pressable with reanimated scale-on-press | shadcn `<Button>` + Tailwind active state |
| `LanguageToggle.tsx` | ~80 | Toggle between el/en | Custom `<LanguageToggle>` using cookie + `profiles.language_pref` |
| `LanguageTogglePill.tsx` | ~60 | Smaller variant | Same as above with `variant="ghost" size="sm"` |
| `SafetyTips.tsx` | ~120 | List of 5 safety tips with icons | Server component reading `messages.safety_tip_*` |
| `Themed.tsx` | ~40 | Themed Text/View wrappers | DELETE — use Tailwind directly |
| `AssistantChat.tsx` | ~280 | Chat UI for the assistant route | Port — server-side stream from Claude haiku |
| `ComponentWithDataFetchingExample.tsx` | — | Boilerplate | DELETE |
| `LoginButton.tsx` | ~30 | Generic auth button | DELETE — use shadcn `<Button>` |
| `LoginWithEmailPassword.tsx` | ~120 | Email/password form | Port — shadcn `<Form>` + `signInWithPassword` |

## Components to ADD (web-only)

| Component | Purpose |
|---|---|
| `<ListingCard variant="grid|list|hero">` | Listing display in three contexts |
| `<GradeBadge grade>` | A/B/C/D badge with localized label |
| `<VerifiedBadge label="iRepair">` | Trust mark on verified listings |
| `<Price value currency="EUR">` | Localized price (€480) |
| `<ImageDropzone min=3 max=10>` | Drag/drop/paste/click upload, thumbnail reorder, EXIF-strip preview |
| `<TokenDisplay tokenId>` | 6-digit code + ring countdown + Realtime subscribe |
| `<FilterBar>` | Browse filter rail (category, condition, verified, grade, price, city) |
| `<ListingStatusPill status>` | pending/approved/sold/removed/draft + held |
| `<StrikeIndicator count>` | Show active strike count on user (admin views only) |
| `<FraudHoldBadge>` | Shown on a held entity row in admin queues |
| `<EmptyState icon copyKey>` | Reusable empty state |
| `<ConfirmDialog>` | Destructive action confirmation with typed-input gate (used by delete account, remove listing) |
| `<MessageBubble>` | Chat bubble — own vs other, system flagged note |
| `<ConversationListItem>` | Sidebar entry for messages page |
| `<AssistantStream>` | Server-action-driven streaming chat reply (replaces mocked switch) |
| `<RealtimeStatus>` | Tiny indicator showing "live" when a Supabase channel is connected — useful on token/messages screens |
| `<AdminTable>` | Generic data-table built on `@tanstack/react-table` + shadcn |

## Component conventions

- **All components are TypeScript strict.** No `any`.
- **Server vs client** — default to RSC. Mark with `'use client'` only for components that use hooks (`useState`, `useEffect`, react-query, etc.) or browser-only APIs.
- **Props typed via `type Props = {...}`**, not interfaces, for stylistic consistency with shadcn.
- **Class merging via `cn(...)`** from `lib/utils.ts` (shadcn convention).
- **Localized strings come from `useTranslations()` or `getTranslations()`**, not inline.
- **No `<img>`** — use `next/image` for static, signed-URL pattern for storage images.
- **Forms** — react-hook-form + zod resolver. Schema shared with backend via `lib/contracts.ts`.

## Reused logic

### `isUserVerified` (port verbatim)

`mobile/src/lib/verification.ts`:

```ts
export function isUserVerified(trustEventCount: number): boolean {
  return trustEventCount >= 2;
}

export const gradeLabels = {
  A: 'ΑΡΙΣΤΗ',
  B: 'ΚΑΛΗ',
  C: 'ΜΕΤΡΙΑ',
  D: 'ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ',
} as const;
```

Move to `lib/verification.ts` in the web app. Provide English equivalents via i18n.

### `calculateSuggestedPrice`

`mobile/src/lib/conditions.ts`. Used by the pricing-guide modal. Port verbatim. Reads `PRICING_BANDS` from `lib/contracts.ts`.

### `normalizeConditionKey`

Maps Greek aliases ("σαν καινουργιο" → "like_new"). Port verbatim for search filter behaviour.

## Storybook scope

Stand up Storybook 8 with the following stories:

- All shadcn primitives in use
- `ListingCard` × 3 variants × 4 grades × 5 conditions × store/private
- `GradeBadge` × 4 grades × 2 locales
- `EmptyState` × all listed empty contexts
- `TokenDisplay` static + animated mock
- `FilterBar` open + filtered + reset
- `ImageDropzone` empty + populated + over-limit
- `MessageBubble` self/other + flagged + reported

Story files live next to components as `Component.stories.tsx`. CI runs `chromatic` on PRs for visual regression.

## Icon set

Source uses `lucide-react-native`. Replace with `lucide-react` (same icon set, web variant) — names identical, no remapping needed.

## RN-specific to DELETE

| Source | Reason |
|---|---|
| `expo-router` | Replaced by Next.js App Router |
| `expo-secure-store` | Replaced by Supabase Auth cookie session |
| `expo-image` | Replaced by `next/image` |
| `expo-image-picker` | Replaced by browser File input + `<ImageDropzone>` |
| `expo-haptics` | DROP — no analog on web |
| `@react-native-async-storage/async-storage` | Replaced by cookies + Supabase user metadata |
| `react-native-reanimated`, `react-native-gesture-handler` | Replaced by Framer Motion (or Tailwind transitions for simple cases) |
| `nativewind` | Replaced by plain Tailwind |
| `react-native-safe-area-context` | Web has no notch concerns; DROP |
| `@expo/vector-icons` | DROP |
| Theming via `Themed.tsx` | DROP — Tailwind directly |
