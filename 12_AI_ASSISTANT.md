# 12 — AI Assistant

Source: `backend/src/routes/assistant.ts` (393 lines). Per D4, the rebuild is **hybrid** — keyword router as fast path, Claude Haiku 4.5 fallback for signed-in users only.

## Architecture

```
POST /api/assistant/chat
  ├─ sanitizeText(message, { maxLength: 2000 })
  ├─ keyword_router(message, language) ──┐
  │     hit  ──▶ return { reply, suggestions }   (free, instant)
  │     miss ──┐
  │            ├─ anon caller     → fallback string
  │            └─ authed caller   → ratelimit + Claude Haiku 4.5
```

## Knowledge base

Embed verbatim from source — see `backend/src/routes/assistant.ts` lines 22-93. Includes:

- **categories**: `phone | tablet | laptop | accessory` with priceRange, popularBrands, tips.
- **conditions**: `new | like_new | good | fair | parts` with discount + description.
- **safetyTips**: 5 tips per language (el / en).
- **iRepairInfo**: services list, diagnosticFee=€10, locations array.

This object is exported from `lib/assistant/knowledge-base.ts` and used by both the keyword router and the Claude system prompt.

## Keyword router

The 6 intents the source already handles (verbatim trigger words):

| Intent | English triggers | Greek triggers |
|---|---|---|
| **pricing** | `price`, `worth` | `τιμή`, `πόσο`, `αξία` |
| **safety** | `safe`, `scam`, `trust` | `ασφάλ`, `απάτ`, `εμπιστ` |
| **iRepair** | `irepair`, `verification`, `grading` | `πιστοποίηση`, `βαθμολόγηση` |
| **recommendations** | `recommend`, `suggest`, `best`, `budget` | `προτείνεις`, `καλύτερο` |
| **selling** | `sell`, `listing`, `post` | `πουλ`, `αγγελία` |
| **conditions** (NEW — extracted from KB) | `new`, `like_new`, `good`, `fair`, `parts`, `condition` | `κατάσταση`, `καινούργιο`, `καλό` |

Each intent returns a hand-crafted bilingual response — copy/paste from source `generateResponse()` for the first 5; write the conditions response from KB data.

Response format: Markdown (renders via `react-markdown`). Emojis allowed (💰 🛡️ 🔧 📱 📤). Pandas pricing link inlined.

After the response, **3 suggestion chips** are returned. The user can tap one to send it as their next message (re-runs the chat endpoint).

## Fuzzy fallback in router

Use `fuse.js` (already pinned) to match the user's message to a short list of pre-canned phrases when no keyword matches. Threshold `0.4`. This catches typos.

```ts
const FUZZY_INTENTS = [
  { id: 'pricing', el: ['τιμη', 'τιμη πωλησης', 'ποσο κανει'], en: ['price', 'cost'] },
  { id: 'safety',  el: ['ασφαλεια', 'απατη'], en: ['safety', 'scam'] },
  // ...
];
```

## Claude fallback (D4)

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const result = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 2000,
  system: [
    {
      type: 'text',
      text: SYSTEM_PROMPT,                        // see below
      cache_control: { type: 'ephemeral' },       // prompt caching
    },
    {
      type: 'text',
      text: KNOWLEDGE_BASE_JSON,                  // serialized KB
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [
    ...history.slice(-6),                          // last 3 user/assistant pairs from this conversation
    { role: 'user', content: sanitizedMessage },
  ],
});
```

### System prompt (literal — write to `lib/assistant/system-prompt.ts`)

```
You are the customer assistant for APP_NAME, a Greek/English trusted marketplace for used phones, tablets, laptops, and accessories. The marketplace partners with PARTNER_NAME for physical inspection and A/B/C/D grading.

You answer in the user's language. The default is Greek. When the user writes in Greek, follow this tonality rule:
- UPPERCASE strings have NO accents (e.g. "ΑΓΟΡΑ", "ΚΑΛΗ ΚΑΤΑΣΤΑΣΗ").
- lowercase strings have accents (e.g. "καινούργιο", "αξιοπιστία").

Keep responses short (under 6 sentences unless a bullet list is helpful), warm, and direct. Use plain Markdown — short headings (##) and bullets (-). Avoid emojis unless the user uses them.

Rules:
- Never quote prices outside the bands in the knowledge base.
- When asked about inspection or grading, point to PARTNER_NAME at the seeded store locations.
- When asked how to sell, point to /sell.
- When asked anything outside this marketplace (general tech support, repairs not done by PARTNER_NAME, off-topic), politely decline and redirect.
- Never share a phone number or external URL.
- If the user appears at risk (e.g. asking to send payment off-platform), warn them and link to /legal/safety.

Knowledge base is provided in the next system message — defer to it for facts. If you don't know, say "Δεν είμαι σίγουρος για αυτό. Δες /support για να επικοινωνήσεις με την ομάδα." (or English equivalent).

Today's eligible city is PRIMARY_CITY. All other cities route to /waitlist. Do not invite the user to use the marketplace if they are outside PRIMARY_CITY.
```

`KNOWLEDGE_BASE_JSON` is `JSON.stringify(KNOWLEDGE_BASE, null, 2)` from the same `lib/assistant/knowledge-base.ts` module. Caching it as a separate system block keeps it warm across calls.

### Rate limiting

Per D4:
- Anon: **0 LLM calls** — fallback to a translated "Πες μου περισσοτερα..." message.
- Authed: **20 LLM calls / day / user**.
- Hard cap: 2000 output tokens.

Upstash `@upstash/ratelimit`:

```ts
const dailyLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, '1 d'),
  prefix: 'assistant',
});
const { success, remaining } = await dailyLimit.limit(userId);
if (!success) {
  return json({
    reply: language === 'el'
      ? 'Έφτασες το όριο για σήμερα (20 μηνύματα). Δοκίμασε ξανά αύριο.'
      : 'You hit today\'s limit (20 messages). Try again tomorrow.',
    suggestions: [],
    timestamp: new Date().toISOString(),
  });
}
```

### Cost target

Claude Haiku 4.5 pricing as of 2026-Q1: ~$1/M input, ~$5/M output. With prompt caching, the system + KB blocks cost 90% less on cache hit. Per call: ~0.5k uncached system + 6k cached KB + 200 input + 400 output tokens. Worst case ~$0.003/call. 20 calls × authed users — bounded.

## Suggestions endpoint

`GET /api/assistant/suggestions?page=<page>&language=<el|en>` — returns 3 contextual chips per page.

Source mapping (verbatim from `backend/src/routes/assistant.ts:367-391`):

| Page | el | en |
|---|---|---|
| `home` | Τι συσκευή να αγοράσω; / Πώς δουλεύει η εφαρμογή; / Είναι ασφαλές; | What device should I buy? / How does the app work? / Is it safe? |
| `browse` | Βρες μου iPhone κάτω από €300 / Καλύτερα tablets / Πιστοποιημένες συσκευές | Find iPhone under €300 / Best tablets / Verified devices |
| `sell` | Πώς βάζω καλές φωτο; / Ποια τιμή να βάλω; / Τι είναι η πιστοποίηση; | How to take good photos? / What price to set? / What is verification? |
| `listing` | Είναι καλή τιμή; / Τι να ελέγξω; / Πώς κλείνω ραντεβού; | Is this a good price? / What to check? / How to book appointment? |

## UI

A floating action button (FAB) at bottom-right on every page except `/admin/*`:

```
       ┌──────┐
       │  💬  │  ← FAB
       └──────┘
```

Click opens a side-sheet (desktop) or full-screen sheet (mobile) with:
- Header: "Βοηθος / Assistant" + close button.
- Suggestion chips (from `/api/assistant/suggestions?page=...`).
- Message list (rendered Markdown bubbles).
- Input + send button at bottom.

State persistence: keep last 20 messages in `sessionStorage` keyed by user id (or by anon session id). No DB.

## Context passed to the API

Always include `{ page: '/listing/abc' | '/browse' | ... }` and `{ listingId, category }` when on a listing.

If `listingId` is present, fetch the listing summary (title, brand, model, condition, grade) and prepend it to the user message as a hidden system note: `"User is currently viewing: <title>, <brand> <model>, condition <condition>, grade <grade or N/A>."`

## Safety / moderation

- Run `sanitizeText` (strip control chars, normalize unicode, cap length to 2000).
- Refuse messages containing `OFF_PLATFORM_RX` patterns (return a warning instead of calling Claude).
- Don't echo back URLs from user input.
- Log every call to `audit_logs` (`action='assistant_chat'`, `details={ tokens_in, tokens_out, intent, route }`). Don't store the actual content (PII risk).
