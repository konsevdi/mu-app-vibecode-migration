# WAITLIST & REFERRALS EXPORT

**Status:** Fully implemented end-to-end. Mobile UI + backend routes + Zod contracts + bilingual copy in place. Gaps: no transaction around referral credit, in-memory rate limiter, no email verification.
**Target:** Supabase Postgres + Next.js web + React Native (Expo) mobile.
**Date:** 2026-05-12
**Source files:**
- `backend/prisma/schema.prisma` (`WaitlistSignup`, `User.isEligibleCity`)
- `backend/src/routes/waitlist.ts`
- `backend/src/lib/rate-limiter.ts`
- `shared/contracts.ts`
- `mobile/src/app/waitlist.tsx`
- `mobile/src/app/waitlist-success.tsx`
- `mobile/src/app/onboarding.tsx`
- `mobile/src/lib/onboardingStore.ts`
- `mobile/src/lib/languageStore.ts`

---

## 1. WAITLIST FORM

### 1.1 Route

`mobile/src/app/waitlist.tsx` → Expo Router `/waitlist`.

Query params (`mobile/src/app/waitlist.tsx:306-322`):
```ts
useLocalSearchParams<{
  city?: string;       // Pre-fill city
  country?: string;    // Pre-fill country
  ref?: string;        // Referral code from deep link
  intent?: string;     // "repair" → biases the form toward seller + repair note
}>();
```

### 1.2 Fields

| Field | UI | Type | Required | Default |
|---|---|---|---|---|
| `email` | text input, keyboardType email | string | yes | "" |
| `city` | text input, pre-fillable | string | yes | `params.city ?? selectedCity?.name ?? ""` |
| `country` | text input, pre-fillable | string | yes | `params.country ?? selectedCity?.country ?? ""` |
| `interestType` | segmented pill: Buyer / Seller / Both | enum | yes | `isRepairIntent ? "seller" : "both"` |
| `phone` | text input, keyboardType phone-pad | string \| undefined | no | "" |
| `socialHandle` | text input ("Instagram / Social") | string \| undefined | no | "" |
| `notes` | multiline textarea, max 500 | string \| undefined | no | repair-intent default copy (el/en) |
| `referralCode` | text input | string \| undefined | no | `params.ref ?? pendingRefCode ?? ""` |
| `consent` | checkbox | boolean | yes (must be `true`) | `false` |

### 1.3 Validation rules

Client (`waitlist.tsx:368-389`):
- `email`: must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- `city`: `.trim()` non-empty.
- `country`: `.trim()` non-empty.
- `consent`: must be `true`.

Server (`shared/contracts.ts:234-256`, `createWaitlistSignupRequestSchema`):
```ts
z.object({
  email: z.string().email(),
  city: z.string().min(1),
  country: z.string().min(1),
  interestType: z.enum(["buyer","seller","both"]),
  consent: z.boolean().refine(v => v === true, { message: "Consent is required" }),
  phone: z.string().optional(),
  socialHandle: z.string().optional(),
  notes: z.string().max(500).optional(),
  languagePref: z.enum(["el","en"]).default("el"),
  referredByCode: z.string().optional(),
});
```

### 1.4 Default values

- `languagePref` defaults to `"el"` at the contract level.
- `interestType` defaults to `"both"` in the UI (or `"seller"` when entry is `intent=repair`).
- All optional strings default to `undefined` server-side; nullable in DB.

### 1.5 Language behavior

Stored on `WaitlistSignup.languagePref` (`"el" | "en"`). All UI strings come from `mobile/src/lib/languageStore.ts`. The repair-intent `notes` default is pre-filled in the active language:
- el: `"Ενδιαφερομαι για επισκευη συσκευης"`
- en: `"Interested in device repair"`

### 1.6 Consent behavior

- Boolean checkbox, must be `true` before submit.
- Client refuses submit if false (sets `errors.consent`).
- Server rejects with 400 if `consent !== true` (Zod refinement).
- Consent string copy (el / en):
  - el: `"Συμφωνω να λαμβανω ειδοποιησεις"`
  - en: `"I agree to receive notifications"`

### 1.7 Success behavior

`waitlist.tsx:348-366` (React Query mutation):
```ts
onSuccess: (response) => {
  setWaitlistSignup(response.signup);
  setOnboardingCompleted(true);
  router.replace("/waitlist-success");
}
```

`onError` sets a localized banner: "Something went wrong. Please try again." / "Κατι πηγε στραβα. Δοκιμασε ξανα."

---

## 2. POST /api/waitlist

**File:** `backend/src/routes/waitlist.ts:46-167`.

### 2.1 Request schema

`shared/contracts.ts:234-256` — see §1.3.

### 2.2 Response schema

`shared/contracts.ts:258-280`:
```ts
const waitlistSignupSchema = z.object({
  id: z.string(),
  email: z.string(),
  city: z.string(),
  country: z.string(),
  interestType: z.enum(["buyer","seller","both"]),
  referralCode: z.string(),
  referredByCode: z.string().nullable(),
  referralCount: z.number(),
  positionScore: z.number(),
  languagePref: z.enum(["el","en"]),
  createdAt: z.string(),  // ISO
});
const createWaitlistSignupResponseSchema = z.object({
  success: z.boolean(),
  signup: waitlistSignupSchema,
});
```

### 2.3 201 behavior

New email → handler creates a new row, returns `{ success: true, signup: {...} }` with HTTP 201. Also logs `[Waitlist] New signup: <email> from <city>, <country>`.

### 2.4 Duplicate email = 200

`waitlist.ts:65-85`: if `db.waitlistSignup.findUnique({ where: { email } })` returns a row, the handler short-circuits and returns the **existing** signup with HTTP 200 (not 409). This is intentionally idempotent so a re-tap on the submit button doesn't error. The existing row's `referralCode`, `referralCount`, `positionScore` are returned unchanged.

### 2.5 Validation errors

Zod `safeParse` failure (`waitlist.ts:50-52`):
```ts
if (!parsed.success) {
  return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
}
```
HTTP 400 with field-level details (`fieldErrors`, `formErrors`).

### 2.6 Rate limit behavior

In-memory per-email limiter (`waitlist.ts:23-43`):
```ts
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;   // 1 hour
const MAX_ATTEMPTS = 3;
```
Triggered before the DB lookup. Over the limit → HTTP 429 `{ error: "Too many signup attempts. Please try again later." }`. **Resets only on server restart** (no eviction). Per-process; if backend is multi-instance this becomes ineffective.

### 2.7 Storage behavior

`db.waitlistSignup.create` (`waitlist.ts:127-141`) writes:
```ts
{
  email, city, country, interestType, consent,
  phone: phone || null,
  socialHandle: socialHandle || null,
  notes: notes || null,
  languagePref,
  referralCode,          // freshly generated
  referredByCode,        // validated string, or null after invalid/self-referral
}
```
Both `referralCount` and `positionScore` default to `0`. `createdAt` defaults to `now()`.

---

## 3. REFERRAL CODE GENERATION

### 3.1 Exact format

`waitlist.ts:14-21`:
```ts
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 1, 0 to avoid confusion
  let code = "MU";                                  // "Mobile Unit" prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```
- Length: **8 chars** (`"MU"` + 6 random).
- Alphabet: 32 chars — A-Z minus `I`/`O`, plus `2-9` minus `0`/`1`.
- Search space: `32^6 = 1,073,741,824` codes.

### 3.2 Randomness source

`Math.random()` — **not** CSPRNG. Sufficient for collision avoidance at our scale, **not** sufficient if a referral code ever gains monetary value (predictable). V1 should switch to `crypto.randomBytes` if the code ever unlocks a perk worth gaming.

### 3.3 Collision handling

`waitlist.ts:88-97`:
```ts
let referralCode = generateReferralCode();
let attempts = 0;
while (attempts < 10) {
  const exists = await db.waitlistSignup.findUnique({ where: { referralCode } });
  if (!exists) break;
  referralCode = generateReferralCode();
  attempts++;
}
```
Up to **10 retries**. After 10, the last-generated code is used **without** another check — theoretically allows the unique constraint to throw and bubble to the catch (returning 500). Practically unreachable at sub-million scale.

### 3.4 Case behavior

- Generated codes are uppercase by construction.
- Lookup in `GET /api/waitlist/referral/:code` uppercases the path param (`waitlist.ts:210`):
  ```ts
  const code = c.req.param("code").toUpperCase();
  ```
- Lookup in `POST /api/waitlist` (where `referredByCode` is matched) is **case-sensitive** (`waitlist.ts:101`):
  ```ts
  let referredByCode = data.referredByCode?.trim() || null;
  ```
  No uppercase. A user pasting `mu7abx3p` would silently fail the lookup and lose the referral credit. **Gap — V1 should uppercase before matching.**

### 3.5 Example codes

`MU7K9X2A`, `MU3P5N7Q`, `MUBHJK4M`, `MU22Y5XZ`, `MUC4E8WP`.

---

## 4. REFERRAL BONUS

### 4.1 `referredByCode` matching

`waitlist.ts:101-124`:
```ts
let referredByCode = data.referredByCode?.trim() || null;
if (referredByCode) {
  const referrer = await db.waitlistSignup.findUnique({
    where: { referralCode: referredByCode },
  });

  if (!referrer) {
    referredByCode = null;                   // invalid → silently ignored
  } else if (referrer.email === data.email) {
    referredByCode = null;                   // self-referral → silently ignored
  } else {
    await db.waitlistSignup.update({         // VALID → credit referrer
      where: { id: referrer.id },
      data: {
        referralCount: { increment: 1 },
        positionScore: { increment: 3 },
      },
    });
  }
}
```

### 4.2 Self-referral handling

`referrer.email === data.email` → discarded silently, signup proceeds without `referredByCode`. The new signup still gets its own fresh code.

### 4.3 Invalid code handling

No 4xx error. `referredByCode` is silently set to `null`, signup proceeds. From the user's perspective the form succeeds and they land on `/waitlist-success`. **Gap — no UI signal that the typed code was wrong.** V1: client should call `GET /api/waitlist/referral/:code` before submit and surface `{ valid: false }`.

### 4.4 `referralCount` increment

`+1` per valid (not invalid, not self) referral. Field is just a counter, no cap. No throttling for the referrer (someone could refer 10k accounts from a bot ring; abuse control gap — see §7.6).

### 4.5 `positionScore` increment

`+3` per valid referral. The score is intended to bump queue position; **today no endpoint exposes a queue position**. The schema is correct; the surface area to use it is missing.

### 4.6 Transaction / idempotency requirements

**Not transactional today.** Three separate queries: lookup referrer → update referrer → create new signup. Failure modes:
- If the `update` succeeds but the `create` fails, the referrer was credited for a phantom signup.
- Two concurrent requests from the same referee could race the duplicate-email check and both attempt to `create` (one will throw on the unique constraint, but the referrer would have been credited twice).

V1: wrap in `prisma.$transaction([...])` or a Postgres SQL function:
```ts
await db.$transaction(async (tx) => {
  if (referredByCode) {
    const referrer = await tx.waitlistSignup.findUnique({ where: { referralCode: referredByCode } });
    if (!referrer || referrer.email === data.email) referredByCode = null;
    else await tx.waitlistSignup.update({
      where: { id: referrer.id },
      data: { referralCount: { increment: 1 }, positionScore: { increment: 3 } },
    });
  }
  return tx.waitlistSignup.create({ data: { ...data, referralCode, referredByCode } });
});
```
For true idempotency: add `unique (referrer_id, referee_email)` on a separate `waitlist_referral` join table.

---

## 5. WAITLIST SUCCESS PAGE

**File:** `mobile/src/app/waitlist-success.tsx`.

### 5.1 Displayed data

- Hero title: `"You're on the list!"` / `"Εισαι στη λιστα!"` (`waitlist_success_title`).
- Subtitle: `"We'll notify you when we launch in your area"` / `"Θα σε ειδοποιησουμε οταν ανοιξουμε στην περιοχη σου"`.
- Referral card with the user's code in a large mono font.
- Bonus tag: `"+3 positions per friend"` / `"+3 θεσεις για καθε φιλο"`.
- Share + Copy-link buttons.
- "View Demo" CTA → routes to `/demo-browse`.

### 5.2 Referral code

Pulled from the Zustand-persisted `waitlistSignup` set in the mutation `onSuccess`. Fallback display when missing: `"MUXXXXXX"` (`waitlist-success.tsx:371`):
```ts
const referralCode = waitlistSignup?.referralCode ?? "MUXXXXXX";
```

### 5.3 Share behavior

`waitlist-success.tsx:380-391`:
```ts
const referralLink = `mobileunit://waitlist?ref=${referralCode}`;
const shareMessage = language === "el"
  ? `Κάνε εγγραφή στο Mobile Unit! Χρησιμοποίησε τον κωδικό μου ${referralCode} για να ανέβεις στη λίστα αναμονής. ${referralLink}`
  : `Join Mobile Unit! Use my code ${referralCode} to move up the waitlist. ${referralLink}`;
await Share.share({ message: shareMessage, title: "Mobile Unit" });
```
Native iOS / Android share sheet via React Native `Share`. **Note:** uses custom scheme `mobileunit://`, which only resolves on devices that have the app installed. V1 should use an https universal-link domain.

### 5.4 Copy-to-clipboard

`waitlist-success.tsx:393-399`:
```ts
await Clipboard.setStringAsync(referralLink);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
setCopied(true);
setTimeout(() => setCopied(false), 2000);
```
Button copy flips from `"Copy link"` / `"Αντιγραφη link"` to `"Copied!"` / `"Αντιγραφηκε!"` for 2 seconds, with a success haptic.

### 5.5 Referral count behavior

**Not displayed on the success screen today.** The mutation response includes `referralCount` and `positionScore`, but neither is rendered on `/waitlist-success`. V1 should show `"X friends joined • +3X positions"` and provide a "Refresh" button that re-calls `GET /api/waitlist/check/:email` to pick up new referrals after the user returns.

---

## 6. CITY GATE INTEGRATION

### 6.1 Eligible city logic

`mobile/src/lib/onboardingStore.ts:124-160`. `CITIES` is a hardcoded record `{ greece: [...], europe: [...] }` where each city has `isEligible: boolean`.

```ts
export const isCityEligible = (cityName: string): boolean => {
  const city = getAllCities().find(c =>
    c.name.toLowerCase() === cityName.toLowerCase() ||
    c.nameEl.toLowerCase() === cityName.toLowerCase());
  return city?.isEligible ?? false;
};
```

### 6.2 Rhodes behavior

Only Rhodes is `isEligible: true`. From the onboarding picker (`onboarding.tsx:535-542`):
```ts
setIsEligibleCity(true);
setOnboardingCompleted(true);
router.replace("/(tabs)");                  // main app
```

### 6.3 Ineligible city behavior

Any other selection (`onboarding.tsx:544-559`):
```ts
setIsEligibleCity(false);
router.push({
  pathname: "/waitlist",
  params: { city: city.name, country: city.country },
});
```
After submitting the form, the success page exposes `"View Demo"` → `/demo-browse`.

The flag persists in Zustand and is read on every relaunch (`onboarding.tsx:466-481`):
```ts
if (onboardingCompleted && isEligibleCity && defaultCity)  router.replace("/(tabs)");
if (onboardingCompleted && !isEligibleCity)                router.replace("/demo-browse");
```

### 6.4 `User.isEligibleCity`

Defined on the User model (`schema.prisma:24` — `isEligibleCity Boolean @default(false)`). **Today it is not written by any backend route.** The mobile app keeps the truth client-side in Zustand. V1: on first auth after city pick, PATCH `/api/users/me { selectedCity, selectedCountry, isEligibleCity, defaultCity }` so the server is the source of truth.

### 6.5 demo-browse removal recommendation

`mobile/src/app/demo-browse.tsx` is the "look-but-don't-touch" screen ineligible users land on. Recommended for V1:
- Keep the route — it's the only thing ineligible users have to engage with — but remove the open seller-CTA (`Ask us` TODO at `demo-browse.tsx:508` that doesn't go anywhere).
- Add a single "Join waitlist" sticky CTA at the bottom that opens `/waitlist` with city pre-filled (we already pass it through).
- Strip the fake purchase / chat affordances; ineligible users cannot transact.
- Cap data to the first 30 listings + tag them `(Rhodes demo)` so it's clear the inventory is not local to them.

If product wants a cleaner experience, the alternative is **removing demo-browse entirely** and routing ineligible users straight to `/waitlist-success` (or, if already signed up, to a status screen). My recommendation: keep it for V1, prune to the bare minimum CTA above.

---

## 7. SUPABASE IMPLEMENTATION

### 7.1 Table schema

```sql
create table public.waitlist_signups (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null,
  city              text not null,
  country           text not null,
  interest_type     text not null check (interest_type in ('buyer','seller','both')),
  consent           boolean not null check (consent = true),
  phone             text,
  social_handle     text,
  notes             text check (char_length(notes) <= 500),
  language_pref     text not null default 'el' check (language_pref in ('el','en')),
  referral_code     text not null,
  referred_by_code  text references public.waitlist_signups(referral_code)
                            on delete set null on update cascade,
  referral_count    int  not null default 0 check (referral_count >= 0),
  position_score    int  not null default 0 check (position_score >= 0),
  ip_address        inet,                              -- for abuse review
  created_at        timestamptz not null default now()
);

-- Optional V1: separate join table for idempotent referral credit
create table public.waitlist_referrals (
  referrer_id      uuid not null references public.waitlist_signups(id) on delete cascade,
  referee_id       uuid not null references public.waitlist_signups(id) on delete cascade unique,
  created_at       timestamptz not null default now(),
  primary key (referrer_id, referee_id)
);
```

Using `citext` for `email` makes the unique-by-lower-case duplicate check free.

### 7.2 Indexes

```sql
create unique index waitlist_email_uq           on public.waitlist_signups (email);
create unique index waitlist_referral_code_uq   on public.waitlist_signups (referral_code);
create index        waitlist_referred_by_idx    on public.waitlist_signups (referred_by_code);
create index        waitlist_city_country_idx   on public.waitlist_signups (country, city, created_at desc);
create index        waitlist_position_score_idx on public.waitlist_signups (position_score desc, created_at);
```

The last one supports a future `/waitlist/rank` endpoint.

### 7.3 Unique constraints

- `email` unique (citext → case-insensitive).
- `referral_code` unique.
- `(referrer_id, referee_id)` in `waitlist_referrals` if added.

### 7.4 RLS policies

```sql
alter table public.waitlist_signups enable row level security;

-- Public can insert (anon role used at sign-up time — no auth yet)
create policy waitlist_insert_anyone on public.waitlist_signups
for insert to anon, authenticated
with check (
  consent = true
  and interest_type in ('buyer','seller','both')
  and char_length(coalesce(notes,'')) <= 500
);

-- A signed-in user can read only their own row
create policy waitlist_select_self on public.waitlist_signups
for select to authenticated
using (auth.email() = email::text);

-- No client updates or deletes — admin only via service role
-- (omitting update/delete policies → denied by default with RLS enabled)

-- Staff/super_admin sees everything
create policy waitlist_select_staff on public.waitlist_signups
for select using (
  exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role in ('super_admin','admin'))
);
```

For the referral-code validation endpoint, expose a `SECURITY DEFINER` function that returns only `(valid boolean, referrer_email text)` with masking — avoid granting `select` to anon on the table:

```sql
create or replace function public.validate_referral(p_code text)
returns table(valid boolean, referrer_email text)
language sql stable security definer as $$
  select
    found,
    case when found then substr(localp,1,2) || '***@' || domain else null end
  from (
    select
      true as found,
      split_part(w.email,'@',1) as localp,
      split_part(w.email,'@',2) as domain
    from public.waitlist_signups w
    where w.referral_code = upper(p_code)
    union all select false, null, null limit 1
  ) s
$$;
revoke all on function public.validate_referral(text) from public;
grant execute on function public.validate_referral(text) to anon, authenticated;
```

### 7.5 Rate limiting via Upstash

Replace the in-memory `signupAttempts` map. Pseudo-code at the route boundary:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const signupLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(3, "1 h"),
  prefix: "rl:waitlist:signup",
});

const { success, reset, remaining } = await signupLimiter.limit(`email:${data.email.toLowerCase()}`);
if (!success) {
  return new Response(JSON.stringify({ error: "Too many signup attempts." }), {
    status: 429,
    headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
  });
}
```

Layer a second limiter keyed on `ip:` to catch one attacker walking a list of emails:
```ts
const ipLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "rl:waitlist:signup:ip",
});
```

### 7.6 Transaction logic

V1 referral credit must be atomic. Use a Postgres function so the whole insert + increment happens under one MVCC snapshot and the unique index protects against double-credit:

```sql
create or replace function public.waitlist_signup_with_referral(
  p_email text,
  p_city text,
  p_country text,
  p_interest_type text,
  p_consent boolean,
  p_phone text,
  p_social_handle text,
  p_notes text,
  p_language_pref text,
  p_referral_code text,           -- pre-generated by caller
  p_referred_by_code text
) returns public.waitlist_signups
language plpgsql security definer as $$
declare
  v_existing public.waitlist_signups;
  v_referrer public.waitlist_signups;
  v_new      public.waitlist_signups;
begin
  -- idempotent duplicate-email path
  select * into v_existing from public.waitlist_signups where email = p_email;
  if found then return v_existing; end if;

  if p_referred_by_code is not null then
    select * into v_referrer
    from public.waitlist_signups
    where referral_code = upper(p_referred_by_code)
    for update;            -- prevent racing two referees crediting same referrer

    if found and v_referrer.email <> p_email then
      update public.waitlist_signups
        set referral_count = referral_count + 1,
            position_score = position_score + 3
        where id = v_referrer.id;
    else
      p_referred_by_code := null;
    end if;
  end if;

  insert into public.waitlist_signups (
    email, city, country, interest_type, consent, phone, social_handle,
    notes, language_pref, referral_code, referred_by_code
  ) values (
    p_email, p_city, p_country, p_interest_type, p_consent, p_phone,
    p_social_handle, p_notes, p_language_pref, p_referral_code, p_referred_by_code
  ) returning * into v_new;

  -- Optional join table for ironclad idempotency
  if p_referred_by_code is not null then
    insert into public.waitlist_referrals (referrer_id, referee_id)
    values (v_referrer.id, v_new.id)
    on conflict do nothing;
  end if;

  return v_new;
end;
$$;
```

The `for update` lock + `on conflict do nothing` on `waitlist_referrals` gives us:
- No double-credit if two concurrent signups race.
- No phantom credit if the insert fails downstream.
- The handler stays "generate code → call function → return row."

---

## 8. TEST CASES

Vitest + Supabase test client (or Hono test client against the current Prisma backend — same shape).

### 8.1 New signup
```ts
test("new email creates a row with referral code", async () => {
  const res = await api.post("/api/waitlist", {
    email: "alice@example.com", city: "Athens", country: "Greece",
    interestType: "both", consent: true, languagePref: "el",
  });
  expect(res.status).toBe(201);
  expect(res.body.signup.referralCode).toMatch(/^MU[A-Z2-9]{6}$/);
  expect(res.body.signup.referralCount).toBe(0);
});
```

### 8.2 Duplicate signup
```ts
test("re-submitting same email returns existing row, not a new one", async () => {
  const first  = await api.post("/api/waitlist", { /* … */ email: "bob@example.com" });
  const second = await api.post("/api/waitlist", { /* … */ email: "bob@example.com" });
  expect(second.status).toBe(200);
  expect(second.body.signup.id).toBe(first.body.signup.id);
  expect(second.body.signup.referralCode).toBe(first.body.signup.referralCode);
  const rows = await db.waitlistSignup.findMany({ where: { email: "bob@example.com" } });
  expect(rows.length).toBe(1);
});
```

### 8.3 Valid referral
```ts
test("valid referredByCode credits +1 count and +3 score on referrer", async () => {
  const ref = await api.post("/api/waitlist", { /* … */ email: "carla@example.com" });
  const code = ref.body.signup.referralCode;
  await api.post("/api/waitlist", { /* … */ email: "dan@example.com", referredByCode: code });
  const updated = await db.waitlistSignup.findUnique({ where: { id: ref.body.signup.id } });
  expect(updated?.referralCount).toBe(1);
  expect(updated?.positionScore).toBe(3);
});
```

### 8.4 Invalid referral
```ts
test("invalid referredByCode is silently ignored", async () => {
  const res = await api.post("/api/waitlist", {
    /* … */ email: "eve@example.com", referredByCode: "MUNOPE99",
  });
  expect(res.status).toBe(201);
  expect(res.body.signup.referredByCode).toBeNull();
});
```

### 8.5 Self-referral
```ts
test("self-referral is dropped, signup still succeeds", async () => {
  const first = await api.post("/api/waitlist", { /* … */ email: "frank@example.com" });
  const self  = await api.post("/api/waitlist", {
    /* … */ email: "frank@example.com", referredByCode: first.body.signup.referralCode,
  });
  expect(self.body.signup.referredByCode).toBeNull();
  const row = await db.waitlistSignup.findUnique({ where: { id: first.body.signup.id } });
  expect(row?.referralCount).toBe(0);  // referrer NOT credited
});
```

### 8.6 Rate limit exceeded
```ts
test("4th distinct submit for same email in 1h returns 429", async () => {
  // Note: this exercises the in-memory limiter. Reset by restarting the server between tests.
  for (let i = 0; i < 3; i++) {
    await api.post("/api/waitlist", { /* … */ email: "spam@example.com" });
  }
  const fourth = await api.post("/api/waitlist", { /* … */ email: "spam@example.com" });
  expect(fourth.status).toBe(429);
  expect(fourth.body.error).toMatch(/too many/i);
});
```

### 8.7 Missing consent
```ts
test("consent=false is rejected by Zod refine", async () => {
  const res = await api.post("/api/waitlist", {
    email: "no-consent@example.com", city: "X", country: "Y",
    interestType: "both", consent: false, languagePref: "el",
  });
  expect(res.status).toBe(400);
  expect(JSON.stringify(res.body.details)).toMatch(/consent/i);
});
```

### 8.8 Too-long notes
```ts
test("notes > 500 chars rejected", async () => {
  const res = await api.post("/api/waitlist", {
    /* required fields */ notes: "x".repeat(501),
  });
  expect(res.status).toBe(400);
  expect(JSON.stringify(res.body.details)).toMatch(/notes/i);
});
```

### 8.9 (Additional) Referral validation endpoint
```ts
test("GET /api/waitlist/referral/:code returns masked email when valid", async () => {
  const r = await api.post("/api/waitlist", { /* … */ email: "gina.smith@example.com" });
  const res = await api.get(`/api/waitlist/referral/${r.body.signup.referralCode}`);
  expect(res.body.valid).toBe(true);
  expect(res.body.referrerEmail).toBe("gi***@example.com");
});
test("invalid code returns valid=false", async () => {
  const res = await api.get("/api/waitlist/referral/MUZZZZZZ");
  expect(res.body.valid).toBe(false);
});
```

### 8.10 (Additional) Code is case-insensitive on validate endpoint
```ts
test("lowercase code is uppercased before lookup", async () => {
  const r = await api.post("/api/waitlist", { /* … */ email: "hank@example.com" });
  const res = await api.get(`/api/waitlist/referral/${r.body.signup.referralCode.toLowerCase()}`);
  expect(res.body.valid).toBe(true);
});
```

(This will FAIL today for the **submit** path — see §3.4 — flagging the bug.)

---

## 9. KNOWN GAPS / V1 MUST-FIX

1. **Case-sensitive `referredByCode` match** at submit (`waitlist.ts:101`) — silently drops credit when a friend types in lowercase. Trivial fix: `.toUpperCase()`.
2. **No transaction** around referrer update + signup insert (`waitlist.ts:100-141`) — race condition, phantom credit possible.
3. **In-memory rate limiter** — process-local, resets on restart, useless if backend is multi-instance. Move to Upstash.
4. **Server doesn't write `User.isEligibleCity`** — Zustand-only. PATCH `/api/users/me` after city pick.
5. **No UI feedback for invalid referral code** — client should call `/api/waitlist/referral/:code` before submit.
6. **No queue position endpoint** — `positionScore` is collected but never read by the client.
7. **Custom-scheme share link** (`mobileunit://`) only works for users with the app — V1 should use https universal links so the share preview unfurls.
8. **No abuse cap on `referralCount`** — bot ring can pump a single referrer indefinitely. Add per-IP and per-day caps in the function.
9. **No email verification** — waitlist signup is unverified, so the inbox the user typed could be junk. V1: double opt-in email with a confirmation link.
10. **Referral count not shown on success screen** — easy win, increases the share rate.
