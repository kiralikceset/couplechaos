/**
 * AI drawing judge.
 *
 * The API key lives ONLY on the server (environment variable). It is never
 * shipped inside the Android/iOS app, so it cannot be extracted from the APK.
 *
 * Configure with environment variables:
 *   AI_PROVIDER        "anthropic" | "openai" | "auto" (default: auto → whichever key exists)
 *   ANTHROPIC_API_KEY  key for Claude (vision)
 *   OPENAI_API_KEY     key for OpenAI (vision)
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
  mode?: "classic" | "co-draw";
}

export interface JudgeResult {
  score: number;
  comment: string;
  guess?: string;
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

function provider(): "anthropic" | "openai" | null {
  const wanted = (process.env.AI_PROVIDER || "auto").trim().toLowerCase();
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (wanted === "anthropic") return hasAnthropic ? "anthropic" : null;
  if (wanted === "openai") return hasOpenAI ? "openai" : null;
  if (hasAnthropic) return "anthropic";
  if (hasOpenAI) return "openai";
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

function buildPrompt(word: string, locale: Locale, mode: "classic" | "co-draw" = "classic"): string {
  const language = LANGUAGE_NAMES[locale];
  const setup = mode === "co-draw"
    ? "Both partners knew the word and drew it TOGETHER on one shared canvas at the same time, each from their own phone, for about 20 seconds, without being able to talk. Their strokes overlap and fight each other. In your roast, tease how well (or badly) they cooperated."
    : "The drawer never saw the word. Their partner described it with short text hints, then the drawer had only about 10 seconds to draw it on a phone with a finger.";
  return [
    "You are the judge of \"Couple Chaos\", a party drawing game for couples and friends.",
    `The secret word was: "${word}".`,
    setup,
    "Look at the drawing (light strokes on a dark background).",
    "",
    "Your job:",
    "1. Decide what the drawing ACTUALLY looks like to you. Be absurd and specific (e.g. \"a depressed potato riding a broom\").",
    "2. Write a short, savage-but-loving roast that makes both players laugh. Tease the drawing and the teamwork, never the people's looks, body, identity or intelligence. No sexual content, no profanity.",
    "3. Give a score from 1 to 100 for how recognizable the secret word is in the drawing. An empty canvas is 1-3.",
    "",
    `Write the comment and guess in ${language}. Comment: max 2 sentences, max 200 characters, 1-2 emoji.`,
    "Reply with ONLY this JSON, nothing else:",
    "{\"score\": <number>, \"guess\": \"<what it looks like>\", \"comment\": \"<roast>\"}",
  ].join("\n");
}

function splitDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  return match ? { mediaType: match[1], base64: match[2] } : null;
}

function parseJudgeJson(text: string): JudgeResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { score?: unknown; comment?: unknown; guess?: unknown };
    const score = Math.round(Number(parsed.score));
    const comment = typeof parsed.comment === "string" ? parsed.comment.trim().slice(0, 300) : "";
    if (!Number.isFinite(score) || !comment) return null;
    return {
      score: Math.max(1, Math.min(100, score)),
      comment,
      guess: typeof parsed.guess === "string" ? parsed.guess.trim().slice(0, 80) : undefined,
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
          { type: "text", text: buildPrompt(input.word, input.locale, input.mode) },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic_http_${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
  return (payload.content || []).filter((part) => part.type === "text").map((part) => part.text || "").join("");
}

async function callOpenAI(input: JudgeInput, signal: AbortSignal): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: buildPrompt(input.word, input.locale, input.mode) },
          { type: "image_url", image_url: { url: input.imageData, detail: "low" } },
        ],
      }],
    }),
  });
  if (!response.ok) throw new Error(`openai_http_${response.status}: ${(await response.text()).slice(0, 200)}`);
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
      : await callOpenAI(input, controller.signal);
    const result = parseJudgeJson(text);
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
