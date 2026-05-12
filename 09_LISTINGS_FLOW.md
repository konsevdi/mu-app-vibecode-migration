# 09 — Listings Flow

Source: `mobile/src/app/(tabs)/sell.tsx` (612 lines), `mobile/src/app/listing/[id].tsx` (628 lines), `mobile/src/app/(tabs)/browse.tsx` (352 lines), `mobile/src/app/(tabs)/index.tsx` (469 lines), `backend/src/routes/listings.ts` (340 lines).

## Browse — `/` (home) and `/browse`

### Home (`/`)

Sections, in order:

1. **Featured strip** — horizontal scroll of `is_featured=true AND status='approved'` listings (max 10). Endpoint: `GET /api/listings?featured=true&limit=10`.
2. **Categories grid** — 4 large tiles (Phone / Tablet / Laptop / Accessory) routing to `/browse?category=<slug>`. Colors: `#FF00FF`, `#00FF88`, `#00BFFF`, `#FFD700`.
3. **Recent** — vertical list of last 6 approved listings. `GET /api/listings?limit=6`.
4. **Empty state** if no listings: copy `Δεν υπαρχουν ακομα προτεινομενα. Γινε ο πρωτος!` (el) / `No featured listings yet. Be the first!` (en). CTA: "Δημιούργησε αγγελία" → `/sell`.

### Browse (`/browse`)

Sticky header:
- Search input (instant client-side filter on already-fetched page, then debounced server query at 500ms).
- Category filter chips: `all | phone | tablet | laptop | accessory`. `all` is default; selecting any other adds `?category=` to URL.
- Verified-only switch: small toggle "ΜΟΝΟ ΠΙΣΤΟΠΟΙΗΜΕΝΑ / Verified only". Adds `?verifiedOnly=true`.
- Sort dropdown (PROPOSED): "Νεότερα" / "Newest first" (default), "Φθηνότερα" / "Cheapest", "Ακριβότερα" / "Most expensive". Maps to `?sort=newest|price-asc|price-desc`.

List body:
- Two-column grid on mobile/sm, three on lg, four on xl.
- Listing card: cover image, title, price (`€<n>`), grade chip if verified, "PICKUP ONLY" chip.
- Infinite scroll via React Query `useInfiniteQuery`. Page size 24 (override of default 20 to match grid).

## Listing detail — `/listing/[id]`

Renders `getListingResponseSchema`.

### Hero

- Image carousel (use `embla-carousel-react`). First image is cover. Click any thumbnail to expand into a lightbox.
- Sticky CTAs at bottom (mobile):
  - **Επικοινωνία / Contact** → opens chat with seller (`/messages/<conversationId>`) or `mailto:<seller.email>?subject=...` fallback when not authed.
  - **Κράτηση Ελέγχου / Book inspection** → only for unverified listings (`!checklist_complete OR grade IS NULL`). Routes to `/book-appointment?listingId=<id>`.

### Grade chip

If `grade` is set:

| Grade | Color | Label el | Label en |
|---|---|---|---|
| A | `#00FF88` | ΑΡΙΣΤΗ | EXCELLENT |
| B | `#00BFFF` | ΚΑΛΗ | GOOD |
| C | `#FFD700` | ΜΕΤΡΙΑ | FAIR |
| D | `#FF6B6B` | ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ | FOR PARTS |

Source: `mobile/src/lib/verification.ts`.

If `inspection_date` exists, render "Ελεγχθηκε `<date>` απο `iRepair`" / "Inspected `<date>` by `iRepair`".

### Seller card

- Avatar + name (or "Χρηστης" / "User" if name null).
- Trust badge if `seller.trust_event_count >= 2`: green check + "ΕΠΑΛΗΘΕΥΜΕΝΟΣ" / "VERIFIED".
- Tap → `/u/<handle>` (V2, optional now).

### Safe meetup section

Renders **only when** `viewerCity === listing.city && viewerCity === PRIMARY_CITY`. Lists 2 stores from `seed-data.json`:

- iRepair Rhodes (Αμμοχώστου 18) — open in maps button.
- iRepair Spot (Αυστραλίας 84-86) — open in maps button.

Headline: "Ασφαλης συναντηση / Safe meetup". Copy: "Συναντηθειτε σε ενα απο τα καταστηματα iRepair. Ο τεχνικος μπορει να ελεγξει τη συσκευη πριν αγορασεις."

### Report button

Floating in top-right. Opens modal with `reason` textarea (1-500 chars) + submit. POSTs `/api/listings/<id>/report`.

### Increment views

Server-side: `GET /api/listings/:id` updates `views = views + 1`. Don't count owner self-views (compare `auth.uid()` to `seller_id`).

## Sell — `/sell` (7-step wizard)

State managed via `useReducer` or `react-hook-form` + step controller.

| Step | Field | UI |
|---|---|---|
| 1 | Category | 4 tiles (Phone/Tablet/Laptop/Accessory) — same colors as home grid. |
| 2 | Brand | Chips from category map (`KNOWLEDGE_BASE.categories.<cat>.popularBrands` + "Άλλο / Other" → free text). |
| 3 | Model | Chips for known brands (Apple: iPhone 11-15, SE, Pro, Pro Max; Samsung: S21-S24, Note 20, A53; Xiaomi: Redmi Note 11/12/13, Mi 11/12; OnePlus: 9/10/11; Google: Pixel 6/7/8). Else free text. |
| 4 | Condition | 5 radio cards with color stripes (see `lib/conditions.ts`): new `#00FF88`, like_new `#00FFFF`, good `#FFD700`, fair `#FFA500`, parts `#FF6B6B`. Each shows pricing band. |
| 5 | Photos | Drag-drop zone + file input. Min 3, max 10. Client-side: `browser-image-compression` to ≤ 2 MB / image. Display sortable thumbnails (`@dnd-kit/sortable`). First is cover. |
| 6 | Details | Title (3-100), description (10-2000), price (€), location (free text optional). Pricing-guidance card: "Συνιστωμενη τιμη: €X – €Y" based on PRICING_BANDS × user-entered "original retail" (or default to no calc if no retail provided). Link: `PANDAS_PRICING_URL`. |
| 7 | Preview | Read-only render of the listing card + detail page summary. Submit button: "Υποβολη / Submit". |

City: **locked to user's `selected_city`**. Display as a non-editable chip. Reject submission server-side if city mismatch.

## Image upload flow

1. Client step 5: user adds images → compressed client-side.
2. On each image: client calls `POST /api/upload/listing-image { contentType, filename }`. Server returns signed Supabase Storage upload URL.
3. Client PUTs the image directly to Supabase (`fetch(uploadUrl, { method: 'PUT', body: blob })`).
4. On success, store `{ url: publicUrl, storagePath, sortOrder }` in form state.
5. On final submit: server creates the listing, then bulk-inserts `listing_images` rows.

If user abandons the form, signed-upload bucket has orphan objects. **Mitigation:** a daily Supabase Edge Function or cron that deletes objects in `listings/` older than 24h that don't have a `listing_images` row.

## Submission validation (server)

`createListingRequestSchema` (from contracts) plus:
- `images.length >= 3` (already in schema).
- All image URLs must point to `<NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/listings/...`.
- `seller_id` from auth, not body.
- `city` must equal user's `profiles.selected_city` AND `cities.is_eligible=true`.
- Price `>= 0` and `<= 99999` (clamp PROPOSED).

## Approval workflow

- New listings default to `status='pending', is_active=true, is_held=false`.
- Pending listings are visible only to the owner and to admin.
- Admin approves via `/admin/listings` (sets `status='approved'`).
- Rejected listings: `status='rejected'`, owner sees rejection reason on detail page; can edit and resubmit (toggles status back to `pending`).

## Edit & delete

- Owner can edit any field except grade/status while `status IN ('pending', 'rejected')`.
- Once `status='approved'`, owner can edit description and images only. Title/price/condition changes require re-approval (server flips status back to `pending`).
- Delete is soft (`is_active=false`); listing detail still loads for participants in active conversations but won't appear in browse.

## Featured

`is_featured` is admin-set only. No "boost" purchase in V1.

## Category counts (PROPOSED)

`GET /api/listings/counts` → `{ phone: 23, tablet: 5, laptop: 12, accessory: 8 }`. Used to render badge counts on category tiles.
