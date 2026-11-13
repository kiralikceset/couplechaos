/**
 * Switches the server can flip without an app update (Render → Environment).
 * PURCHASES=off hides the token shop and Premium and lifts the daily limit, e.g. while the
 * App Store paid-apps agreement or bank account is still pending.
 * The last value is cached so the app behaves the same offline; until the server has
 * answered once, purchases count as on.
 */
const PURCHASES_KEY = "cc_feature_purchases";
export const FEATURES_EVENT = "cc-features-changed";

export function purchasesEnabled(): boolean {
  try {
    return localStorage.getItem(PURCHASES_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Applies the server's answer. Pure apart from storage: tested. */
export function applyFeatures(features: { purchases?: unknown } | undefined): void {
  if (typeof features?.purchases !== "boolean") return; // older server: keep what we have
  const before = purchasesEnabled();
  try {
    localStorage.setItem(PURCHASES_KEY, features.purchases ? "1" : "0");
  } catch {
    return;
  }
  if (before !== features.purchases && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FEATURES_EVENT));
  }
}

export async function refreshFeatures(baseUrl: string): Promise<void> {
  if (!baseUrl) return;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`, { cache: "no-store" });
    const data = (await response.json()) as { features?: { purchases?: unknown } };
    applyFeatures(data?.features);
  } catch {
    /* offline: keep the cached value */
  }
}
