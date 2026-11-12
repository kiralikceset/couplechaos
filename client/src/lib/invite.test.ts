import { describe, expect, it, beforeEach } from "vitest";

// Node test env: a tiny in-memory localStorage.
const memory = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, String(value)),
  removeItem: (key: string) => void memory.delete(key),
  clear: () => memory.clear(),
};
import { codeFromUrl, inviteUrl } from "./invite";
import { shouldAskForReview } from "./review";

describe("invite links", () => {
  it("reads the room code from /join/CODE and ?join=CODE", () => {
    expect(codeFromUrl("https://couple-chaos-server.onrender.com/join/ABC234")).toBe("ABC234");
    expect(codeFromUrl("https://x.app/join/abc234/")).toBe("ABC234");
    expect(codeFromUrl("https://x.app/?join=QWE789")).toBe("QWE789");
    expect(codeFromUrl("https://x.app/join/ABC0O1")).toBeNull(); // 0, O and 1 never appear in codes
    expect(codeFromUrl("https://x.app/")).toBeNull();
  });

  it("builds the public link from the server address", () => {
    expect(inviteUrl("ABC234", "https://couple-chaos-server.onrender.com/")).toBe("https://couple-chaos-server.onrender.com/join/ABC234");
  });
});

describe("store review prompt", () => {
  beforeEach(() => localStorage.clear());
  it("asks only after a happy moment and a few games, then waits 45 days", () => {
    expect(shouldAskForReview(true, 1)).toBe(false);
    expect(shouldAskForReview(false, 10)).toBe(false);
    expect(shouldAskForReview(true, 3)).toBe(true);
    localStorage.setItem("cc_review", JSON.stringify({ asks: 1, last: Date.now() }));
    expect(shouldAskForReview(true, 10)).toBe(false);
    expect(shouldAskForReview(true, 10, Date.now() + 46 * 86_400_000)).toBe(true);
    localStorage.setItem("cc_review", JSON.stringify({ asks: 3, last: 0 }));
    expect(shouldAskForReview(true, 10)).toBe(false);
  });
});
