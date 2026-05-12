# 17 — Design System

Mobile Unit is a **trust-first marketplace**. The visual language is minimal, high-contrast, with strong typographic rhythm. Greek UPPERCASE labels carry the brand voice — most action buttons and section headers are caps. Avoid retail-y gradients and playful illustration; lean editorial.

## Stack

- **Tailwind CSS** v3 with `@tailwindcss/typography` for long-form (legal, support).
- **shadcn/ui** for primitives (Button, Card, Dialog, Sheet, DropdownMenu, Form, Input, Label, Tabs, Toast). Install on demand: `bunx shadcn@latest add button card …`.
- **lucide-react** for icons (already used in mobile under `lucide-react-native` — same icon set).
- **framer-motion** for animation (page transitions, button feedback, list enter). The mobile source uses `react-native-reanimated`; on web, lean on CSS transitions for 90% and framer-motion only where it adds value.
- **clsx + tailwind-merge** wrapped in `cn()` (port `mobile/src/lib/cn.ts` verbatim — same API).

## Color tokens

V1 brand: black/white with one accent. Source uses no theme colors beyond Tailwind defaults; commit to a token scale now so V2 can re-skin without code changes.

```ts
// tailwind.config.ts
extend: {
  colors: {
    bg:           'hsl(0 0% 100%)',
    fg:           'hsl(0 0% 4%)',
    muted:        'hsl(0 0% 96%)',
    'muted-fg':   'hsl(0 0% 40%)',
    border:       'hsl(0 0% 90%)',
    accent:       'hsl(220 90% 50%)',   // brand blue, used for links + primary CTAs
    'accent-fg':  'hsl(0 0% 100%)',
    danger:       'hsl(0 84% 50%)',
    success:      'hsl(142 70% 38%)',
    warning:      'hsl(38 92% 50%)',
    verified:     'hsl(142 70% 38%)',   // verified badge — matches success
  },
}
```

Dark mode (PROPOSED for V1.1): same tokens negated. Add `darkMode: 'class'` and `dark:` variants.

## Typography

- **Display + UI**: `Inter` (Variable). Loaded via `next/font/google` with `subsets: ['latin', 'greek']`. Greek subset is **non-negotiable** — without it Greek glyphs render in Times.
- **Mono (optional)**: `JetBrains Mono` for code blocks in admin and debug.

```ts
// app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin', 'greek'], variable: '--font-inter' });
```

Scale (mirrors the mobile config):

| Token | px | Use |
|---|---|---|
| `text-xs` | 10 | metadata, eyebrows |
| `text-sm` | 12 | secondary copy |
| `text-base` | 14 | body |
| `text-lg` | 18 | emphasized body |
| `text-xl` | 20 | card title |
| `text-2xl` | 24 | section heading |
| `text-3xl` | 32 | page heading |
| `text-4xl` | 40 | hero / onboarding |
| `text-5xl` | 48 | hero / large stat |

Letter-spacing: UPPERCASE labels need `tracking-wider` (`0.05em`) or `tracking-widest` (`0.1em`) to avoid feeling cramped. Apply on `.label-caps` utility — never directly on body text.

```css
.label-caps { @apply uppercase tracking-wider font-semibold; }
```

## Spacing & layout

8-pt scale, Tailwind defaults. Page gutter: 16px on mobile, 24px on tablet, 32px on desktop (use `container` + `mx-auto px-4 md:px-6 lg:px-8`). Max content width 1200px for marketplace pages, 720px for legal/support.

## Radius

- `rounded-md` (6) — inputs, badges
- `rounded-lg` (8) — cards, buttons
- `rounded-2xl` (16) — listing photos, hero imagery
- `rounded-full` — avatars, pills, FABs

## Shadows

Avoid heavy drop shadows. Use a single elevation utility for hover/focus states:

```css
.elev-1 { box-shadow: 0 1px 2px hsl(0 0% 0% / 0.04), 0 1px 1px hsl(0 0% 0% / 0.06); }
.elev-2 { box-shadow: 0 4px 6px hsl(0 0% 0% / 0.05), 0 2px 4px hsl(0 0% 0% / 0.06); }
```

## Components — the canonical six

### Button

Three variants, three sizes. Mirrors `AnimatedButton.tsx` from mobile.

```tsx
<Button variant="primary" size="lg">ΔΗΜΟΣΙΕΥΣΗ ΑΓΓΕΛΙΑΣ</Button>
<Button variant="outline" size="md">ΠΙΣΩ</Button>
<Button variant="ghost" size="sm">Παραλειψη</Button>
```

Primary = `bg-fg text-bg`. Outline = `border border-fg text-fg bg-transparent`. Ghost = `text-fg hover:bg-muted`. **No gradient buttons.** Loading state shows inline spinner + caps text (e.g. `ΔΗΜΙΟΥΡΓΙΑ...`) — never a separate disabled label.

### ListingCard

The hero pattern. Each card has:

1. Square photo (aspect-square, `object-cover`, lazy-loaded with `next/image`).
2. Title — single line, truncate.
3. Price in bold + €.
4. City + condition badge in muted row.
5. Optional verified badge top-right.

```tsx
<article className="group">
  <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
    <Image src={l.images[0]} alt={l.title} fill className="object-cover transition group-hover:scale-105" />
    {l.verified && <VerifiedBadge className="absolute top-2 right-2" />}
  </div>
  <h3 className="mt-3 truncate text-base font-medium">{l.title}</h3>
  <p className="text-lg font-bold">€{l.price}</p>
  <p className="text-xs text-muted-fg uppercase tracking-wider">{l.city} · {t(`condition.${l.condition}`)}</p>
</article>
```

### VerifiedBadge

Small pill, white text on `--verified` (success green), shield-check icon from lucide. Tooltip: `ΠΙΣΤΟΠΟΙΗΜΕΝΟ` / `VERIFIED`.

### ConditionBadge

Border-only pill. Five conditions map to label colors:

| Condition | Border | Use |
|---|---|---|
| `new` | `--success` | premium |
| `like_new` | `--success` | premium |
| `good` | `--fg` | default |
| `fair` | `--warning` | caution |
| `parts` | `--danger` | low value |

### EmptyState

Centered, illustration-light (single lucide icon at 48px in muted-fg), heading caps, body muted, CTA primary. Reuse for "no listings", "no messages", "no appointments".

### SafetyTips

Carousel of 5 tips from `safety.tip_1..5`. Already a component on mobile (`SafetyTips.tsx`) — port the copy verbatim, swap layout to a vertical stack of cards on web.

## Page archetypes

1. **Marketing / waitlist** — full-bleed hero, sectional, conversion-led. Used for `/` (when locked), `/waitlist`, `/waitlist/success`.
2. **Marketplace browse** — top filter bar (sticky), 2-col grid mobile / 4-col desktop, infinite scroll.
3. **Listing detail** — image gallery (left, 60% on desktop) + sidebar (right, 40%) with title, price, condition, seller card, contact button, safety tips, store-meetup widget.
4. **Form** — single column, max-w-md, labels above inputs, primary CTA full-width.
5. **Admin / dashboard** (V2) — sidebar + table layout. Out of scope V1.

## Responsive behavior

- **Mobile-first.** Design for 360px width, scale up.
- Grid for browse: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` with `gap-3 md:gap-4`.
- Sticky filter bar on mobile becomes inline on desktop.
- Forms: stack everywhere. Don't try to two-column forms on desktop — confuses Greek users coming from mobile.

## Motion

Three motion tokens:

| Token | Duration | Easing | Use |
|---|---|---|---|
| `fast` | 120ms | `ease-out` | button press, badge appear |
| `base` | 240ms | `cubic-bezier(0.2, 0, 0, 1)` | card hover, dropdown |
| `page` | 360ms | `cubic-bezier(0.2, 0, 0, 1)` | route transition, modal |

No bouncy springs. The brand is editorial, not playful.

## Accessibility

- Tap targets ≥ 44px on mobile.
- All interactive elements receive a visible `:focus-visible` ring (`ring-2 ring-accent ring-offset-2`).
- Color is never the only state signal — pair with icon or text.
- Greek and English page titles set `<html lang="el">` or `lang="en"` correctly per route segment (next-intl handles this).
- Form errors associate with `aria-describedby`. Use shadcn `Form` + zod resolver to get this for free.

## Image strategy

- All marketplace photos served via `next/image` with Supabase Storage as the loader (custom loader function — see `19_SUPABASE_SETUP.md`).
- Listing photos: minimum 3, maximum 10 (enforced in upload form per zod). Each ≤ 5MB, JPEG/PNG/WebP.
- Generate `placeholder="blur"` from Supabase transform `?width=20&quality=20` returned at upload time and stored alongside the URL.

## Empty / skeleton states

- Use a single `Skeleton` primitive (shadcn) for loading. No spinners on layouts that contain lists.
- Empty state for browse: copy from `browse.no_listings` + `browse.try_different_filters`, with a CTA back to all categories.

## Iconography

`lucide-react` only. Avoid mixing icon libraries. Common picks:

- `Search` — search bar
- `ShieldCheck` — verified
- `MapPin` — city / store
- `Calendar` — appointment
- `MessageCircle` — chat / contact seller
- `Camera` — upload photos
- `Languages` — language toggle
- `Sparkles` — assistant

## Don'ts

- No purple-to-pink gradients. No Material Design ripples. No Bootstrap navbars.
- No `text-gray-500` everywhere — use `text-muted-fg` token.
- No inline `style={{ color: '#…' }}` — Tailwind tokens only.
- No emoji in UI. The mobile source has zero emoji; keep it that way.
- No serif fonts. No display fonts (Space Grotesk, etc.) — these are overused in 2026 SaaS and the brand is intentionally neutral.

## Light vs dark

V1 ships **light only**. Dark mode is PROPOSED for V1.1 — token system is already named to support it (`bg`/`fg` not `white`/`black`).

## Design tokens file

`lib/design-tokens.ts`:

```ts
export const tokens = {
  radii: { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
  motion: {
    fast:  { duration: 120, easing: 'ease-out' },
    base:  { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    page:  { duration: 360, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
  shadows: {
    e1: '0 1px 2px hsl(0 0% 0% / 0.04), 0 1px 1px hsl(0 0% 0% / 0.06)',
    e2: '0 4px 6px hsl(0 0% 0% / 0.05), 0 2px 4px hsl(0 0% 0% / 0.06)',
  },
} as const;
```

Re-export from a single module so Storybook / docs can introspect.
