/**
 * Buying hint tokens with Apple In-App Purchase (consumable products).
 *
 * Safety rules:
 * - Tokens are granted once per StoreKit transaction id (remembered on the device).
 * - A transaction is finished only after its tokens are granted, so a crash in between
 *   leaves it unfinished and it is granted on the next launch.
 * - Unverified transactions are never granted.
 */
import { earnTokens } from "./tokens";
import { purchasesEnabled } from "./features";

export interface TokenPack {
  id: string;
  tokens: number;
  badge?: "popular" | "best";
}

export const TOKEN_PACKS: TokenPack[] = [
  { id: "com.couplechaos.app.tokens60", tokens: 60 },
  { id: "com.couplechaos.app.tokens200", tokens: 200, badge: "popular" },
  { id: "com.couplechaos.app.tokens500", tokens: 500, badge: "best" },
];

export const TOKEN_SHOP_EVENT = "cc-token-shop";
const GRANTED_KEY = "cc_granted_transactions";
const MAX_REMEMBERED = 300;

export interface StoreProduct {
  id: string;
  price: string;
}

interface MinimalTransaction {
  transactionId?: string;
  productIdentifier?: string;
  verificationError?: string | null;
}

type Plugin = typeof import("@capgo/native-purchases")["NativePurchases"];

export function openTokenShop(): void {
  if (!purchasesEnabled()) return;
  window.dispatchEvent(new CustomEvent(TOKEN_SHOP_EVENT));
}

export function canBuyTokens(): boolean {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.()) && purchasesEnabled();
}

function readGranted(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(GRANTED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function rememberGranted(ids: string[]): void {
  try {
    localStorage.setItem(GRANTED_KEY, JSON.stringify(ids.slice(-MAX_REMEMBERED)));
  } catch {
    /* best effort */
  }
}

/**
 * Adds the tokens for a transaction exactly once. Returns the tokens added (0 when the
 * transaction is unknown, unverified or already granted). Pure apart from storage: tested.
 */
export function grantTransaction(transaction: MinimalTransaction): number {
  const id = transaction.transactionId;
  const pack = TOKEN_PACKS.find((item) => item.id === transaction.productIdentifier);
  if (!id || !pack || transaction.verificationError) return 0;
  const granted = readGranted();
  if (granted.includes(id)) return 0;
  rememberGranted([...granted, id]);
  earnTokens(pack.tokens);
  return pack.tokens;
}

/** Subscription product ids (Premium). Their transactions are finished here and handed to premium.ts. */
export const PREMIUM_PRODUCT_IDS = ["com.couplechaos.app.premium.monthly", "com.couplechaos.app.premium.yearly"];
let onSubscription: (() => void) | null = null;
export function setSubscriptionHandler(handler: () => void): void {
  onSubscription = handler;
}

let pluginPromise: Promise<Plugin | null> | null = null;
/** The StoreKit plugin (null on the web or when unavailable). Shared by tokens and Premium. */
export function storePlugin(): Promise<Plugin | null> {
  return plugin();
}
function plugin(): Promise<Plugin | null> {
  if (!canBuyTokens()) return Promise.resolve(null);
  pluginPromise ??= import("@capgo/native-purchases")
    .then(async ({ NativePurchases }) => {
      await NativePurchases.configure({ autoFinishTransactions: false });
      return NativePurchases;
    })
    .catch(() => null);
  return pluginPromise;
}

export async function settle(store: Plugin, transaction: MinimalTransaction): Promise<number> {
  if (transaction.transactionId && PREMIUM_PRODUCT_IDS.includes(transaction.productIdentifier || "")) {
    if (!transaction.verificationError) {
      await store.finishTransaction({ transactionId: transaction.transactionId }).catch(() => undefined);
    }
    onSubscription?.();
    return 0;
  }
  const added = grantTransaction(transaction);
  if (transaction.transactionId && TOKEN_PACKS.some((pack) => pack.id === transaction.productIdentifier)) {
    // Finish granted (or already granted) purchases so StoreKit stops redelivering them.
    if (!transaction.verificationError) {
      await store.finishTransaction({ transactionId: transaction.transactionId }).catch(() => undefined);
    }
  }
  return added;
}

/** On launch: grant purchases that were paid but not finished (crash, lost connection, Ask to Buy), finish subscription renewals. */
export async function initTokenStore(onGranted?: (tokens: number) => void): Promise<void> {
  const store = await plugin();
  if (!store) return;
  try {
    await store.addListener("transactionUpdated", (transaction) => {
      void settle(store, transaction).then((added) => { if (added) onGranted?.(added); });
    });
    const { transactions } = await store.getUnfinishedTransactions();
    for (const transaction of transactions) {
      const added = await settle(store, transaction);
      if (added) onGranted?.(added);
    }
  } catch {
    /* store unavailable: purchases are recovered on a later launch */
  }
}

export async function loadProducts(): Promise<StoreProduct[]> {
  const store = await plugin();
  if (!store) return [];
  const { products } = await store.getProducts({ productIdentifiers: TOKEN_PACKS.map((pack) => pack.id) });
  return products.map((product) => ({ id: product.identifier, price: product.priceString }));
}

export type BuyResult = { status: "bought"; tokens: number } | { status: "cancelled" } | { status: "pending" } | { status: "failed" };

export async function buyPack(pack: TokenPack): Promise<BuyResult> {
  const store = await plugin();
  if (!store) return { status: "failed" };
  try {
    const { PURCHASE_TYPE } = await import("@capgo/native-purchases");
    const transaction = await store.purchaseProduct({
      productIdentifier: pack.id,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1,
      isConsumable: true,
      autoAcknowledgePurchases: false,
    });
    if (!transaction?.transactionId) return { status: "pending" };
    if (transaction.verificationError) return { status: "failed" };
    const added = await settle(store, transaction);
    return { status: "bought", tokens: added || pack.tokens };
  } catch (error) {
    const text = String((error as { message?: string; code?: string })?.message || error).toLowerCase();
    if (/cancel/.test(text)) return { status: "cancelled" };
    if (/pending|deferred|ask to buy/.test(text)) return { status: "pending" };
    return { status: "failed" };
  }
}
