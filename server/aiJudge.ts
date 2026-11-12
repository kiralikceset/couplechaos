import { hintRevealsWord } from "../client/src/lib/hintFilter";
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

async function callAnthropic(prompt: string, image: { mediaType: string; base64: string }, signal: AbortSignal): Promise<string> {
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
          { type: "text", text: prompt },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic_http_${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
  return (payload.content || []).filter((part) => part.type === "text").map((part) => part.text || "").join("");
}

async function callOpenAICompatible(name: Exclude<ProviderName, "anthropic">, prompt: string, imageData: string, signal: AbortSignal): Promise<string> {
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
          { type: "text", text: prompt },
          { type: "image_url", image_url: isOpenAI ? { url: imageData, detail: "low" } : { url: imageData } },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`${name}_http_${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content || "";
}

// ── Fair scoring: the AI looks at the drawing WITHOUT knowing the word ─────
// Knowing the word makes a model "see" it everywhere (a grid becomes honey).
// So step 1 is blind: "what is this?" → ranked guesses. The score comes from
// where the real word lands in that list. Step 2 (text only) writes the joke.

interface BlindGuess {
  label: string;
  confidence: number;
}

interface BlindLook {
  guesses: BlindGuess[];
  looksLike: string;
}

function blindPrompt(mode: "classic" | "co-draw"): string {
  return [
    "This is a quick finger doodle from a phone drawing game (light strokes on a dark background).",
    mode === "co-draw" ? "Two people drew it at the same time on one canvas." : "One person drew it in about 30 seconds.",
    "You do NOT know what it was supposed to be. Look only at the drawing.",
    "List the 5 things it most likely shows, most likely first, as short English nouns (1-3 words),",
    "each with a confidence 0-100 that it is really that. Be honest: a vague scribble gets low confidence.",
    "If the canvas is empty or just random lines, say so as the first guess.",
    "Also describe what it literally looks like in max 8 words, oddly specific and funny.",
    'Reply with ONLY this JSON: {"guesses": [{"label": "...", "confidence": 0}], "looks_like": "..."}',
  ].join("\n");
}

export function parseBlind(text: string): BlindLook | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { guesses?: unknown; looks_like?: unknown };
    const guesses = (Array.isArray(parsed.guesses) ? parsed.guesses : [])
      .map((item) => ({
        label: String((item as { label?: unknown })?.label || "").trim().slice(0, 60),
        confidence: Math.max(0, Math.min(100, Number((item as { confidence?: unknown })?.confidence) || 0)),
      }))
      .filter((item) => item.label)
      .slice(0, 5);
    if (!guesses.length) return null;
    return { guesses, looksLike: String(parsed.looks_like || "").trim().slice(0, 80) };
  } catch {
    return null;
  }
}

/** Where the real word lands among the blind guesses decides the score. */
export function scoreFromBlind(look: BlindLook, word: string): number {
  const rank = look.guesses.findIndex((guess) => hintRevealsWord(guess.label, word));
  if (rank < 0) {
    // Not recognised at all. A confident "it's clearly something else" scores lowest.
    const top = look.guesses[0]?.confidence || 0;
    return Math.max(3, Math.round(20 - top * 0.15));
  }
  const weights = [1, 0.8, 0.65, 0.5, 0.4];
  const floors = [55, 42, 33, 26, 20];
  const caps = [98, 75, 60, 48, 38];
  const raw = Math.round(look.guesses[rank].confidence * weights[rank]);
  return Math.max(floors[rank], Math.min(caps[rank], raw));
}

function commentPrompt(word: string, mode: "classic" | "co-draw", languages: Locale[]): string {
  const output = languages.length === 1
    ? [`Write "guess" and "comment" in ${LANGUAGE_NAMES[languages[0]]}.`, 'Reply with ONLY this JSON: {"recognisable": true|false, "guess": "...", "comment": "..."}']
    : [
        `Write "guess" and "comment" once per language code: ${languages.map((code) => `${code} = ${LANGUAGE_NAMES[code]}`).join(", ")}. Same joke, natural in each language.`,
        `Reply with ONLY this JSON: {"recognisable": true|false, "guess": {${languages.map((code) => `"${code}": "..."`).join(", ")}}, "comment": {${languages.map((code) => `"${code}": "..."`).join(", ")}}}`,
      ];
  return [
    "You are the judge of \"Couple Chaos\", a party drawing game: a dramatic, snobbish art critic who takes terrible phone doodles far too seriously.",
    `The secret word was "${word}". ${mode === "co-draw" ? "Both partners drew it together on one canvas." : "The drawer only had text hints from their partner."}`,
    "Be STRICT: would a stranger who did NOT know the word recognise it? Do not see the word in random lines.",
    "\"recognisable\": your honest answer to that.",
    "\"guess\": what it actually looks like, absurd and oddly specific (max 8 words).",
    "\"comment\": max 2 short sentences, max 180 characters, 1-2 emoji. Recognisable: a backhanded compliment. Not recognisable: roast it, absurd and judgmental. Mock the drawing and teamwork, never people's looks, bodies, identity or intelligence. No sexual content, profanity or slurs.",
    ...output,
  ].join("\n");
}

async function lookBlind(selected: ProviderName, imageData: string, image: { mediaType: string; base64: string }, mode: "classic" | "co-draw"): Promise<BlindLook | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 7000);
  try {
    const prompt = blindPrompt(mode);
    const text = selected === "anthropic"
      ? await callAnthropic(prompt, image, controller.signal)
      : await callOpenAICompatible(selected, prompt, imageData, controller.signal);
    const look = parseBlind(text);
    if (!look) console.warn("[ai] unparseable blind look:", text.slice(0, 200));
    return look;
  } finally {
    clearTimeout(timeout);
  }
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
  const languages = languagesOf(input.locale, input.locales);
  const mode = input.mode || "classic";
  // Both looks run at the same time: the blind one decides the score, the other writes the joke.
  const commentCall = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 7000);
    try {
      const prompt = commentPrompt(input.word, mode, languages);
      const text = selected === "anthropic"
        ? await callAnthropic(prompt, image, controller.signal)
        : await callOpenAICompatible(selected, prompt, input.imageData, controller.signal);
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start < 0 || end <= start) return null;
      return JSON.parse(text.slice(start, end + 1)) as { recognisable?: unknown; guess?: unknown; comment?: unknown };
    } catch (error) {
      console.warn("[ai] comment failed:", String(error).slice(0, 200));
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
  try {
    const [look, joke] = await Promise.all([lookBlind(selected, input.imageData, image, mode), commentCall]);
    if (!look) return null;
    const score = scoreFromBlind(look, input.word);
    // Keep the joke only if its tone matches the fair score (no "great honey!" for a cage).
    const agrees = joke && (typeof joke.recognisable !== "boolean" || joke.recognisable === score >= 45);
    const comments = agrees ? pickText(joke.comment, languages, 300) : {};
    const guesses = joke ? pickText(joke.guess, languages, 80) : {};
    if (languages[0] === "en" && !guesses.en && look.looksLike) guesses.en = look.looksLike;
    return { score, comment: comments[languages[0]] || "", guess: guesses[languages[0]], comments, guesses, source: "ai" };
  } catch (error) {
    console.warn("[ai] judge failed:", String(error).slice(0, 300));
    return null;
  }
}

export const __test = { parseJudgeJson, buildPrompt, parseBlind, scoreFromBlind, blindPrompt, commentPrompt };

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

