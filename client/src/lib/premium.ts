/**
 * Couple Chaos Premium (auto-renewing subscription, Apple In-App Purchase).
 *
 * Free:    5 games a day (a game = one finished round). Joining a Premium player's room is free.
 * Premium: unlimited games, also for the partner in rooms the Premium player is in,
 *          100 bonus tokens every week, double tokens from playing.
 *
 * The App Store is the source of truth; the status is cached on the device with its expiry
 * so the app works offline and is refreshed at every launch and after every purchase.
 */
import { earnTokens } from "./tokens";
import { PREMIUM_PRODUCT_IDS, canBuyTokens, setSubscriptionHandler, storePlugin } from "./tokenStore";

export const FREE_DAILY_LIMIT = 5;
export const WEEKLY_BONUS_TOKENS = 100;
export const PREMIUM_TOKEN_MULTIPLIER = 2;
export const PREMIUM_EVENT = "cc-premium-changed";
/** Apple's standard licence agreement (Terms of Use) for apps without their own EULA. */
export const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

export type PlanId = "monthly" | "yearly";
export const PLAN_PRODUCT: Record<PlanId, string> = {
  monthly: PREMIUM_PRODUCT_IDS[0],
  yearly: PREMIUM_PRODUCT_IDS[1],
};

const PREMIUM_KEY = "couple_chaos_premium";
const GAMES_TODAY_KEY = "couple_chaos_games_today";
const BONUS_WEEK_KEY = "cc_premium_bonus_week";

function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readStoredObject(key: string): Record<string, unknown> | null {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredObject(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Premium state must never make the rest of the app unusable.
  }
}

/** True where Premium can actually be bought (the iPhone app). */
export function canBuyPremium(): boolean {
  return canBuyTokens();
}

export interface PremiumStatus {
  isPremium: boolean;
  /** ISO date the current period ends (renews or expires). */
  expiresAt: string | null;
  plan: PlanId | null;
  willRenew: boolean;
}

const FREE: PremiumStatus = { isPremium: false, expiresAt: null, plan: null, willRenew: false };

export function getPremiumStatus(now = Date.now()): PremiumStatus {
  const stored = readStoredObject(PREMIUM_KEY);
  if (!stored || !stored.isPremium) return { ...FREE };
  const expiresAt = typeof stored.expiresAt === "string" ? stored.expiresAt : null;
  const end = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(end) || end <= now) return { ...FREE };
  return {
    isPremium: true,
    expiresAt,
    plan: stored.plan === "monthly" || stored.plan === "yearly" ? stored.plan : null,
    willRenew: stored.willRenew !== false,
  };
}

export function isPremiumUser(): boolean {
  return getPremiumStatus().isPremium;
}

/** Kept for older call sites: premium features are unlocked for Premium users. */
export function arePremiumFeaturesUnlocked(): boolean {
  return isPremiumUser();
}

export function savePremiumStatus(status: PremiumStatus): void {
  const before = isPremiumUser();
  writeStoredObject(PREMIUM_KEY, status);
  if (typeof window !== "undefined" && before !== status.isPremium) {
    window.dispatchEvent(new CustomEvent(PREMIUM_EVENT, { detail: status.isPremium }));
  }
}

interface SubscriptionTransaction {
  productIdentifier?: string;
  expirationDate?: string;
  isActive?: boolean;
  revocationDate?: string;
  willCancel?: boolean | null;
  verificationError?: string;
}

/** Picks the active Premium subscription (latest expiry) out of App Store transactions. Pure: tested. */
export function statusFromTransactions(transactions: SubscriptionTransaction[], now = Date.now()): PremiumStatus {
  let best: PremiumStatus = { ...FREE };
  let bestEnd = 0;
  for (const transaction of transactions) {
    const plan = (Object.keys(PLAN_PRODUCT) as PlanId[]).find((id) => PLAN_PRODUCT[id] === transaction.productIdentifier);
    if (!plan || transaction.revocationDate || transaction.verificationError) continue;
    const end = transaction.expirationDate ? Date.parse(transaction.expirationDate) : NaN;
    if (!Number.isFinite(end) || end <= now || transaction.isActive === false) continue;
    if (end > bestEnd) {
      bestEnd = end;
      best = { isPremium: true, expiresAt: new Date(end).toISOString(), plan, willRenew: transaction.willCancel !== true };
    }
  }
  return best;
}

/** Asks the App Store for the current subscription and caches it. */
export async function refreshPremium(): Promise<PremiumStatus> {
  const store = await storePlugin();
  if (!store) return getPremiumStatus();
  try {
    const { PURCHASE_TYPE } = await import("@capgo/native-purchases");
    const { purchases } = await store.getPurchases({ productType: PURCHASE_TYPE.SUBS, onlyCurrentEntitlements: true });
    const status = statusFromTransactions(purchases);
    savePremiumStatus(status);
    return status;
  } catch {
    return getPremiumStatus(); // offline: keep the cached status until it expires
  }
}

let started = false;
/** At launch: refresh the subscription and hand out the weekly token bonus. */
export async function initPremium(onBonus?: (tokens: number) => void): Promise<void> {
  if (!started) {
    started = true;
    setSubscriptionHandler(() => {
      void refreshPremium().then(() => {
        const bonus = claimWeeklyBonus();
        if (bonus) onBonus?.(bonus);
      });
    });
  }
  await refreshPremium();
  const bonus = claimWeeklyBonus();
  if (bonus) onBonus?.(bonus);
}

export interface PremiumProduct {
  plan: PlanId;
  price: string;
  /** Numeric price and currency, for "per month" and savings maths. */
  amount: number;
  currency: string;
  /** Free-trial length in days when the player is eligible, else 0. */
  trialDays: number;
}

export async function loadPremiumProducts(): Promise<PremiumProduct[]> {
  const store = await storePlugin();
  if (!store) return [];
  const { PURCHASE_TYPE, INTRO_ELIGIBILITY_STATUS } = await import("@capgo/native-purchases");
  const { products } = await store.getProducts({ productIdentifiers: PREMIUM_PRODUCT_IDS, productType: PURCHASE_TYPE.SUBS });
  const result: PremiumProduct[] = [];
  for (const product of products) {
    const plan = (Object.keys(PLAN_PRODUCT) as PlanId[]).find((id) => PLAN_PRODUCT[id] === product.identifier);
    if (!plan) continue;
    const intro = product.introductoryPrice;
    const eligible = product.introEligibility !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE;
    let trialDays = 0;
    if (intro && eligible && intro.paymentMode === 2) {
      const unit = intro.subscriptionPeriod?.unitString;
      const units = (intro.subscriptionPeriod?.numberOfUnits || 0) * (intro.numberOfPeriods || 1);
      trialDays = unit === "week" ? units * 7 : unit === "month" ? units * 30 : unit === "day" ? units : 0;
    }
    result.push({ plan, price: product.priceString, amount: product.price, currency: product.currencyCode, trialDays });
  }
  return result;
}

export type PremiumResult = "subscribed" | "cancelled" | "pending" | "failed";

export async function buyPremium(plan: PlanId): Promise<PremiumResult> {
  const store = await storePlugin();
  if (!store) return "failed";
  try {
    const { PURCHASE_TYPE } = await import("@capgo/native-purchases");
    const transaction = await store.purchaseProduct({
      productIdentifier: PLAN_PRODUCT[plan],
      productType: PURCHASE_TYPE.SUBS,
      quantity: 1,
      autoAcknowledgePurchases: false,
    });
    if (!transaction?.transactionId) return "pending";
    if (transaction.verificationError) return "failed";
    await store.finishTransaction({ transactionId: transaction.transactionId }).catch(() => undefined);
    const status = await refreshPremium();
    if (!status.isPremium) {
      // StoreKit sometimes lags a moment behind the purchase sheet.
      savePremiumStatus(statusFromTransactions([transaction]));
    }
    claimWeeklyBonus();
    return isPremiumUser() ? "subscribed" : "pending";
  } catch (error) {
    const text = String((error as { message?: string })?.message || error).toLowerCase();
    if (/cancel/.test(text)) return "cancelled";
    if (/pending|deferred|ask to buy/.test(text)) return "pending";
    return "failed";
  }
}

/** "Restore purchases": brings back Premium on a new phone or after reinstalling. */
export async function restorePremium(): Promise<boolean> {
  const store = await storePlugin();
  if (!store) return false;
  try {
    await store.restorePurchases();
  } catch {
    /* still read what we have */
  }
  return (await refreshPremium()).isPremium;
}

export async function manageSubscription(): Promise<void> {
  const store = await storePlugin();
  await store?.manageSubscriptions().catch(() => undefined);
}

// ── Weekly bonus ──────────────────────────────────────────────────────────
/** Monday-based week key, e.g. "2026-11-09". */
export function weekKey(date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  return localDateKey(monday);
}

/** Gives the weekly Premium tokens once per week. Returns the tokens added (0 if not due). */
export function claimWeeklyBonus(now = new Date()): number {
  if (!isPremiumUser()) return 0;
  const week = weekKey(now);
  try {
    if (localStorage.getItem(BONUS_WEEK_KEY) === week) return 0;
    localStorage.setItem(BONUS_WEEK_KEY, week);
  } catch {
    return 0;
  }
  earnTokens(WEEKLY_BONUS_TOKENS);
  return WEEKLY_BONUS_TOKENS;
}

export function tokenMultiplier(): number {
  return isPremiumUser() ? PREMIUM_TOKEN_MULTIPLIER : 1;
}

// ── Free games per day ───────────────────────────────────────────────────
export function getGamesToday(now = new Date()): number {
  const data = readStoredObject(GAMES_TODAY_KEY);
  if (!data || data.date !== localDateKey(now)) return 0;
  const count = Math.floor(Number(data.count));
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

/** Counts a finished round. Rounds in a Premium player's room are free and not counted. */
export function recordFreeGame(premiumRoom: boolean, now = new Date()): number {
  if (premiumRoom || isPremiumUser()) return getGamesToday(now);
  const count = getGamesToday(now) + 1;
  writeStoredObject(GAMES_TODAY_KEY, { date: localDateKey(now), count });
  return count;
}

/** May this player start a new game (create a room, play the AI, play again)? */
export function canPlayFree(now = new Date()): boolean {
  return isPremiumUser() || getGamesToday(now) < FREE_DAILY_LIMIT;
}

export function getRemainingFreeGames(now = new Date()): number {
  if (isPremiumUser()) return Infinity;
  return Math.max(0, FREE_DAILY_LIMIT - getGamesToday(now));
}

/** Milliseconds until the free games refill (local midnight). */
export function msUntilFreeGamesReset(now = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, midnight.getTime() - now.getTime());
}

/** Every theme stays free; Premium is about playing more, not locking content. */
export function isCategoryLocked(_categoryId: string): boolean {
  return false;
}
