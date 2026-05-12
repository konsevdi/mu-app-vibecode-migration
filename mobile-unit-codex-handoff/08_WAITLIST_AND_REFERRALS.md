# 08 — Waitlist & Referrals

Source: `mobile/src/app/waitlist.tsx` (916 lines), `mobile/src/app/waitlist-success.tsx`, `backend/src/routes/waitlist.ts`, `shared/contracts.ts` lines 233-294.

## Purpose

Capture demand from outside the eligible city before the marketplace opens there. Referral codes give existing waitlist users a position boost when they invite others.

## Routes

| Route | Purpose |
|---|---|
| `/waitlist` | Signup form. Accepts `?city=<slug>&country=<code>&ref=<code>` query params for prefill. |
| `/waitlist-success` | Post-submit confirmation, shows referral code + share buttons. |

## Form fields

All come from `createWaitlistSignupRequestSchema`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes | Validated with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` plus zod `.email()`. Lowercased server-side. |
| `city` | string | yes | `.trim().min(1)`. Free text — could be one of the 14 non-eligible seeded cities OR a custom value. |
| `country` | string | yes | `.trim().min(1)`. ISO country name in user's language. |
| `interestType` | `'BUYER' \| 'SELLER' \| 'BOTH'` | yes | Source enum is lowercase; admin UI prefers uppercase. **Decision:** store uppercase in DB, accept both via zod transform. |
| `consent` | boolean | yes | Must be `true`; refines with message "Consent is required". |
| `phone` | string | no | E.164 preferred; no validation in V1. |
| `socialHandle` | string | no | Instagram/TikTok/etc. |
| `notes` | string (max 500) | no | If `?intent=repair`, server prefills with: `"Ενδιαφερομαι για επισκευη συσκευης"` (el) or `"Interested in device repair"` (en). |
| `languagePref` | `'el' \| 'en'` | yes (defaulted) | From current language store. |
| `referredByCode` | string | no | Set from `?ref=` query param. |

## UI

- Background mirrors onboarding gradient (`#0A0A0A` base).
- Each field uses the same `Input` component (border `#1A1A1A`, focus border `#FF00FF`).
- `interestType` rendered as four large chips: Buyer / Seller / Both + a separate **REPAIR** chip that sets `notes` to the repair string and switches intent to `'BUYER'` (since the schema doesn't have a REPAIR option) **OR** extend the schema to `'BUYER' | 'SELLER' | 'BOTH' | 'REPAIR'` — **decision:** extend, since the data is useful for the partner.
- Consent checkbox: required, label includes a link to `/legal/privacy`.
- Submit button disabled until validation passes; shows spinner on submit.

## Server behavior

`POST /api/waitlist`:

```ts
async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createWaitlistSignupRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'VALIDATION', issues: parsed.error.issues }, 400);

  const ratelimit = await rl.check(`waitlist:${ip(req)}`, 5, '1h');
  if (!ratelimit.success) return json({ error: 'RATE_LIMITED', retryAfter: ratelimit.reset }, 429);

  const { email, referredByCode, ...rest } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // 409 if already signed up
  const { data: existing } = await supa.from('waitlist_signups').select('id').eq('email', normalizedEmail).maybeSingle();
  if (existing) return json({ error: 'CONFLICT', reason: 'EMAIL_EXISTS' }, 409);

  const referralCode = generateReferralCode(); // 8 alphanum, no O/0/I/1

  const { data: inserted } = await supa.from('waitlist_signups').insert({
    email: normalizedEmail,
    referral_code: referralCode,
    referred_by_code: referredByCode ?? null,
    ...rest,
  }).select('*').single();

  // Bump referrer
  if (referredByCode) {
    await supa.rpc('bump_referrer', { code: referredByCode });
  }

  await sendWaitlistEmail(normalizedEmail, inserted, parsed.data.languagePref);
  return json({ success: true, signup: serializeSignup(inserted) }, 201);
}
```

`bump_referrer` RPC:

```sql
create or replace function bump_referrer(code text)
returns void language plpgsql as $$
begin
  update waitlist_signups
    set referral_count = referral_count + 1,
        position_score = position_score + 10
  where referral_code = code;
end;
$$;
```

## Success page

Route: `/waitlist-success?email=...` (or read referral code from a session cookie set on submit — cookie is cleaner since it survives reloads without leaking email in URL).

Content:
- Big checkmark / hero icon.
- "Είσαι στη λίστα. Σε ειδοποιούμε όταν ανοίξουμε στην `<city>`."
- Referral block: "Ο κωδικός σου: **ABCD1234**" + share buttons (X, Facebook, WhatsApp, copy link).
- Share URL: `https://APP_DOMAIN/waitlist?ref=ABCD1234&city=<city>`.
- Each share opens `share-intent://` (web) or platform deep links. WhatsApp: `https://wa.me/?text=...`.
- Counter: "Έχεις 0 παραπομπές" / "0 referrals" (updates server-side; client polls every 10s? Or just renders on next visit).

## Referral logic

- Codes are unique 8-char alphanumeric (excluding ambiguous O/0/I/1).
- Position score formula: `referral_count * 10`. Pure numeric so admin can sort.
- No reward mechanism in V1 — it's purely "you'll get access earlier when we open in your city". Communicate that on `/waitlist-success`.
- **PROPOSED V2:** badge tiers (Bronze 5 refs, Silver 15, Gold 50) and tangible perks (priority listing approval, free first inspection).

## Admin view

`/admin/waitlist`:
- Table with: email (masked: `j***@gmail.com` unless admin clicks "reveal"), city, country, interestType, referralCount, positionScore, createdAt.
- Filters: city, country, interestType, has-referrer.
- Sort: positionScore desc by default.
- Export CSV button → `GET /api/admin/waitlist?format=csv`.
- Total counter at top.

## Email

Sent via Resend on signup. Template (Greek default):

> **Είσαι στη λίστα του `APP_NAME`!**
>
> Σ' ευχαριστούμε που εγγραφήκες. Σε ειδοποιούμε όταν ανοίξουμε στην `<city>`.
>
> Ο κωδικός παραπομπής σου: **ABCD1234**
> Μοίρασέ τον με φίλους και θα προηγηθείς στη λίστα.
>
> — Η ομάδα `APP_NAME`

English version mirrors. Use `react-email` (`@react-email/components`) for templating.

## Rate limits

- `POST /api/waitlist`: 5/hour/IP (set globally to discourage signup spam).
- `GET /api/waitlist/check/:email`: 5/min/IP.
- `GET /api/waitlist/referral/:code`: 10/min/IP.
