import { afterEach, describe, expect, it, vi } from "vitest";
import { translations, type Locale } from "./i18n";
import { CATEGORIES, findWordEmoji, getAllWords, getCategoryWordCount, getDailyWord, getRandomWord, getTotalWordCount, pickWord, resetUsedWords } from "./wordPool";

afterEach(() => {
  resetUsedWords();
  vi.useRealTimers();
});

describe("word pool", () => {
  it("contains the complete categorized and localized pool", () => {
    expect(getTotalWordCount()).toBe(293);
    for (const category of CATEGORIES) expect(getCategoryWordCount(category.id)).toBeGreaterThan(0);
    for (const locale of ["tr", "en", "de", "es"] as Locale[]) {
      for (const category of CATEGORIES) expect(getRandomWord(category.id, locale).trim()).not.toBe("");
    }
  });

  it("uses one stable daily word per local date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 10));
    const first = getDailyWord("tr");
    expect(getDailyWord("tr")).toEqual(first);
    vi.setSystemTime(new Date(2026, 8, 10, 10));
    expect(getDailyWord("tr")).not.toEqual(first);
  });

  it("keeps every locale translation key in sync", () => {
    const englishKeys = Object.keys(translations.en).sort();
    for (const locale of ["tr", "de", "es"] as Locale[]) {
      expect(Object.keys(translations[locale]).sort()).toEqual(englishKeys);
      expect(Object.values(translations[locale]).every((value) => value.trim().length > 0)).toBe(true);
    }
  });

  it("every word is drawable: has an emoji, translations and no duplicates", () => {
    const seen = new Set<string>();
    for (const entry of getAllWords()) {
      expect(entry.emoji.length).toBeGreaterThan(0);
      for (const value of [entry.tr, entry.en, entry.de, entry.es]) expect(value.trim()).not.toBe("");
      expect(seen.has(entry.tr.toLowerCase())).toBe(false);
      seen.add(entry.tr.toLowerCase());
    }
    // Abstract words from the old list must be gone.
    for (const banned of ["Demokrasi", "Nostalji", "Empati", "Güven", "Sadakat", "Özlem", "Dedikodu", "Müzik"]) {
      expect(findWordEmoji(banned)).toBe("");
    }
  });

  it("returns the reference emoji in any language", () => {
    expect(findWordEmoji("Peynir")).toBe("🧀");
    expect(findWordEmoji("cheese")).toBe("🧀");
    expect(findWordEmoji("Käse")).toBe("🧀");
    const picked = pickWord("funny", "es");
    expect(findWordEmoji(picked.word)).toBe(picked.emoji);
  });
});
