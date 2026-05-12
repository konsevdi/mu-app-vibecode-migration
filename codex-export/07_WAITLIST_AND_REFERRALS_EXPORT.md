# 07 — Waitlist and Referrals Export

## Schema

Source `backend/prisma/schema.prisma:365-384`:

```
id, email (UNIQUE), city, country, interestType ("buyer"|"seller"|"both"),
consent (true required), phone?, socialHandle?, notes?, languagePref ("el"|"en", default "el"),
referralCode (UNIQUE, 8 chars), referredByCode?, referralCount default 0, positionScore default 0,
createdAt
@@index([referralCode]) @@index([referredByCode])
```

Postgres:

```sql
create type interest_type as enum ('buyer','seller','both');
create type ui_language   as enum ('el','en');

create table public.waitlist_signups (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  city            text not null,
  country         text not null,
  interest_type   interest_type not null,
  consent         boolean not null check (consent = true),
  phone           text,
  social_handle   text,
  notes           text check (char_length(notes) <= 500),
  language_pref   ui_language not null default 'el',
  referral_code   text not null unique,
  referred_by_code text,
  referral_count  integer not null default 0,
  position_score  integer not null default 0,
  created_at      timestamptz not null default now()
);
create index on public.waitlist_signups(referral_code);
create index on public.waitlist_signups(referred_by_code);
```

## Referral code generator

VERBATIM from `backend/src/routes/waitlist.ts:14-21`:

```ts
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 1, 0 to avoid confusion
  let code = "MU"; // Mobile Unit prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Output**: 8 chars total — `MU` + 6 from a 32-char unambiguous alphabet.

**Collision handling** (waitlist.ts:88-98):

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

Probability of collision after 10 retries with `32^6 = ~1 B` codespace is astronomically low. For Postgres rebuild — same retry pattern, OR move into a Postgres function called from `BEFORE INSERT` trigger.

## Sign-up flow

`backend/src/routes/waitlist.ts:46-167`:

1. Validate `createWaitlistSignupRequestSchema` (Zod, see `16_API_CONTRACTS.md`).
2. **Rate limit** by email: 3 per hour via in-memory `Map`. Replace with Upstash Redis.
3. Idempotency: if `email` already in `waitlist_signups`, return the existing row (200), NOT a duplicate.
4. Generate `referralCode`. Retry up to 10x on collision.
5. Validate `referredByCode`:
   - If null/empty → skip.
   - Look up by `referralCode`. If not found → `referredByCode = null`.
   - If found but `referrer.email === data.email` → self-referral, `referredByCode = null`.
   - Otherwise → `UPDATE referrer SET referralCount += 1, positionScore += 3`.
6. Insert new row.
7. Return 201 with `signup` payload (full row, ISO strings).

## Check / referral endpoints

```
GET /api/waitlist/check/:email   → { exists, signup? }
GET /api/waitlist/referral/:code → { valid, referrerEmail? }
```

Email masking (`waitlist.ts:222-224`):

```ts
const [localPart, domain] = signup.email.split("@");
const maskedLocal = localPart.slice(0, 2) + "***";
const maskedEmail = `${maskedLocal}@${domain}`;
```

So `jane.doe@example.com` → `ja***@example.com`. The referral lookup never exposes the full referrer email.

The code parameter is **uppercased** before lookup (`code.toUpperCase()` at waitlist.ts:210) — referral links are case-insensitive.

## Position score formula

Source rule (current):
```
position_score = +3 per validated referral (one-way credit on the referrer)
```

That's the entire system. There is no time-decay, no tier system, no bonus for "X referrals in Y days." **DECIDE** before launch:

- Keep simple `+3/referral` for V1 → predictable, easy to communicate.
- Add cap (e.g., max +30 = 10 referrals) to prevent runaway gaming.
- Optional: bonus +5 for `interest_type='seller'` referrals (sellers seed the marketplace).

Queue order in admin UI:

```sql
select * from public.waitlist_signups
where city = $1
order by position_score desc, created_at asc;
```

## Deep-link referral capture

Mobile `mobile/src/app/_layout.tsx` captures `?ref=CODE` from incoming deep links and stores it on `onboardingStore.pendingRefCode` (see `mobile/src/lib/onboardingStore.ts:38-39`). On waitlist submit, the code is pulled from the store and sent as `referredByCode`.

Web equivalent: `middleware.ts` reads `?ref=` from the URL and sets a `refCode` cookie (HttpOnly, 30-day expiry). Sign-up route reads it. Cleared after first use.

```ts
// middleware.ts
const ref = req.nextUrl.searchParams.get('ref');
if (ref) {
  res.cookies.set('refCode', ref.toUpperCase(), { httpOnly: true, maxAge: 30 * 86400, sameSite: 'lax' });
}
```

## Validation rules (Zod, verbatim)

From `shared/contracts.ts:244-258`:

```ts
export const createWaitlistSignupRequestSchema = z.object({
  email: z.string().email(),
  city: z.string().min(1),
  country: z.string().min(1),
  interestType: z.enum(["buyer","seller","both"]),
  consent: z.boolean().refine((v) => v === true, { message: "Consent is required" }),
  phone: z.string().optional(),
  socialHandle: z.string().optional(),
  notes: z.string().max(500).optional(),
  languagePref: z.enum(["el","en"]).default("el"),
  referredByCode: z.string().optional(),
});
```

## Email confirmation (MISSING → rebuild)

Source does not send a confirmation email. The rebuild should send via Resend:

- **Subject**: `Καλώς ήρθες στη λίστα του Mobile Unit` / `Welcome to the Mobile Unit waitlist`
- **Body**: confirmation + share-your-code-CTA with the user's `referralCode` and a deep link `https://mobileunit.gr/r/{code}`.

React Email template path: `emails/waitlist-welcome.tsx`. Localized via the user's `languagePref`.

## RLS posture

Waitlist signups contain PII. Default policy:

```sql
alter table public.waitlist_signups enable row level security;
-- no SELECT for anon
-- INSERT allowed for anon (signup form)
create policy "anon_insert_waitlist" on public.waitlist_signups
  for insert to anon with check (true);
-- SELECT only for staff
create policy "staff_read_waitlist" on public.waitlist_signups
  for select using (
    exists (select 1 from public.staff
            where user_id = auth.uid() and is_active = true
            and role in ('super_admin','admin'))
  );
```

The check/referral GET endpoints bypass RLS by going through the service-role client — they intentionally return only `exists` boolean (no row) and a masked email respectively, so PII isn't leaked.
