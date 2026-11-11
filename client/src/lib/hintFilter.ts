/**
 * Blocks hints that give the secret word away.
 * Used on the phone (instant feedback) AND on the server (can't be bypassed).
 *
 * Catches: the word itself, with suffixes ("peynirli"), spelled with spaces or
 * dots ("p e y n i r"), Turkish letters swapped for ASCII ("peynır"/"peynir"),
 * mixed case, and the word in the other game languages ("cheese", "Käse").
 */
import { getAllWords } from "./wordPool";

const FOLD: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u",
  ä: "a", ß: "ss", é: "e", è: "e", ê: "e", á: "a", à: "a", í: "i", ó: "o", ú: "u", ñ: "n",
};

/** lowercase (Turkish-aware), fold accents, keep only letters/digits. */
export function foldText(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .split("")
    .map((ch) => FOLD[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function tokensOf(value: string): string[] {
  return value
    .split(/[\s\-'’]+/)
    .map(foldText)
    .filter((token) => token.length >= 3);
}

/** Root used for matching: long words also match without their last letter (Turkish suffixes, typos). */
function roots(token: string): string[] {
  return token.length >= 6 ? [token, token.slice(0, -1)] : [token];
}

/** All spellings of the secret word to block (this language + translations). */
export function forbiddenRoots(word: string): string[] {
  const folded = foldText(word);
  const entry = getAllWords().find((item) => [item.tr, item.en, item.de, item.es].some((value) => foldText(value) === folded));
  const variants = entry ? [entry.tr, entry.en, entry.de, entry.es] : [word];
  const result = new Set<string>();
  for (const variant of variants) {
    for (const token of tokensOf(variant)) roots(token).forEach((root) => result.add(root));
    const whole = foldText(variant);
    if (whole.length >= 3) result.add(whole);
  }
  return Array.from(result);
}

/** Hint split into words; runs of single letters ("k e d i") are joined back together. */
function hintTokens(hint: string): string[] {
  const raw = hint.split(/[^0-9A-Za-z\u00C0-\u024F]+/).map(foldText).filter(Boolean);
  const out: string[] = [];
  let letters = "";
  for (const token of raw) {
    if (token.length === 1) {
      letters += token;
      continue;
    }
    if (letters.length > 1) out.push(letters);
    letters = "";
    out.push(token);
  }
  if (letters.length > 1) out.push(letters);
  return out;
}

/** Turkish case/plural/possessive endings (ASCII-folded) that may follow a short word. */
const SHORT_SUFFIX = /^(lar|ler)?(i|u|a|e|si|su|yi|yu|ya|ye|nin|nun|in|un|de|da|te|ta|den|dan|ten|tan|li|lu|siz|suz|ci|cu|cik|ciklar|cikler|yla|yle|la|le|sini|sunu|ini|unu|ler|lar)?$/;

/** True when the hint contains the secret word (or its root / a translation). */
export function hintRevealsWord(hint: string, word: string): boolean {
  const squashed = foldText(hint);
  if (!squashed) return false;
  const tokens = hintTokens(hint);
  const shortWord = foldText(word);
  // Very short words ("At", "Ay", "Ev"): only the exact word counts.
  if (shortWord.length > 0 && shortWord.length < 3 && tokens.includes(shortWord)) return true;
  return forbiddenRoots(word).some((root) =>
    root.length >= 5
      ? squashed.includes(root) // long: catches suffixes, spacing, punctuation tricks
      : tokens.some((token) => token.startsWith(root) && SHORT_SUFFIX.test(token.slice(root.length))) || squashed === root,
  );
}
