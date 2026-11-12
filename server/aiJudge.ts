/**
 * AI drawing judge.
 *
 * The API key lives ONLY on the server (environment variable). It is never
 * shipped inside the Android/iOS app, so it cannot be extracted from the APK.
 *
 * Configure with environment variables:
 *   AI_PROVIDER        "anthropic" | "openai" | "gemini" | "groq" | "auto" (default: auto → whichever key exists)
 *   ANTHROPIC_API_KEY  key for Claude (vision)
 *   OPENAI_API_KEY     key for OpenAI (vision)
 *   GEMINI_API_KEY     key for Google Gemini (free tier available, aistudio.google.com)
 *   GROQ_API_KEY       key for Groq (free tier available, console.groq.com)
 *   AI_MODEL           optional model override
 *   AI_TIMEOUT_MS      max wait for the AI answer (default 7000)
 *   AI_DAILY_LIMIT     max AI calls per server per day (default 3000) — cost guard
 *
 * When no key is set, or the AI is slow/fails, the game falls back to the
 * offline score + comment computed on the phone, so a round never gets stuck.
 */

export type Locale = "tr" | "en" | "de" | "es";

export interface JudgeInput {
  imageData: string;
  word: string;
  locale: Locale;
  /** Every player's app language: each one gets the comment in their own language. */
  locales?: Locale[];
  mode?: "classic" | "co-draw";
}

export interface JudgeResult {
  score: number;
  /** Comment / guess in the first language. */
  comment: string;
  guess?: string;
  /** Per-language comment / guess (always contains the first language). */
  comments: Partial<Record<Locale, string>>;
  guesses: Partial<Record<Locale, string>>;
  source: "ai";
}

const LANGUAGE_NAMES: Record<Locale, string> = {
  tr: "Turkish",
  en: "English",
  de: "German",
  es: "Spanish",
};

let usageDay = "";
let usageCount = 0;

type ProviderName = "anthropic" | "openai" | "gemini" | "groq";

/** OpenAI-compatible chat endpoints. Gemini and Groq both offer one. */
const OPENAI_COMPATIBLE: Record<Exclude<ProviderName, "anthropic">, { url: string; keyEnv: string; model: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GEMINI_API_KEY", model: "gemini-3.5-flash-lite" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY", model: "qwen/qwen3.8-27b" },
};

const hasKey = (name: ProviderName) =>
  Boolean(process.env[name === "anthropic" ? "ANTHROPIC_API_KEY" : OPENAI_COMPATIBLE[name].keyEnv]?.trim());

function provider(): ProviderName | null {
  const wanted = (process.env.AI_PROVIDER || "auto").trim().toLowerCase() as ProviderName | "auto";
  if (wanted !== "auto") return ["anthropic", "openai", "gemini", "groq"].includes(wanted) && hasKey(wanted) ? wanted : null;
  for (const name of ["anthropic", "openai", "gemini", "groq"] as ProviderName[]) if (hasKey(name)) return name;
  return null;
}

export function isAiJudgeEnabled(): boolean {
  return provider() !== null;
}

function underDailyLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== usageDay) {
    usageDay = today;
    usageCount = 0;
  }
  const limit = Number(process.env.AI_DAILY_LIMIT) || 3000;
  if (usageCount >= limit) return false;
  usageCount += 1;
  return true;
}

function languagesOf(locale: Locale, locales?: Locale[]): Locale[] {
  const list = [locale, ...(locales || [])].filter((value): value is Locale => value in LANGUAGE_NAMES);
  return Array.from(new Set(list));
}

function buildPrompt(word: string, locale: Locale, mode: "classic" | "co-draw" = "classic", locales?: Locale[]): string {
  const languages = languagesOf(locale, locales);
  const setup = mode === "co-draw"
    ? "Both partners knew the word and drew it TOGETHER on one shared canvas at the same time, each from their own phone, for about 20 seconds, without being able to talk. Their strokes overlap and fight each other."
    : "The drawer never saw the word. Their partner described it with short text hints, then the drawer had about 30 seconds to draw it on a phone with a finger.";
  const output = languages.length === 1
    ? [
        `Write "guess" and "comment" in ${LANGUAGE_NAMES[languages[0]]}.`,
        "Reply with ONLY this JSON, nothing else:",
        "{\"score\": <number>, \"guess\": \"<what it looks like>\", \"comment\": \"<verdict>\"}",
      ]
    : [
        `The two players use different app languages. Write "guess" and "comment" once per language code: ${languages.map((code) => `${code} = ${LANGUAGE_NAMES[code]}`).join(", ")}. Same joke, natural in each language (not a word-for-word translation).`,
        "Reply with ONLY this JSON, nothing else:",
        `{"score": <number>, "guess": {${languages.map((code) => `"${code}": "..."`).join(", ")}}, "comment": {${languages.map((code) => `"${code}": "..."`).join(", ")}}}`,
      ];
  return [
    "You are the judge of \"Couple Chaos\", a party drawing game for couples and friends.",
    "Your persona: a dramatic, snobbish art critic who takes this terrible phone doodle FAR too seriously, like a pretentious gallery judge or a disappointed talent-show juror.",
    `The secret word was: "${word}".`,
    setup,
    "Look at the drawing (light strokes on a dark background).",
    "",
    "Your job:",
    "1. \"guess\": what the drawing ACTUALLY looks like. Be absurd and oddly specific, like \"a tax inspector melting in a sauna\" or \"a potato that just got dumped\". Never just repeat the secret word, even for a good drawing — find the funny detail.",
    "2. \"comment\": a short, judgmental, over-the-top verdict that makes both players laugh. Use absurd comparisons, fake-serious drama and exaggeration (e.g. \"I have seen better art on a foggy bus window\", \"this horse filed for divorce\"). Mock the drawing, the teamwork and the hints — never the people's looks, body, identity or intelligence. No sexual content, no profanity, no slurs.",
    "   Even a great drawing gets a backhanded compliment, never plain praise.",
    "3. \"score\": 1 to 100 for how recognizable the secret word is. Be honest here even though the comment is a joke. An empty canvas is 1-3.",
    "",
    "Comment: max 2 short sentences, max 180 characters, 1-2 emoji. Guess: max 8 words.",
    ...output,
  ].join("\n");
}

function splitDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  return match ? { mediaType: match[1], base64: match[2] } : null;
}

function pickText(value: unknown, languages: Locale[], max: number): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {};
  if (typeof value === "string" && value.trim()) {
    out[languages[0]] = value.trim().slice(0, max);
  } else if (value && typeof value === "object") {
    for (const code of languages) {
      const text = (value as Record<string, unknown>)[code];
      if (typeof text === "string" && text.trim()) out[code] = text.trim().slice(0, max);
    }
  }
  return out;
}

function parseJudgeJson(text: string, languages: Locale[] = ["tr"]): JudgeResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { score?: unknown; comment?: unknown; guess?: unknown };
    const score = Math.round(Number(parsed.score));
    const comments = pickText(parsed.comment, languages, 300);
    const guesses = pickText(parsed.guess, languages, 80);
    const comment = comments[languages[0]] || Object.values(comments)[0] || "";
    if (!Number.isFinite(score) || !comment) return null;
    if (!comments[languages[0]]) comments[languages[0]] = comment;
    return {
      score: Math.max(1, Math.min(100, score)),
      comment,
      guess: guesses[languages[0]] || Object.values(guesses)[0],
      comments,
      guesses,
      source: "ai",
    };
  } catch {
    return null;
  }
}

async function callAnthropic(input: JudgeInput, image: { mediaType: string; base64: string }, signal: AbortSignal): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL?.trim() || "claude-haiku-5-5",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: buildPrompt(input.word, input.locale, input.mode, input.locales) },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic_http_${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
  return (payload.content || []).filter((part) => part.type === "text").map((part) => part.text || "").join("");
}

async function callOpenAICompatible(name: Exclude<ProviderName, "anthropic">, input: JudgeInput, signal: AbortSignal): Promise<string> {
  const target = OPENAI_COMPATIBLE[name];
  const isOpenAI = name === "openai";
  const response = await fetch(target.url, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env[target.keyEnv]!.trim()}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL?.trim() || target.model,
      max_tokens: 300,
      // Only OpenAI is guaranteed to accept these two; the reply is parsed leniently anyway.
      ...(isOpenAI ? { response_format: { type: "json_object" } } : {}),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: buildPrompt(input.word, input.locale, input.mode, input.locales) },
          { type: "image_url", image_url: isOpenAI ? { url: input.imageData, detail: "low" } : { url: input.imageData } },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`${name}_http_${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content || "";
}

/** Returns an AI verdict, or null when AI is off / slow / failing (caller falls back). */
export async function judgeDrawing(input: JudgeInput): Promise<JudgeResult | null> {
  const selected = provider();
  if (!selected || !input.imageData || !input.word) return null;
  const image = splitDataUrl(input.imageData);
  if (!image) return null;
  if (!underDailyLimit()) {
    console.warn("[ai] daily limit reached, using offline comments");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 7000);
  try {
    const text = selected === "anthropic"
      ? await callAnthropic(input, image, controller.signal)
      : await callOpenAICompatible(selected, input, controller.signal);
    const result = parseJudgeJson(text, languagesOf(input.locale, input.locales));
    if (!result) console.warn("[ai] unparseable answer:", text.slice(0, 200));
    return result;
  } catch (error) {
    console.warn("[ai] judge failed:", String(error).slice(0, 300));
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const __test = { parseJudgeJson, buildPrompt };

// ── Smart hints ("Akıllı ipucu") for the describer ─────────────────────────
function hintPrompt(word: string, locale: Locale): string {
  return [
    `Secret word for a drawing game: "${word}".`,
    `Write 3 short, fun hints in ${LANGUAGE_NAMES[locale]} that help someone guess and draw it.`,
    "Each hint max 5 words. Describe shape, color, where you find it or what it does.",
    "NEVER write the word itself, a part of it, its root, a translation or the first letter.",
    'Reply with ONLY a JSON array of 3 strings, e.g. ["...","...","..."].',
  ].join("\n");
}

async function textCompletion(prompt: string, signal: AbortSignal, maxTokens = 200): Promise<string> {
  const selected = provider();
  if (!selected) return "";
  if (selected === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(), "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.AI_MODEL?.trim() || "claude-haiku-5-5", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
    if (!response.ok) throw new Error(`anthropic_http_${response.status}`);
    const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return (payload.content || []).map((part) => part.text || "").join("");
  }
  const target = OPENAI_COMPATIBLE[selected];
  const response = await fetch(target.url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env[target.keyEnv]!.trim()}` },
    body: JSON.stringify({ model: process.env.AI_MODEL?.trim() || target.model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`${selected}_http_${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content || "";
}

export function parseHintList(text: string): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").map((item) => item.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 60)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/** Up to 3 AI hints; [] when AI is off, slow or failing. Never throws. */
export async function generateHints(word: string, locale: Locale): Promise<string[]> {
  if (!provider() || !word || !underDailyLimit()) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_HINT_TIMEOUT_MS) || 6000);
  try {
    return parseHintList(await textCompletion(hintPrompt(word, locale), controller.signal));
  } catch (error) {
    console.warn("[ai] hints failed:", String(error).slice(0, 200));
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ── The AI as the drawer (solo mode, when the player gives the hints) ──────
export interface BotDrawing {
  guess: string;
  /** Strokes as [x, y] points, 0..1 on a 3:4 canvas. */
  strokes: number[][][];
}

function botDrawPrompt(hints: string[], options: string[], locale: Locale): string {
  return [
    "You are playing a drawing party game as the DRAWER. You never saw the secret word.",
    `Your partner's hints so far (${LANGUAGE_NAMES[locale]}): ${hints.length ? hints.map((hint) => `"${hint}"`).join(", ") : "(none yet)"}.`,
    `The answer is one of: ${options.map((option) => `"${option}"`).join(", ")}.`,
    "1. Pick the option the hints point to (if there are no hints, guess).",
    "2. Draw that thing as a simple, slightly clumsy phone doodle: 2 to 6 strokes, each 4 to 20 points.",
    "Canvas is 100 wide and 130 tall, (0,0) top-left. Keep it centered and big.",
    'Reply with ONLY this JSON: {"guess": "<one option exactly>", "strokes": [[[x,y],[x,y],...], ...]}',
  ].join("\n");
}

export function parseBotDrawing(text: string, options: string[]): BotDrawing | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { guess?: unknown; strokes?: unknown };
    const guess = options.find((option) => option.toLocaleLowerCase("tr") === String(parsed.guess || "").trim().toLocaleLowerCase("tr"));
    if (!guess || !Array.isArray(parsed.strokes)) return null;
    const strokes = parsed.strokes
      .slice(0, 8)
      .map((stroke) => (Array.isArray(stroke) ? stroke : [])
        .slice(0, 40)
        .map((point) => (Array.isArray(point) ? [Number(point[0]) / 100, Number(point[1]) / 130] : [NaN, NaN]))
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
        .map(([x, y]) => [Math.max(0, Math.min(1, Math.round(x * 1000) / 1000)), Math.max(0, Math.min(1, Math.round(y * 1000) / 1000))]))
      .filter((stroke) => stroke.length >= 2);
    return strokes.length ? { guess, strokes } : null;
  } catch {
    return null;
  }
}

/** Asks the AI what it thinks the hints mean and how it would draw it. */
export async function botDraw(hints: string[], options: string[], locale: Locale): Promise<BotDrawing | null> {
  if (!provider() || !options.length || !underDailyLimit()) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_HINT_TIMEOUT_MS) || 8000);
  try {
    return parseBotDrawing(await textCompletion(botDrawPrompt(hints, options, locale), controller.signal, 900), options);
  } catch (error) {
    console.warn("[ai] bot drawing failed:", String(error).slice(0, 200));
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

