# 12 — UI Reference Pack

Visual language and screen inventory grounded in `mobile/src/app/*` and `mobile/src/components/*`. Web port should keep the **mental model**, not the React Native components.

## Design language

- **Mobile-first** — every screen is built for ~390px viewports. Web max content width: 1280px, mobile-feel column at 480px on listing detail / sell.
- **Greek UPPERCASE typography** — buttons, section headers, tab labels are ALL CAPS (no accents). Body copy lowercase with accents stripped per source convention.
- **Brand**: Mobile Unit. Wordmark uses uppercase Latin. Pair with iRepair partner logo on the appointment / token / store pages.
- **Color**: neutral whites + blacks with a single accent. Source uses Tailwind defaults heavily; rebuild with shadcn `slate` neutrals + a single brand color `--brand` defined in `tailwind.config.ts`. Suggested: warm orange `hsl(20 90% 55%)` for sell/grading CTAs; reserve red for destructive.
- **Typography**: Inter for Latin, Inter or Noto Sans Greek for Greek. Both supported by Google Fonts. Headings tracked +0.05em on uppercase strings.
- **Radius**: 12px default, 16px on cards, 8px on inputs. Buttons full-radius for primary, square-radius for secondary.
- **Shadows**: minimal — Tailwind `shadow-sm` on cards, `shadow-lg` on modals only.
- **Spacing**: 4 / 8 / 16 / 24 / 32 / 48 px scale. Default page padding 16 on mobile, 32 on desktop.

## Screen inventory (mobile source → web target)

| Source screen | Web route | Notes |
|---|---|---|
| `(tabs)/index.tsx` (home) | `/[locale]` | Hero, featured/recent listing grids, value props, CTA strip |
| `(tabs)/browse.tsx` | `/[locale]/browse` | Filters (category, condition, verified, grade, price range, city), grid |
| `(tabs)/sell.tsx` | `/[locale]/sell` | Multi-step form (photos → category → brand/model → condition → city → price → description) |
| `(tabs)/profile.tsx` | `/[locale]/profile` | My listings, settings entry, language toggle, sign out |
| `listing/[id].tsx` | `/[locale]/listing/[slug]` | Carousel, seller card, description, report, contact CTA |
| `book-appointment.tsx` | `/[locale]/appointments/new` | Date + slot picker, diagnostic fee callout |
| `token.tsx` | `/[locale]/appointments/[id]/token` | Big rotating 6-digit display, countdown ring, replace polling with Realtime |
| `stores.tsx` | `/[locale]/stores` | Map placeholder + 2 store cards + hours/services |
| `demo-browse.tsx` | `/[locale]/demo` | Curated demo grid + iRepair CTAs |
| `waitlist.tsx` | `/[locale]/waitlist` | Form for cities not eligible |
| `waitlist-success.tsx` | `/[locale]/waitlist/success` | Referral code + share + view-demo |
| `onboarding.tsx` | `/[locale]` first-visit overlay | Welcome → value carousel → city gate → auth-or-waitlist |
| `login.tsx` | `/[locale]/auth/login` | Email/password + (V1.1) Google/Apple OAuth |
| `legal.tsx` | `/[locale]/legal` | Terms, Privacy, Cookies, GDPR links |
| `support.tsx` | `/[locale]/support` | Contact, FAQ |
| `modal.tsx` | shared overlay primitive | shadcn Dialog |
| n/a | `/[locale]/messages` | NEW — list of conversations |
| n/a | `/[locale]/messages/[conversationId]` | NEW — replaces polling with Realtime |
| n/a | `/[locale]/admin/*` | NEW — admin and staff dashboards (see `17_ADMIN_AND_STAFF_SPEC.md`) |

## Component primitives (shadcn/ui mapping)

| Source RN primitive | shadcn/ui or custom |
|---|---|
| `Pressable` + class | `<Button>` |
| Sheet via React Native modal | `<Sheet>` (shadcn) |
| Toast via custom hook | `<Toaster>` (sonner) |
| Carousel via FlatList | `<Carousel>` (embla) |
| Filter row with horizontal scroll | `<ToggleGroup>` |
| Form fields | `<Form>`, `<Input>`, `<Select>`, `<Textarea>` (react-hook-form + zod) |
| Grade badge (A/B/C/D) | custom `<GradeBadge>` |
| Verified badge | custom `<VerifiedBadge>` (with iRepair label) |
| Price tag | custom `<Price>` |
| Image grid uploader | custom `<ImageDropzone>` (drag/drop + paste) |

## Listing card

Three variants:
- **Grid card** (browse) — image, title, price, condition pill, verified/grade badge, city
- **List card** (admin queue) — same + status pill + age
- **Hero card** (home featured) — larger image, overlay text

Shape (from `Listing` model):

```tsx
type ListingCardProps = {
  id: string; slug: string;
  title: string; price: number;
  condition: 'new'|'like_new'|'good'|'fair'|'parts';
  grade?: 'A'|'B'|'C'|'D';
  isStore: boolean;
  checklistComplete: boolean;
  images: string[];  // storage paths
  city: string;
};
```

`verified` flag = `grade != null && checklist_complete = true`. Show iRepair badge.

## Grade badge spec

- A — solid filled, dark text on accent background, label "ΑΡΙΣΤΗ" / "EXCELLENT"
- B — outline, label "ΚΑΛΗ" / "GOOD"
- C — outline muted, label "ΜΕΤΡΙΑ" / "FAIR"
- D — outline destructive, label "ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ" / "FOR PARTS"

## Empty states

Source has stubs ("No listings yet"). Each page needs a visual empty state:

| Page | Icon | Copy key |
|---|---|---|
| Browse | `Search` | `no_listings` + `try_different_filters` |
| Profile / My listings | `Tag` | `no_listings_yet` + `create_first` |
| Messages | `MessagesSquare` | `messages_empty` (NEW key) |
| Appointments | `CalendarClock` | `appointments_empty` (NEW key) |

## Loading + error states

- React Query `isPending` → skeleton component matching card shape.
- React Query `error` → inline alert with retry button.
- Mutations → optimistic where safe (listing create is NOT — needs fraud check round-trip).

## Sell flow details

Source `(tabs)/sell.tsx` is single-page-scroll. Web port: 5-step wizard with progress indicator, persisted draft in localStorage. Step list:

1. **Photos** (3-10, drag-drop, thumbnail reorder)
2. **Category** + **brand** + **model** (cascading selects)
3. **Condition** (5 cards with image and description, hover preview)
4. **Price** (number input + pricing-guide modal showing PRICING_BANDS × grade multipliers)
5. **City** + **description** (textarea, 1500 char cap)

Submit → POST `/api/listings` → on `held=true` show "Listing under review" toast and route to profile.

## Token screen

The high-stakes screen. Replace 10s polling with Realtime channel:

```tsx
const [code, setCode] = useState(initial.code);
useEffect(() => {
  const ch = supabase.channel(`token:${tokenId}`)
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `id=eq.${tokenId}` },
        (p) => setCode(p.new.code))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [tokenId]);
```

Big 6-digit display, ring progress for 60s rotation, countdown badge "TTL 71h 23m", `is_redeemed` state shows green checkmark + redemption time.

## Accessibility

- All `<Button>` must have text or `aria-label`.
- Color contrast ≥ AA on the brand accent.
- Forms wired to react-hook-form with zod resolvers — accessible labels and aria-invalid.
- Keyboard nav on admin tables.
- Greek locale uses `lang="el"` at the `<html>` level via `[locale]/layout.tsx`.

## Dark mode

**DECIDE**: Source has no dark mode. Skip in V1; defer to V1.1. shadcn primitives ship with dark mode built-in so it's a CSS variable swap when wanted.
