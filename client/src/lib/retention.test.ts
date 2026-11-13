import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});
vi.stubGlobal("navigator", { language: "tr" });

import {
  addCategoryPlayed,
  checkNewAchievements,
  getCompatibilityScore,
  getDailyChallenge,
  getPlayerStats,
  getStreakData,
  getUnlockedAchievements,
  isStreakAtRisk,
  recordGamePlayed,
  setDailyChallenge,
  updateCompatibility,
} from "./retention";

beforeEach(() => storage.clear());

describe("retention calculations", () => {
  it("counts one streak day once and continues on the following local day", () => {
    const dayOne = new Date(2026, 8, 8, 23, 55);
    const dayTwo = new Date(2026, 8, 9, 0, 5);

    expect(recordGamePlayed(dayOne)).toMatchObject({ currentStreak: 1, totalGames: 1, totalDaysPlayed: 1 });
    expect(recordGamePlayed(dayOne)).toMatchObject({ currentStreak: 1, totalGames: 2, totalDaysPlayed: 1 });
    expect(isStreakAtRisk(dayTwo)).toBe(true);
    expect(recordGamePlayed(dayTwo)).toMatchObject({ currentStreak: 2, longestStreak: 2, totalGames: 3, totalDaysPlayed: 2 });
  });

  it("resets a missed streak without losing lifetime totals", () => {
    recordGamePlayed(new Date(2026, 8, 1, 12));
    const resumed = recordGamePlayed(new Date(2026, 8, 4, 12));
    expect(resumed).toMatchObject({ currentStreak: 1, longestStreak: 1, totalGames: 2, totalDaysPlayed: 2 });
  });

  it("recovers safely from corrupt saved data", () => {
    storage.set("couple_chaos_streak", "{broken");
    storage.set("couple_chaos_stats", JSON.stringify({ totalGames: -5, categoriesPlayed: "wrong" }));
    storage.set("couple_chaos_achievements", JSON.stringify({ bad: true }));
    expect(getStreakData()).toMatchObject({ currentStreak: 0, totalGames: 0 });
    expect(getPlayerStats().totalGames).toBe(0);
    expect(getPlayerStats().categoriesPlayed.size).toBe(0);
    expect(getUnlockedAchievements()).toEqual([]);
  });

  it("calculates compatibility from success rate and average completion time", () => {
    const first = updateCompatibility(true, 30);
    expect(first).toMatchObject({ totalRounds: 1, successfulGuesses: 1, averageTime: 30, score: 85 });

    const second = updateCompatibility(false, 60, true);
    expect(second.totalRounds).toBe(2);
    expect(second.successfulGuesses).toBe(1);
    expect(second.averageTime).toBe(45);
    expect(second.funnyMoments).toBe(1);
    expect(second.score).toBe(42.5);
    expect(getCompatibilityScore()).toEqual(second);
  });

  it("stores a daily challenge only until the daily word changes (08:00 UTC)", () => {
    const today = new Date(Date.UTC(2026, 8, 10, 7, 59));
    setDailyChallenge("Kalp", "romantic", today);
    expect(getDailyChallenge(today)).toMatchObject({ word: "Kalp", category: "romantic", completed: false, bonus: "daily" });
    // US evening of the 9th is still the same game day...
    expect(getDailyChallenge(new Date(Date.UTC(2026, 8, 10, 2, 0)))).not.toBeNull();
    // ...and it expires the moment the new word arrives.
    expect(getDailyChallenge(new Date(Date.UTC(2026, 8, 10, 8, 1)))).toBeNull();
  });

  it("unlocks achievements from real stored statistics without duplicates", () => {
    recordGamePlayed(new Date(2026, 8, 9, 12));
    addCategoryPlayed("daily");
    expect(checkNewAchievements().map((item) => item.id)).toContain("first_game");
    expect(checkNewAchievements()).toEqual([]);
  });
});
