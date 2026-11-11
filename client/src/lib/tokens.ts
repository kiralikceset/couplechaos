/**
 * Hint tokens ("jeton"). Stored on the device.
 * Start with 20, spend on ready-made hints, earn by playing and guessing right.
 */
const KEY = "cc_tokens";
const START = 20;
export const TOKEN_EVENT = "cc-tokens-changed";

export const TOKEN_REWARD_ROUND = 2;
export const TOKEN_REWARD_CORRECT = 3;

export function getTokens(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return START;
    const value = Math.floor(Number(raw));
    return Number.isFinite(value) && value >= 0 ? value : START;
  } catch {
    return START;
  }
}

function setTokens(value: number): number {
  const next = Math.max(0, Math.min(9999, Math.floor(value)));
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    /* in-memory only */
  }
  window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: next }));
  return next;
}

/** Returns false (and spends nothing) when there aren't enough tokens. */
export function spendTokens(amount: number): boolean {
  const current = getTokens();
  if (amount > current) return false;
  setTokens(current - amount);
  return true;
}

export function earnTokens(amount: number): number {
  return setTokens(getTokens() + amount);
}
