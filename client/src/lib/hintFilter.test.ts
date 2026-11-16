import { describe, expect, it } from "vitest";
import { hintRevealsWord } from "./hintFilter";

describe("hint filter", () => {
  it.each([
    ["peynir", "Peynir"],
    ["PEYNİRLİ tost", "Peynir"],
    ["p e y n i r", "Peynir"],
    ["p.e.y.n.i.r", "Peynir"],
    ["peynır gibi", "Peynir"],
    ["tuvalette kullanılır", "Tuvalet kağıdı"],
    ["in english: toilet paper", "Tuvalet kağıdı"],
    ["Klopapier!", "Tuvalet kağıdı"],
    ["a cat sits there", "Kedi"],
    ["Katze", "Kedi"],
    ["ev gibi", "Ev"],
    ["evler", "Ev"],
    ["ayın ışığı", "Ay"],
    ["e v l e r", "Ev"],
    ["Eier zum Frühstück", "Ei"],
    ["TV izlersin", "Televizyon"],
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
    // little words shared by many words never count as giving one away
    ["the computer is busy", "Cat"],
    ["sits on the desk and purrs", "Kedi"],
    ["und dann", "Gebrochenes Herz"],
    ["con amigos", "Papel higiénico"],
    ["yatak odasında olur", "Horlama"],
    // two-letter words only match whole words, not the inside of other words
    ["devasa bir bina", "Ev"],
    ["gece gökyüzünde parlar", "Ay"],
    ["evet, orada yaşarsın", "Ev"],
    ["aynada görmezsin, gökte görürsün", "Ay"],
    ["eine Frühstücksspeise", "Ei"],
  ])("allows %j for %s", (hint, word) => {
    expect(hintRevealsWord(hint, word)).toBe(false);
  });
});
