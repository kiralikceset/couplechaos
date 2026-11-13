import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});
vi.stubGlobal("window", { dispatchEvent: () => true });

import {
  FREE_DAILY_LIMIT,
  PLAN_PRODUCT,
  WEEKLY_BONUS_TOKENS,
  canPlayFree,
  claimWeeklyBonus,
  getGamesToday,
  getPremiumStatus,
  getRemainingFreeGames,
  recordFreeGame,
  savePremiumStatus,
  statusFromTransactions,
  tokenMultiplier,
  weekKey,
} from "./premium";
import { getTokens } from "./tokens";

const DAY = 86_400_000;
const premiumFor = (ms: number) =>
  savePremiumStatus({ isPremium: true, expiresAt: new Date(Date.now() + ms).toISOString(), plan: "yearly", willRenew: true });

beforeEach(() => storage.clear());

describe("premium status", () => {
  it("treats malformed or elapsed state as a free account", () => {
    storage.set("couple_chaos_premium", "not-json");
    expect(getPremiumStatus().isPremium).toBe(false);
    storage.set("couple_chaos_premium", JSON.stringify({ isPremium: true, expiresAt: "invalid", plan: "monthly" }));
    expect(getPremiumStatus().isPremium).toBe(false);
    premiumFor(-1000);
    expect(getPremiumStatus().isPremium).toBe(false);
    premiumFor(DAY);
    expect(getPremiumStatus()).toMatchObject({ isPremium: true, plan: "yearly" });
  });

  it("reads the active subscription from App Store transactions", () => {
    const now = Date.parse("2026-11-13T10:00:00Z");
    const later = (days: number) => new Date(now + days * DAY).toISOString();
    const status = statusFromTransactions([
      { productIdentifier: PLAN_PRODUCT.monthly, expirationDate: later(-3), isActive: false }, // old, expired
      { productIdentifier: PLAN_PRODUCT.yearly, expirationDate: later(300), isActive: true, willCancel: false },
      { productIdentifier: "com.other.app.sub", expirationDate: later(900) }, // not ours
    ], now);
    expect(status).toMatchObject({ isPremium: true, plan: "yearly", willRenew: true });
    expect(status.expiresAt).toBe(later(300));
  });

  it("ignores refunded, unverified and expired subscriptions", () => {
    const now = Date.parse("2026-11-13T10:00:00Z");
    const soon = new Date(now + DAY).toISOString();
    expect(statusFromTransactions([{ productIdentifier: PLAN_PRODUCT.monthly, expirationDate: soon, revocationDate: soon }], now).isPremium).toBe(false);
    expect(statusFromTransactions([{ productIdentifier: PLAN_PRODUCT.monthly, expirationDate: soon, verificationError: "bad" }], now).isPremium).toBe(false);
    expect(statusFromTransactions([{ productIdentifier: PLAN_PRODUCT.monthly, expirationDate: new Date(now - 1).toISOString() }], now).isPremium).toBe(false);
  });
});

describe("free games per day", () => {
  it(`allows ${FREE_DAILY_LIMIT} games a day, then asks for Premium`, () => {
    const now = new Date(2026, 10, 13, 20, 0);
    for (let i = 1; i <= FREE_DAILY_LIMIT; i++) {
      expect(canPlayFree(now)).toBe(true);
      expect(recordFreeGame(false, now)).toBe(i);
    }
    expect(canPlayFree(now)).toBe(false);
    expect(getRemainingFreeGames(now)).toBe(0);
    // Next day: a fresh set.
    expect(canPlayFree(new Date(2026, 10, 14, 9, 0))).toBe(true);
  });

  it("does not count rounds in a Premium player's room", () => {
    const now = new Date(2026, 10, 13, 20, 0);
    recordFreeGame(true, now);
    recordFreeGame(true, now);
    expect(getGamesToday(now)).toBe(0);
  });

  it("never limits Premium players", () => {
    premiumFor(DAY);
    const now = new Date();
    for (let i = 0; i < 20; i++) recordFreeGame(false, now);
    expect(canPlayFree(now)).toBe(true);
    expect(getRemainingFreeGames(now)).toBe(Infinity);
  });

  it("sanitizes broken counters", () => {
    storage.set("couple_chaos_games_today", "{bad");
    expect(getGamesToday()).toBe(0);
  });
});

describe("premium perks", () => {
  it("gives the weekly token bonus once per week, only to Premium", () => {
    storage.set("cc_tokens", "10");
    expect(claimWeeklyBonus(new Date(2026, 10, 13))).toBe(0); // free player
    premiumFor(30 * DAY);
    expect(claimWeeklyBonus(new Date(2026, 10, 13))).toBe(WEEKLY_BONUS_TOKENS);
    expect(claimWeeklyBonus(new Date(2026, 10, 15))).toBe(0); // same week (Sunday)
    expect(claimWeeklyBonus(new Date(2026, 10, 16))).toBe(WEEKLY_BONUS_TOKENS); // next Monday
    expect(getTokens()).toBe(10 + WEEKLY_BONUS_TOKENS * 2);
  });

  it("weeks start on Monday", () => {
    expect(weekKey(new Date(2026, 10, 13))).toBe("2026-11-09"); // Friday → Monday 9th
    expect(weekKey(new Date(2026, 10, 9))).toBe("2026-11-09");
    expect(weekKey(new Date(2026, 10, 8))).toBe("2026-11-02"); // Sunday belongs to the week before
  });

  it("doubles tokens earned for Premium", () => {
    expect(tokenMultiplier()).toBe(1);
    premiumFor(DAY);
    expect(tokenMultiplier()).toBe(2);
  });
});
