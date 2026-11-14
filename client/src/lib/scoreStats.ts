/**
 * The player's drawing scores on this device: average of the recent rounds and the best ever.
 * Shown on the result screen so each round reads against your own progress.
 */
const HISTORY_KEY = "cc_score_history";
const BEST_KEY = "cc_score_best";
const KEEP = 20;

interface Entry {
  s: number;
  k: string;
}

export interface ScoreSummary {
  /** Average of the last rounds, including this one. */
  average: number;
  /** Best score ever, including this one. */
  best: number;
  /** This round beat the previous best (never on the very first round). */
  newBest: boolean;
  rounds: number;
}

function readHistory(): Entry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((e) => e && Number.isFinite(e.s) && typeof e.k === "string").map((e) => ({ s: Math.max(0, Math.min(100, Math.round(e.s))), k: e.k }))
      : [];
  } catch {
    return [];
  }
}

function readBest(): number {
  const best = Number(localStorage.getItem(BEST_KEY));
  return Number.isFinite(best) ? Math.max(0, Math.min(100, best)) : 0;
}

/**
 * Records a round's score once (the key stops double counting when the screen re-renders or
 * reopens) and returns the summary. Never throws.
 */
export function recordScore(score: number, key: string): ScoreSummary {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  try {
    let history = readHistory();
    let best = readBest();
    const seen = history.some((entry) => entry.k === key);
    const previousBest = seen ? Number(localStorage.getItem(`${BEST_KEY}_before`)) || 0 : best;
    if (!seen) {
      localStorage.setItem(`${BEST_KEY}_before`, String(best));
      history = [...history, { s: value, k: key }].slice(-KEEP);
      best = Math.max(best, value);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      localStorage.setItem(BEST_KEY, String(best));
    }
    const average = Math.round(history.reduce((sum, entry) => sum + entry.s, 0) / Math.max(1, history.length));
    return { average, best, newBest: history.length > 1 && value > previousBest, rounds: history.length };
  } catch {
    return { average: value, best: value, newBest: false, rounds: 1 };
  }
}
