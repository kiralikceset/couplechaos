import { describe, expect, it, beforeEach } from "vitest";

// Node test env: in-memory localStorage and a window that can dispatch events.
const memory = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, String(value)),
  removeItem: (key: string) => void memory.delete(key),
  clear: () => memory.clear(),
};
(globalThis as { window?: unknown }).window ??= { dispatchEvent: () => true };
import { getTokens } from "./tokens";
import { canBuyTokens, grantTransaction, TOKEN_PACKS } from "./tokenStore";

describe("token purchases", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("cc_tokens", "10");
  });

  it("adds a pack's tokens once per transaction", () => {
    const pack = TOKEN_PACKS[1];
    expect(grantTransaction({ transactionId: "2000001", productIdentifier: pack.id })).toBe(pack.tokens);
    expect(getTokens()).toBe(10 + pack.tokens);
    // StoreKit redelivers the same transaction (relaunch, listener): nothing more is added.
    expect(grantTransaction({ transactionId: "2000001", productIdentifier: pack.id })).toBe(0);
    expect(getTokens()).toBe(10 + pack.tokens);
    // A second, separate purchase of the same pack counts again.
    expect(grantTransaction({ transactionId: "2000002", productIdentifier: pack.id })).toBe(pack.tokens);
    expect(getTokens()).toBe(10 + pack.tokens * 2);
  });

  it("never grants unverified, unknown or id-less transactions", () => {
    expect(grantTransaction({ transactionId: "1", productIdentifier: TOKEN_PACKS[0].id, verificationError: "bad signature" })).toBe(0);
    expect(grantTransaction({ transactionId: "2", productIdentifier: "com.other.app.coins" })).toBe(0);
    expect(grantTransaction({ productIdentifier: TOKEN_PACKS[0].id })).toBe(0);
    expect(getTokens()).toBe(10);
  });

  it("only sells inside the native app", () => {
    expect(canBuyTokens()).toBe(false);
  });

  it("offers three distinct packs", () => {
    expect(TOKEN_PACKS.map((pack) => pack.tokens)).toEqual([60, 200, 500]);
    expect(new Set(TOKEN_PACKS.map((pack) => pack.id)).size).toBe(3);
  });
});
