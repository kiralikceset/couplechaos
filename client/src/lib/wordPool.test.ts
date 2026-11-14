import { afterEach, describe, expect, it, vi } from "vitest";
import { translations, type Locale } from "./i18n";
import { CATEGORIES, dailyKey, lookAlikeIds, findWordEmoji, msUntilNextDailyWord, getAllWords, getCategoryWordCount, getDailyWord, getDistractors, getRandomWord, getTotalWordCount, normalizeCategory, pickWord, resetUsedWords } from "./wordPool";

afterEach(() => {
  resetUsedWords();
  vi.useRealTimers();
});

describe("word pool", () => {
  it("contains the complete categorized and localized pool", () => {
    expect(getTotalWordCount()).toBe(259);
    expect(getCategoryWordCount("mixed")).toBe(259);
    for (const category of CATEGORIES) expect(getCategoryWordCount(category.id)).toBeGreaterThan(0);
    for (const locale of ["tr", "en", "de", "es"] as Locale[]) {
      for (const category of CATEGORIES) expect(getRandomWord(category.id, locale).trim()).not.toBe("");
    }
  });

  it("changes the daily word at 08:00 UTC, never during a US or EU evening", () => {
    const at = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 10, h, m));
    // 7:59 UTC = 00:59 PDT / 3:59 EDT: still the 9th's word, same as the US evening before.
    expect(getDailyWord("en", at(7, 59))).toEqual(getDailyWord("en", new Date(Date.UTC(2026, 8, 9, 23, 30))));
    expect(getDailyWord("en", at(8, 0))).not.toEqual(getDailyWord("en", at(7, 59)));
    expect(dailyKey(at(7, 59))).toBe("2026-09-09");
    expect(dailyKey(at(8, 0))).toBe("2026-09-10");
    expect(msUntilNextDailyWord(at(7, 0))).toBe(3_600_000);
    expect(msUntilNextDailyWord(at(8, 0))).toBe(24 * 3_600_000);
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
    for (const banned of ["Demokrasi", "Nostalji", "Empati", "Güven", "Sadakat", "Özlem", "Dedikodu", "Müzik", "Kaka", "Sarhoş surat", "Horlayan adam"]) {
      expect(findWordEmoji(banned)).toBe("");
    }
  });

  it("returns the reference emoji in any language", () => {
    expect(findWordEmoji("Peynir")).toBe("🧀");
    expect(findWordEmoji("cheese")).toBe("🧀");
    expect(findWordEmoji("Käse")).toBe("🧀");
    const picked = pickWord("animals", "es");
    expect(findWordEmoji(picked.word)).toBe(picked.emoji);
  });

  it("themes hold what they say, and old ids still work", () => {
    expect(normalizeCategory("funny")).toBe("mixed");
    expect(normalizeCategory("romantic")).toBe("love");
    expect(normalizeCategory("animals")).toBe("animals");
    expect(pickWord("daily", "tr").category).toBe("mixed");
    // distractors come from the word's own theme: "Kedi" (cat) only gets other animals
    const options = getDistractors("Kedi", "mixed", "tr", 100);
    expect(options.length).toBe(34);
    expect(options).toContain("Köpek");
    expect(options).not.toContain("Pizza");
  });

  it("never offers look-alike words as guess options", () => {
    for (let run = 0; run < 30; run++) {
      expect(getDistractors("Öpücük", "love", "tr", 3)).not.toEqual(expect.arrayContaining(["Dudaklar"]));
      const moon = getDistractors("Moon", "places", "en", 100);
      expect(moon).not.toContain("Full moon");
      expect(moon).toContain("Sun");
      const car = getDistractors("Coche", "vehicles", "es", 100);
      expect(car).not.toContain("Taxi");
      expect(car).not.toContain("Coche de policía");
    }
    expect(getDistractors("Yıldız kayması", "places", "tr", 100)).not.toContain("Göktaşı");
    // even the smallest theme still has plenty of fair options
    for (const word of getAllWords()) expect(getDistractors(word.en, "mixed", "en", 3)).toHaveLength(3);
  });

  it("look-alike groups only point at real words", () => {
    const ids = new Set(getAllWords().map((word) => word.id));
    for (const word of getAllWords()) for (const id of lookAlikeIds(word.id)) expect(ids.has(id)).toBe(true);
  });

  it("every language has every word, once", () => {
    for (const locale of ["tr", "en", "de", "es"] as const) {
      const values = getAllWords().map((word) => word[locale].trim().toLocaleLowerCase("tr"));
      expect(values.every(Boolean)).toBe(true);
      expect(new Set(values).size).toBe(values.length);
    }
    expect(new Set(getAllWords().map((word) => word.id)).size).toBe(getAllWords().length);
  });

  it("nature & places holds no street furniture or holiday decorations", () => {
    expect(getDistractors("Güneş", "places", "tr", 100)).not.toEqual(expect.arrayContaining(["Trafik lambası", "Noel ağacı"]));
    expect(getDistractors("Anahtar", "objects", "tr", 100)).toEqual(expect.arrayContaining(["Trafik lambası", "Noel ağacı"]));
  });
});
