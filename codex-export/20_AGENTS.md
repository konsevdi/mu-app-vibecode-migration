# 20 — Agents (Claude Integration)

Replace the MOCKED keyword-matching switch in `backend/src/routes/assistant.ts` (393 lines, hardcoded responses) with **Anthropic Claude haiku-4-5** streaming via the Anthropic TypeScript SDK.

## Source state

`backend/src/routes/assistant.ts:22-93` is the entire "AI" — a `KNOWLEDGE_BASE` object plus a `generateResponse` function that does keyword matching:

```ts
if (lower.includes("price") || lower.includes("τιμή")) return PRICE_RESPONSE;
if (lower.includes("safe")  || lower.includes("ασφάλ")) return SAFETY_RESPONSE;
// ... 8 more branches
return FALLBACK_RESPONSE;
```

No external API call. No streaming. Single JSON response with `reply` + `suggestions[]`.

## Target

A single agent — the **Buyer's Guide** — exposed at `/[locale]/assistant` and as an overlay everywhere via a global "?" affordance.

- **Model**: `claude-haiku-4-5-20251001` (env-configurable: `ANTHROPIC_MODEL`).
- **Streaming**: yes, via SSE. Client uses `EventSource` for token-by-token display.
- **Tool use**: yes — a few small typed tools (see below).
- **Context window**: keep the last 10 user/assistant turns in `messages`; system prompt is fixed-size.

## System prompt (canonical)

```
You are the Mobile Unit buyer's guide.

Mobile Unit is a peer-to-peer marketplace for used phones, tablets, laptops, and accessories in Rhodes, Greece. iRepair Rhodes is the partner store for diagnostics, grading, and safe meetups.

YOUR ROLE
- Help buyers and sellers make informed decisions: pricing, safety, condition, grading, the trade-in path through iRepair.
- Use the trust/grading vocabulary precisely: A = ΑΡΙΣΤΗ (Excellent), B = ΚΑΛΗ (Good), C = ΜΕΤΡΙΑ (Fair), D = ΓΙΑ ΑΝΤΑΛΛΑΚΤΙΚΑ (For parts).
- A listing is "verified" only when it has a grade AND `checklist_complete = true` from an iRepair inspection.

LANGUAGE
- Respond in the user's language. Default to Greek (el) if uncertain. Greek replies use polished sentence-case with accents (do NOT use the UI's uppercase-no-accents convention in conversational replies).

SAFETY (always include if relevant)
1. Meet in a public place — preferably iRepair Rhodes or iRepair Spot.
2. Inspect the device thoroughly before paying.
3. Never pay upfront. Never wire money.
4. If a deal feels too good to be true, it isn't.

iRepair INFO
- iRepair Rhodes — Αμμοχώστου 18, 85131, Ρόδος.
- iRepair Spot — Αυστραλίας 84-86, 85100, Ρόδος (Public Νέα Μαρίνα).
- Diagnostic fee: €10. Fully refunded if the device is bought through Mobile Unit.

PRICING REFERENCE
- New: 85-95% of MSRP.
- Like new: 75-88%.
- Good: 60-75%.
- Fair: 40-60%.
- Parts: 10-35%.
- Pandas pricing tool: https://pandas.io/pricing.

CONSTRAINTS
- NEVER share another user's PII (email, phone, full name). Only handles are public.
- NEVER recommend the user move the conversation off-platform (WhatsApp, Telegram, Instagram, Viber, Signal). Mobile Unit chat is the only safe channel.
- If asked about price for a specific device, suggest the Pandas pricing tool AND remind the user that the iRepair €10 diagnostic includes a grading that produces a more precise valuation.
- When asked something out of scope (politics, medical, legal advice not related to consumer rights for used electronics), politely refuse and redirect.
- Keep replies tight: ≤ 120 words unless the user explicitly asks for a long explanation.
```

System prompt + KNOWLEDGE_BASE constants live in `lib/assistant/system-prompt.ts`.

## Tools

Define three tools the agent can call. All are server-side and read from Postgres via the service-role client (the assistant route runs server-side and can read public data on the user's behalf via service-role + explicit policies).

### `lookup_listing`

```ts
{
  name: "lookup_listing",
  description: "Get details of a specific listing by its slug or id.",
  input_schema: {
    type: "object",
    properties: {
      slug_or_id: { type: "string", description: "Slug or UUID" },
    },
    required: ["slug_or_id"],
  },
}
```

Returns: title, price, condition, grade, brand, model, city, seller_handle, trust_event_count, is_store. Use to ground specific listing questions.

### `current_pricing_band`

```ts
{
  name: "current_pricing_band",
  description: "Get the suggested price band for a device category + condition.",
  input_schema: {
    type: "object",
    properties: {
      category:  { type: "string", enum: ["phone","tablet","laptop","accessory"] },
      condition: { type: "string", enum: ["new","like_new","good","fair","parts"] },
    },
    required: ["category","condition"],
  },
}
```

Returns: `{ minPercent, maxPercent }` from `PRICING_BANDS` × locale-aware copy.

### `store_status`

```ts
{
  name: "store_status",
  description: "Get current hours and availability of an iRepair store.",
  input_schema: {
    type: "object",
    properties: { store_id: { type: "string", enum: ["irepair-rhodes","irepair-spot"] } },
    required: ["store_id"],
  },
}
```

Returns hours_json + a derived `isOpenNow` boolean computed against `Europe/Athens` timezone.

## Streaming wire format

Route handler `app/api/assistant/route.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  threadId: z.string().uuid().optional(),
  locale: z.enum(['el','en']).default('el'),
});

export async function POST(req: Request) {
  const body = bodySchema.parse(await req.json());
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // anonymous use allowed; rate-limit harder if user is null

  // load thread history
  const history = body.threadId ? await loadThread(body.threadId) : [];

  const anthropic = new Anthropic();

  const stream = anthropic.messages.stream({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [...history, { role: 'user', content: body.message }],
    tools: TOOLS,
  });

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

Client (`<AssistantStream>`):

```tsx
const es = new EventSource('/api/assistant?...');
es.onmessage = (evt) => { /* append delta */ };
```

## Persisted threads (optional V1.1)

For authenticated users only — persist threads so the user can resume:

```sql
create table public.assistant_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.assistant_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.assistant_threads(id) on delete cascade,
  role        text not null check (role in ('user','assistant','tool')),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
```

V1: in-memory only; reset on page reload. Sufficient for first launch.

## Rate limiting

- Anonymous: 10 messages / hour by IP.
- Authenticated: 60 messages / hour by user_id.
- Enforced via Upstash Redis (`rate-limit` package).
- Response on limit: 429 with `retryAfter`.

## Prompt-injection defenses

- Strip control characters from user input.
- Reject inputs > 2000 chars (zod).
- The system prompt explicitly forbids leaking PII or moving conversations off-platform; reinforce with a post-hoc regex check on the final assistant text — if it contains an OFF_PLATFORM_PATTERN match, replace and add an audit log row `assistant.regenerated_unsafe`.

## Telemetry

Log every interaction to `auto_action_log` with rule_name `assistant_message`:

```jsonc
{
  "user_id": "uuid or null",
  "thread_id": "uuid",
  "model": "claude-haiku-4-5-20251001",
  "input_tokens": 320,
  "output_tokens": 180,
  "tools_called": ["lookup_listing"],
  "latency_ms": 870
}
```

No raw user message stored by default (PII). Sample 1% for QA review with explicit user consent.

## Cost guardrails

- Cap `max_tokens=1024` per turn.
- 10 turn history cap → bounded input growth.
- Daily budget: track output_tokens per day in Redis; if > 1M tokens/day, raise alert (Missive draft).

## No fallback to mocked switch

Once Claude integration ships, remove `KNOWLEDGE_BASE` keyword switch entirely. If Anthropic is unreachable, the route returns 503 with a localized "Service temporarily unavailable" message. Do not gracefully degrade to keyword matching — it teaches users to ask the wrong way.
