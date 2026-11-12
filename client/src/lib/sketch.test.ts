import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { sketchToPng } from "../../../server/sketch";
import { parseBotDrawing } from "../../../server/aiJudge";

describe("AI drawer", () => {
  it("renders strokes into a real PNG with ink where the line is", () => {
    const url = sketchToPng([{ color: "#FFFFFF", points: [[0.1, 0.5], [0.9, 0.5]] }]);
    const png = Buffer.from(url.split(",")[1], "base64");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(300); // width
    const idatStart = png.indexOf("IDAT") + 4;
    const length = png.readUInt32BE(idatStart - 8);
    const rows = inflateSync(png.subarray(idatStart, idatStart + length));
    const row = 200 * (300 * 3 + 1);
    expect(rows[row + 1 + 150 * 3]).toBe(255); // middle of the line is white
    expect(rows[row + 1 + 5 * 3]).toBe(10); // far left stays background
  });

  it("only accepts a guess from the options and keeps points on the canvas", () => {
    const parsed = parseBotDrawing('ok {"guess": "kedi", "strokes": [[[10,10],[200,-5],[50,65]], [[1,1]]]}', ["Köpek", "Kedi"]);
    expect(parsed?.guess).toBe("Kedi");
    expect(parsed?.strokes).toEqual([[[0.1, 0.077], [1, 0], [0.5, 0.5]]]);
    expect(parseBotDrawing('{"guess": "Fil", "strokes": [[[1,1],[2,2]]]}', ["Kedi"])).toBeNull();
  });
});
