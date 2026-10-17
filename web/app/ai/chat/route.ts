// POST /ai/chat — the assistant-mascot (Gemini with function calling). The API key stays on the server.
// Not under /api: everything there is proxied to Express (next.config.ts rewrites).
import { ApiError, createPartFromFunctionResponse, FunctionCallingConfigMode, GoogleGenAI, type Content } from '@google/genai';
import { z } from 'zod';
import { authenticate } from '@/features/assistant/server/auth';
import { inferNavigation } from '@/features/assistant/server/navigation';
import { buildSystemInstruction } from '@/features/assistant/server/prompt';
import { getCityQuests } from '@/features/assistant/server/quests';
import { runTool, toolDeclarations, type ToolContext } from '@/features/assistant/server/tools';
import type { AssistantResponse } from '@/features/assistant/types';

// override with GEMINI_MODEL, e.g. gemini-flash-lite-latest (faster, higher free-tier limits)
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const MAX_ROUNDS = 4; // model ↔ tools round trips per message
const RATE_LIMIT = { requests: 20, windowMs: 60_000 }; // per signed-in user
const MAX_TRACKED_USERS = 5_000; // the limiter's memory stays bounded
/** Tools that only change what the UI shows: their result tells the model nothing new. */
const UI_TOOLS = new Set(['show_quest_cards', 'suggest_navigation', 'set_highlights']);

const requestSchema = z.object({
  // the user types at most 1000 characters; the model's own answers in the history may be longer
  messages: z
    .array(
      z.discriminatedUnion('role', [
        z.object({ role: z.literal('user'), text: z.string().trim().min(1).max(1000) }),
        z.object({ role: z.literal('assistant'), text: z.string().trim().min(1).max(4000) }),
      ]),
    )
    .min(1)
    .max(12),
  joinedQuestIds: z.array(z.string().max(64)).max(100).optional(),
  profile: z
    .object({
      name: z.string().max(80).optional(),
      level: z.number().int().optional(),
      xp: z.number().int().optional(),
      xpToNextLevel: z.number().int().min(0).optional(),
      balance: z.number().int().optional(),
      completedQuests: z.number().int().min(0).optional(),
      questsPerGift: z.number().int().min(1).optional(),
      questsToNextGift: z.number().int().min(0).optional(),
      giftsAvailable: z.number().int().min(0).optional(),
    })
    .nullish(),
});

// In-memory limiter keyed by user id (an IP header can be spoofed, a signed token cannot).
// Good enough for one server; use a shared store (Redis) when scaling out.
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.delete(userId); // re-insert: Map keeps insertion order, so the users seen longest ago come first
  hits.set(userId, recent);
  for (const key of hits.keys()) {
    if (hits.size <= MAX_TRACKED_USERS) break;
    hits.delete(key);
  }
  return recent.length > RATE_LIMIT.requests;
}

const fail = (status: number, message: string) => Response.json({ error: message }, { status });

/** Text parts of a model turn (it may come together with function calls). */
const textOf = (content: Content | undefined) =>
  (content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, 'Помічник ще не налаштований');

  // signed-in users only: an anonymous caller must not spend the Gemini quota
  const auth = await authenticate(request);
  if (!auth.ok) {
    console.warn('[ai/chat] rejected:', auth.reason);
    return fail(401, 'Увійди в акаунт, щоб поговорити з помічницею');
  }
  if (rateLimited(auth.userId)) return fail(429, 'Забагато запитань поспіль. Зачекай хвилинку');

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Некоректний запит');
  const req = parsed.data;
  if (req.messages[req.messages.length - 1].role !== 'user') return fail(400, 'Некоректний запит');

  let quests;
  try {
    quests = await getCityQuests(auth.token);
  } catch {
    return fail(502, 'Не вдалося отримати квести. Спробуй трохи згодом');
  }

  const ctx: ToolContext = {
    quests,
    joinedIds: new Set(req.joinedQuestIds ?? []),
    cards: [],
    mood: null,
    navSuggestion: null,
    highlights: [],
  };
  // Gemini history must start with a user turn
  const firstUser = req.messages.findIndex((m) => m.role === 'user');
  const contents: Content[] = req.messages.slice(firstUser).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  // no SDK retries: on a rate limit they only burn quota and keep the user waiting; never hang longer than 25 s
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } } });
  try {
    let text = '';
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS - 1;
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: buildSystemInstruction(req),
          temperature: 0.6,
          tools: [{ functionDeclarations: toolDeclarations }],
          // the last round must answer in text
          toolConfig: { functionCallingConfig: { mode: lastRound ? FunctionCallingConfigMode.NONE : FunctionCallingConfigMode.AUTO } },
        },
      });

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        text = response.text?.trim() || text; // an empty final turn keeps the answer written alongside earlier calls
        break;
      }
      const modelTurn = response.candidates?.[0]?.content;
      contents.push(modelTurn ?? { role: 'model', parts: calls.map((functionCall) => ({ functionCall })) });
      contents.push({
        role: 'user',
        parts: calls.map((call) => createPartFromFunctionResponse(call.id ?? '', call.name ?? '', runTool(call.name, call.args, ctx))),
      });
      // text written together with tool calls is the answer so far
      text = textOf(modelTurn) || text;
      // UI-only calls (cards, button, highlights) need no reply: with the answer written, skip another round trip
      if (text && calls.every((call) => UI_TOOLS.has(call.name ?? ''))) break;
    }

    const answer = text.trim() || 'Хм, щось я задумалась. Спробуй запитати інакше 🦉';
    // asked «де / покажи» but the model forgot the button: name the section ourselves
    const previousAnswer = req.messages.findLast((m) => m.role === 'assistant')?.text ?? '';
    const navSuggestion = ctx.navSuggestion ?? inferNavigation(req.messages[req.messages.length - 1].text, answer, previousAnswer);

    const body: AssistantResponse = {
      text: answer,
      mood: ctx.mood ?? (ctx.cards.length > 0 ? 'point' : 'idle'),
      quests: ctx.cards,
      navSuggestion: navSuggestion ?? undefined,
      highlights: ctx.highlights.length > 0 ? ctx.highlights : undefined,
    };
    return Response.json(body);
  } catch (error) {
    // don't leak provider details (or the key) to the browser; log only the status and message
    const status = error instanceof ApiError ? error.status : undefined;
    console.error('[ai/chat]', status ?? '', error instanceof Error ? error.message.slice(0, 300) : error);
    // free Gemini keys allow only a few requests per minute, and one chat message makes 2–3 of them
    if (status === 429) return fail(429, 'Я трохи захекалась — забагато запитань за хвилину. Спробуй трохи згодом 🦉');
    return fail(502, 'Помічник зараз недоступний. Спробуй за хвилину');
  }
}
