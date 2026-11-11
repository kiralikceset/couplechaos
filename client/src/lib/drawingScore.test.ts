import { describe, expect, it } from "vitest";
import { scoreDrawingMetrics } from "./drawingScore";

describe("scoreDrawingMetrics", () => {
  it("gives an empty canvas a minimal score", () => {
    expect(scoreDrawingMetrics({
      coverage: 0,
      boundsCoverage: 0,
      occupiedCells: 0,
      colorVariety: 0,
      edgeDensity: 0,
    })).toBe(3);
  });

  it("rewards a drawing that uses the canvas with visible detail", () => {
    const score = scoreDrawingMetrics({
      coverage: 0.18,
      boundsCoverage: 0.58,
      occupiedCells: 0.72,
      colorVariety: 0.4,
      edgeDensity: 0.18,
    });

    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("keeps sparse scribbles below a complete drawing", () => {
    const sparse = scoreDrawingMetrics({
      coverage: 0.01,
      boundsCoverage: 0.08,
      occupiedCells: 0.08,
      colorVariety: 0,
      edgeDensity: 0.01,
    });
    const complete = scoreDrawingMetrics({
      coverage: 0.14,
      boundsCoverage: 0.5,
      occupiedCells: 0.6,
      colorVariety: 0.3,
      edgeDensity: 0.15,
    });

    expect(sparse).toBeLessThan(complete);
  });

  it("always clamps even extreme metric inputs to the public 1-100 range", () => {
    expect(scoreDrawingMetrics({
      coverage: 100,
      boundsCoverage: 100,
      occupiedCells: 100,
      colorVariety: 100,
      edgeDensity: 100,
    })).toBeLessThanOrEqual(100);
    expect(scoreDrawingMetrics({
      coverage: -1,
      boundsCoverage: -1,
      occupiedCells: -1,
      colorVariety: -1,
      edgeDensity: -1,
    })).toBe(3);
  });
});
