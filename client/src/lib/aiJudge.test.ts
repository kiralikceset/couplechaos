import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
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
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      content: [{ type: "text", text: '{"score": 22, "guess": "üzgün patates", "comment": "Bu kedi değil, vergi borcu olan bir patates 🥔"}' }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    const { judgeDrawing } = await import("../../../server/aiJudge");
    const verdict = await judgeDrawing({ imageData: IMAGE, word: "Kedi", locale: "tr" });
    expect(verdict?.score).toBe(22);
    expect(verdict?.comment).toContain("patates");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    const body = JSON.parse(String(init.body));
    expect(body.messages[0].content[0].source).toEqual({ type: "base64", media_type: "image/jpeg", data: "AAAA" });
  });

  it("falls back (null) when the AI errors, never blocking the round", async () => {
    process.env.OPENAI_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const { judgeDrawing } = await import("../../../server/aiJudge");
    expect(await judgeDrawing({ imageData: IMAGE, word: "Kedi", locale: "en" })).toBeNull();
  });
});
