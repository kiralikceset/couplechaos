/**
 * Asks for a store rating right after a happy moment (correct guess or a high score),
 * at most 3 times, never more than once every 45 days, and only after a few games.
 * The stores themselves also limit how often the dialog really appears.
 */
const KEY = "cc_review";
const MIN_GAMES = 3;
const GAP_DAYS = 45;
const MAX_ASKS = 3;

interface ReviewState { asks: number; last: number }

function read(): ReviewState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<ReviewState>;
    return { asks: Number(parsed.asks) || 0, last: Number(parsed.last) || 0 };
  } catch {
    return { asks: 0, last: 0 };
  }
}

export function shouldAskForReview(happy: boolean, gamesPlayed: number, now = Date.now()): boolean {
  if (!happy || gamesPlayed < MIN_GAMES) return false;
  const state = read();
  return state.asks < MAX_ASKS && now - state.last > GAP_DAYS * 86_400_000;
}

export async function maybeAskForReview(happy: boolean, gamesPlayed: number): Promise<void> {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!capacitor?.isNativePlatform?.() || !shouldAskForReview(happy, gamesPlayed)) return;
  const state = read();
  try {
    localStorage.setItem(KEY, JSON.stringify({ asks: state.asks + 1, last: Date.now() }));
  } catch {
    /* ignore */
  }
  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
  } catch {
    // Not available on this device: nothing to do.
  }
}
