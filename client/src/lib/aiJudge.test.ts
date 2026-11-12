import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
});

const IMAGE = "data:image/jpeg;base64,AAAA";

describe("server AI judge", () => {
  it("is off without a key, so the game uses offline comments", async () => {
    const { judgeDrawing, isAiJudgeEnabled } = await import("../../../server/aiJudge");
    expect(isAiJudgeEnabled()).toBe(false);
    expect(await judgeDrawing({ imageData: IMAGE, word: "Kedi", locale: "tr" })).toBeNull();
  });

  it("sends the drawing to Claude and returns its roast", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    // 1st call (blind look, with the image), 2nd call (the joke, text only)
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({
      content: [{ type: "text", text: String(init?.body).includes("do NOT know")
        ? '{"guesses": [{"label": "potato", "confidence": 70}, {"label": "cat", "confidence": 30}], "looks_like": "a sad potato"}'
        : '{"recognisable": false, "guess": "üzgün patates", "comment": "Bu kedi değil, vergi borcu olan bir patates 🥔"}' }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    const { judgeDrawing } = await import("../../../server/aiJudge");
    const verdict = await judgeDrawing({ imageData: IMAGE, word: "Kedi", locale: "tr" });
    expect(verdict?.score).toBe(42); // "cat" was only the 2nd blind guess → 30% × 0.8, floor 42
    expect(verdict?.guess).toBe("üzgün patates");
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const [url, init] = calls.find(([, request]) => String(request.body).includes("do NOT know"))!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    const body = JSON.parse(String(init.body));
    expect(body.messages[0].content[0].source).toEqual({ type: "base64", media_type: "image/jpeg", data: "AAAA" });
    expect(JSON.stringify(body)).not.toContain("Kedi"); // the blind look never sees the word
  });

  it.each([
    ["GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"],
    ["GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions"],
  ])("uses the free %s provider through its OpenAI-compatible endpoint", async (envName, expectedUrl) => {
    process.env[envName] = "free-key";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({
      choices: [{ message: { content: String(init?.body).includes("do NOT know")
        ? "```json\n{\"guesses\": [{\"label\": \"cloud\", \"confidence\": 60}, {\"label\": \"cat\", \"confidence\": 50}], \"looks_like\": \"x\"}\n```"
        : "{\"recognisable\": false, \"comment\": \"Bu bir bulut mu kedi mi 🤔\"}" } }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    const { judgeDrawing } = await import("../../../server/aiJudge");
    const verdict = await judgeDrawing({ imageData: IMAGE, word: "Kedi", locale: "tr" });
    expect(verdict?.score).toBe(42);
    expect(verdict?.comment).toContain("bulut"); // no "recognisable" field → the joke is kept
    const [url, init] = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>).find(([, request]) => String(request.body).includes("do NOT know"))!;
    expect(url).toBe(expectedUrl);
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer free-key");
    const body = JSON.parse(String(init.body));
    expect(body.response_format).toBeUndefined();
    expect(body.messages[0].content[1].image_url).toEqual({ url: IMAGE });
  });

  it("falls back (null) when the AI errors, never blocking the round", async () => {
    process.env.OPENAI_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const { judgeDrawing } = await import("../../../server/aiJudge");
    expect(await judgeDrawing({ imageData: IMAGE, word: "Kedi", locale: "en" })).toBeNull();
  });

  it("keeps the joke when its tone matches the fair score", async () => {
    process.env.GROQ_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({
      choices: [{ message: { content: String(init?.body).includes("do NOT know")
        ? '{"guesses": [{"label": "cage", "confidence": 80}, {"label": "grid", "confidence": 60}], "looks_like": "a cage"}'
        : '{"recognisable": false, "guess": "kaçak kafes", "comment": "Ruhumu bu hücreye hapsettiniz ⛓️"}' } }],
    }))));
    const { judgeDrawing } = await import("../../../server/aiJudge");
    const verdict = await judgeDrawing({ imageData: IMAGE, word: "Bal", locale: "tr" });
    expect(verdict?.score).toBeLessThan(20);
    expect(verdict?.comment).toContain("hücreye");
  });
});
