import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});

import { recordScore } from "./scoreStats";

beforeEach(() => storage.clear());

describe("score stats", () => {
  it("averages recent rounds and tracks the best", () => {
    expect(recordScore(60, "a")).toMatchObject({ average: 60, best: 60, newBest: false, rounds: 1 });
    expect(recordScore(80, "b")).toMatchObject({ average: 70, best: 80, newBest: true });
    expect(recordScore(40, "c")).toMatchObject({ average: 60, best: 80, newBest: false });
  });

  it("counts a round once even if the result screen shows again", () => {
    recordScore(50, "a");
    recordScore(90, "b");
    expect(recordScore(90, "b")).toMatchObject({ average: 70, best: 90, newBest: true, rounds: 2 });
  });

  it("keeps only the last 20 rounds in the average", () => {
    for (let i = 0; i < 20; i++) recordScore(10, `old${i}`);
    for (let i = 0; i < 20; i++) recordScore(50, `new${i}`);
    expect(recordScore(50, "last")).toMatchObject({ average: 50, best: 50, rounds: 20 });
  });

  it("survives broken storage", () => {
    storage.set("cc_score_history", "{oops");
    storage.set("cc_score_best", "abc");
    expect(recordScore(70, "x")).toMatchObject({ average: 70, best: 70, rounds: 1 });
  });
});
