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
    // nothing abstract or crude, and every word fits a guess button
    for (const banned of ["Demokrasi", "Kaka", "Küs sevgililer"]) expect(findWordEmoji(banned)).toBe("");
    for (const entry of getAllWords()) {
      for (const value of [entry.tr, entry.en, entry.de, entry.es]) {
        expect(value.length).toBeLessThanOrEqual(36);
        expect(value.split(/\s+/).length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("returns the reference emoji in any language", () => {
    expect(findWordEmoji("Kedi")).toBe("🐈");
    expect(findWordEmoji("cat")).toBe("🐈");
    expect(findWordEmoji("Katze")).toBe("🐈");
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
    // distractors come from the word's own theme: a pets word only gets other pets words
    const options = getDistractors("Kedi", "mixed", "tr", 100);
    expect(options.length).toBe(17); // 20 pets, minus the cat and its two look-alikes (yarn, paw print)
    expect(options).toContain("Köpek");
    expect(options).not.toContain("Valiz");
    expect(getDistractors("Suitcase", "travel", "en", 3)).toHaveLength(3);
  });

  it("never offers look-alike scenes as guess options", () => {
    for (let run = 0; run < 30; run++) {
      expect(getDistractors("Valiz", "travel", "tr", 3)).not.toContain("Sırt çantası");
      const hearts = getDistractors("Broken heart", "love", "en", 100);
      expect(hearts).not.toContain("Heart");
      expect(hearts).not.toContain("Heart balloon");
      expect(getDistractors("Fuegos artificiales", "special", "es", 100)).not.toContain("Confeti");
    }
    // every word still gets three fair wrong answers that share no word with it
    for (const locale of ["tr", "en", "de", "es"] as const) {
      for (const word of getAllWords()) {
        const options = getDistractors(word[locale], "mixed", locale, 3);
        expect(options).toHaveLength(3);
        const mine = word[locale].toLocaleLowerCase("tr").split(/[^\p{L}]+/u).filter((part) => part.length >= 4);
        for (const option of options) for (const part of mine) expect(option.toLocaleLowerCase("tr").split(/[^\p{L}]+/u)).not.toContain(part);
      }
    }
  });

  it("keeps words you can actually draw: short, no feelings or vague ideas", () => {
    for (const word of getAllWords()) expect(word.tr.split(/\s+/).length).toBeLessThanOrEqual(3);
    // one simple thing per word: almost all are one or two words long
    expect(getAllWords().filter((word) => word.en.split(/\s+/).length > 2).length).toBeLessThanOrEqual(5);
    // replaced after play tests: a mood or a concept has nothing to draw in 20 seconds
    for (const vague of ["Küs sevgililer", "Kıskanç sevgili", "Balayı", "Kör randevu", "Pijama günü", "Hediyelik eşya avı", "Diyet ama pasta", "Kalp şeklinde pizza", "Kaşık pozisyonunda uyumak", "Teneke kutulu gelin arabası", "Klavyedeki kedi", "Battaniye kavgası"]) {
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
