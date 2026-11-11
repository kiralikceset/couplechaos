/**
 * Premium / Monetization System
 * Freemium model: Free basic play, premium unlocks categories + features
 * 
 * Free tier:
 * - Daily, Romantic, Funny categories
 * - 5 games per day
 * - Basic sharing
 * - Ads between rounds
 * 
 * Premium tier:
 * - All categories (Hard, Spicy)
 * - Unlimited games
 * - No ads
 * - Custom themes
 * - Priority AI comments
 * - Exclusive achievements
 * - Couple stats & analytics
 */

const PREMIUM_KEY = "couple_chaos_premium";
const GAMES_TODAY_KEY = "couple_chaos_games_today";
const FREE_DAILY_LIMIT = 5;
const BILLING_ENABLED = import.meta.env.VITE_GOOGLE_PLAY_BILLING_ENABLED === "true";

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
    // Billing state must never make the rest of the app unusable.
  }
}

export function isBillingEnabled(): boolean {
  return BILLING_ENABLED;
}

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: string | null;
  plan: "free" | "weekly" | "monthly" | "yearly";
}

export function getPremiumStatus(): PremiumStatus {
  const stored = readStoredObject(PREMIUM_KEY);
  if (!stored) return { isPremium: false, expiresAt: null, plan: "free" };
  const allowedPlans: PremiumStatus["plan"][] = ["free", "weekly", "monthly", "yearly"];
  const status: PremiumStatus = {
    isPremium: Boolean(stored.isPremium),
    expiresAt: typeof stored.expiresAt === "string" ? stored.expiresAt : null,
    plan: allowedPlans.includes(stored.plan as PremiumStatus["plan"])
      ? stored.plan as PremiumStatus["plan"]
      : "free",
  };
  
  // Check expiration
  const expiration = status.expiresAt ? new Date(status.expiresAt).getTime() : null;
  if (expiration !== null && (!Number.isFinite(expiration) || expiration <= Date.now())) {
    status.isPremium = false;
    status.plan = "free";
    status.expiresAt = null;
    writeStoredObject(PREMIUM_KEY, status);
  }
  
  return status;
}

export function isPremiumUser(): boolean {
  return getPremiumStatus().isPremium;
}

export function arePremiumFeaturesUnlocked(): boolean {
  return !BILLING_ENABLED || isPremiumUser();
}

// Games today tracking
export function getGamesToday(): number {
  const data = readStoredObject(GAMES_TODAY_KEY);
  if (!data) return 0;
  const today = localDateKey();
  if (data.date !== today) return 0;
  const count = Math.floor(Number(data.count));
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export function incrementGamesToday(): number {
  const today = localDateKey();
  const current = getGamesToday();
  const newCount = current + 1;
  writeStoredObject(GAMES_TODAY_KEY, { date: today, count: newCount });
  return newCount;
}

export function canPlayFree(): boolean {
  if (arePremiumFeaturesUnlocked()) return true;
  return getGamesToday() < FREE_DAILY_LIMIT;
}

export function getRemainingFreeGames(): number {
  if (arePremiumFeaturesUnlocked()) return Infinity;
  return Math.max(0, FREE_DAILY_LIMIT - getGamesToday());
}

// Premium pricing (for display)
export const PREMIUM_PLANS = [
  {
    id: "weekly",
    nameKey: "premium.weekly",
    price: "$2.99",
    pricePerWeek: "$2.99",
    popular: false,
    savings: "",
  },
  {
    id: "monthly",
    nameKey: "premium.monthly",
    price: "$7.99",
    pricePerWeek: "$1.99",
    popular: true,
    savings: "33%",
  },
  {
    id: "yearly",
    nameKey: "premium.yearly",
    price: "$39.99",
    pricePerWeek: "$0.77",
    popular: false,
    savings: "74%",
  },
];

// Premium features list
export const PREMIUM_FEATURES = [
  { emoji: "🧠", key: "premium.feat.hardWords" },
  { emoji: "🌶️", key: "premium.feat.spicyWords" },
  { emoji: "♾️", key: "premium.feat.unlimited" },
  { emoji: "🚫", key: "premium.feat.noAds" },
  { emoji: "🎨", key: "premium.feat.themes" },
  { emoji: "📊", key: "premium.feat.stats" },
  { emoji: "🏆", key: "premium.feat.achievements" },
  { emoji: "⚡", key: "premium.feat.priority" },
];

// Check if a category is locked
export function isCategoryLocked(categoryId: string): boolean {
  if (arePremiumFeaturesUnlocked()) return false;
  return false; // every theme is free in v1 (categoryId kept for a future premium pack)
}
