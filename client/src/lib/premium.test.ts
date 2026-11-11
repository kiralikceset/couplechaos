import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});

import { getGamesToday, getPremiumStatus, incrementGamesToday } from "./premium";

beforeEach(() => storage.clear());

describe("premium persistence", () => {
  it("treats malformed state as a free account", () => {
    storage.set("couple_chaos_premium", "not-json");
    expect(getPremiumStatus()).toEqual({ isPremium: false, expiresAt: null, plan: "free" });
  });

  it("expires invalid or elapsed subscriptions", () => {
    storage.set("couple_chaos_premium", JSON.stringify({ isPremium: true, expiresAt: "invalid", plan: "monthly" }));
    expect(getPremiumStatus()).toEqual({ isPremium: false, expiresAt: null, plan: "free" });
  });

  it("counts games on the current local day and sanitizes invalid counts", () => {
    expect(incrementGamesToday()).toBe(1);
    expect(incrementGamesToday()).toBe(2);
    expect(getGamesToday()).toBe(2);
    storage.set("couple_chaos_games_today", JSON.stringify({ date: "1900-01-01", count: 999 }));
    expect(getGamesToday()).toBe(0);
    storage.set("couple_chaos_games_today", "{bad");
    expect(getGamesToday()).toBe(0);
  });
});
