import { afterEach, describe, expect, it, vi } from "vitest";
import { translations, type Locale } from "./i18n";
import { CATEGORIES, dailyKey, lookAlikeIds, findWordEmoji, msUntilNextDailyWord, getAllWords, getCategoryWordCount, getDailyWord, getDistractors, getRandomWord, getTotalWordCount, normalizeCategory, pickWord, resetUsedWords } from "./wordPool";

afterEach(() => {
  resetUsedWords();
  vi.useRealTimers();
});

describe("word pool", () => {
  it("contains the complete categorized and localized pool", () => {
    expect(getTotalWordCount()).toBe(165);
    expect(getCategoryWordCount("mixed")).toBe(165);
    for (const category of CATEGORIES.filter((item) => item.id !== "mixed")) expect(getCategoryWordCount(category.id)).toBeGreaterThanOrEqual(19);
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
    // The old single-object list is gone; scenes are short enough for the guess buttons.
    for (const banned of ["Kedi", "Köpek", "Elma", "Araba", "Peynir", "Demokrasi", "Kaka"]) expect(findWordEmoji(banned)).toBe("");
    for (const entry of getAllWords()) {
      for (const value of [entry.tr, entry.en, entry.de, entry.es]) {
        expect(value.length).toBeLessThanOrEqual(36);
        expect(value.split(/\s+/).length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("returns the reference emoji in any language", () => {
    expect(findWordEmoji("Klavyedeki kedi")).toBe("⌨️");
    expect(findWordEmoji("cat on the keyboard")).toBe("⌨️");
    expect(findWordEmoji("Katze auf der Tastatur")).toBe("⌨️");
    const picked = pickWord("pets", "es");
    expect(findWordEmoji(picked.word)).toBe(picked.emoji);
  });

  it("themes hold what they say, and old ids still work", () => {
    expect(normalizeCategory("funny")).toBe("mixed");
    expect(normalizeCategory("romantic")).toBe("love");
    expect(normalizeCategory("animals")).toBe("pets"); // theme from an older app version
    expect(normalizeCategory("vehicles")).toBe("travel");
    expect(normalizeCategory("pets")).toBe("pets");
    expect(pickWord("daily", "tr").category).toBe("mixed");
    // distractors come from the scene's own theme: a pets scene only gets other pets scenes
    const options = getDistractors("Klavyedeki kedi", "mixed", "tr", 100);
    expect(options.length).toBe(19);
    expect(options).toContain("Çorap çalan köpek");
    expect(options).not.toContain("Kaybolan valiz");
    expect(getDistractors("Lost luggage", "travel", "en", 5)).toHaveLength(5);
  });

  it("never offers look-alike scenes as guess options", () => {
    for (let run = 0; run < 30; run++) {
      expect(getDistractors("Kaybolan valiz", "travel", "tr", 5)).not.toContain("Kapanmayan valiz");
      const hearts = getDistractors("Broken heart", "love", "en", 100);
      expect(hearts).not.toEqual(expect.arrayContaining(["Heart carved in a tree"]));
      expect(hearts).not.toContain("Latte art heart");
      expect(getDistractors("Fuegos artificiales", "special", "es", 100)).not.toContain("Cuenta atrás de Año Nuevo");
    }
    // every scene still gets five fair wrong answers
    for (const word of getAllWords()) expect(getDistractors(word.en, "mixed", "en", 5)).toHaveLength(5);
  });

  it("keeps scenes you can actually draw: no feelings or vague ideas", () => {
    // replaced after play tests: a mood or a concept has nothing to draw in 20 seconds
    for (const vague of ["Küs sevgililer", "Kıskanç sevgili", "Balayı", "Kör randevu", "Pijama günü", "Hediyelik eşya avı", "Diyet ama pasta"]) {
      expect(findWordEmoji(vague)).toBe("");
    }
    // the love theme's many hearts never compete with each other as answers
    for (let run = 0; run < 20; run++) expect(getDistractors("Cupid's arrow", "love", "en", 100)).not.toContain("Broken heart");
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

  it("scenes stay clean: no alcohol, nothing sexual", () => {
    const words = new Set(getAllWords().flatMap((word) => [word.tr, word.en, word.de, word.es].join(" ").toLocaleLowerCase("tr").split(/[^\p{L}]+/u)));
    for (const banned of ["beer", "wine", "drunk", "sexy", "nude", "bira", "şarap", "sarhoş", "bier", "wein", "cerveza", "vino"]) expect(words.has(banned)).toBe(false);
  });
;
});
