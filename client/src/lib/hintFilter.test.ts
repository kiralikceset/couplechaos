import { describe, expect, it } from "vitest";
import { hintRevealsWord } from "./hintFilter";

describe("hint filter", () => {
  it.each([
    ["peynir", "Peynir"],
    ["PEYNİRLİ tost", "Peynir"],
    ["p e y n i r", "Peynir"],
    ["p.e.y.n.i.r", "Peynir"],
    ["peynır gibi", "Peynir"],
    ["battaniye için kavga", "Battaniye kavgası"],
    ["in english: blanket", "Battaniye kavgası"],
    ["Decke!", "Battaniye kavgası"],
    ["kedi bilgisayarda", "Klavyedeki kedi"],
    ["a cat sits there", "Klavyedeki kedi"],
    ["keyboard", "Klavyedeki kedi"],
    ["kediler miyavlar", "Kedi"],
    ["k e d i", "Kedi"],
    ["bir maymunun yemeği", "Maymun"],
    ["at gibi koşar", "At"],
    ["ADA", "Ada"],
    ["doğum günü", "Doğum günü pastası"],
    ["pastası var", "Doğum günü pastası"],
  ])("blocks %j for %s", (hint, word) => {
    expect(hintRevealsWord(hint, word)).toBe(true);
  });

  it.each([
    ["sarı ve delikli", "Peynir"],
    ["miyavlar", "Kedi"],
    ["kaplan gibi ama küçük", "Kedi"],
    ["adam gibi", "Ada"],
    ["kat kat", "At"],
    ["ilk harf: P", "Peynir"],
    ["6 harfli", "Peynir"],
    ["muz sever", "Maymun"],
    // little words shared by many scenes never count as giving one away
    ["the computer is busy", "Cat on the keyboard"],
    ["sits on the desk and purrs", "Klavyedeki kedi"],
    ["und dann", "Kampf um die Decke"],
    ["con amigos", "Pelea por la manta"],
    ["bir yatak iki kişi", "Battaniye kavgası"],
  ])("allows %j for %s", (hint, word) => {
    expect(hintRevealsWord(hint, word)).toBe(false);
  });
});
