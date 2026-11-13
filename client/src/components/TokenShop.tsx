import { useEffect, useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { getTokens, TOKEN_EVENT, TOKEN_REWARD_CORRECT, TOKEN_REWARD_ROUND } from "@/lib/tokens";
import { buyPack, canBuyTokens, loadProducts, TOKEN_PACKS, TOKEN_SHOP_EVENT, type StoreProduct, type TokenPack } from "@/lib/tokenStore";
import { playError, playSuccess, playTap } from "@/lib/sounds";

function CoinStack({ count }: { count: number }) {
  return (
    <span className="relative flex items-end" style={{ width: 30 + (count - 1) * 12, height: 40 }} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute size-[30px] rounded-full bg-[#FBBF24] border-[3px] border-[#07060A] text-[#5B3A00] font-black text-sm flex items-center justify-center"
          style={{ left: i * 12, bottom: i % 2 ? 6 : 0 }}
        >
          J
        </span>
      ))}
    </span>
  );
}

/** Bottom sheet for buying hint tokens. Opened from anywhere with openTokenShop(). */
export default function TokenShop() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState(getTokens());
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const native = canBuyTokens();

  useEffect(() => {
    const show = () => setOpen(true);
    const update = () => setTokens(getTokens());
    window.addEventListener(TOKEN_SHOP_EVENT, show);
    window.addEventListener(TOKEN_EVENT, update);
    return () => {
      window.removeEventListener(TOKEN_SHOP_EVENT, show);
      window.removeEventListener(TOKEN_EVENT, update);
    };
  }, []);

  useEffect(() => {
    if (!open || !native || products) return;
    setFailed(false);
    loadProducts()
      .then((list) => (list.length ? setProducts(list) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [open, native, products]);

  async function buy(pack: TokenPack) {
    if (busy) return;
    playTap();
    setBusy(pack.id);
    const result = await buyPack(pack);
    setBusy(null);
    if (result.status === "bought") {
      playSuccess();
      toast.success(t("shop.added").replace("{n}", String(result.tokens)));
      setOpen(false);
    } else if (result.status === "pending") {
      toast(t("shop.pending"));
    } else if (result.status === "failed") {
      playError();
      toast.error(t("shop.failed"));
    }
  }

  const priceOf = (id: string) => products?.find((product) => product.id === id)?.price;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/70 flex items-end"
          onClick={() => !busy && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label={t("shop.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="cc-sketchbook w-full bg-[#07060A] rounded-t-[32px] border-t-2 border-[#2A2533] px-5 pt-5 text-[#F7F3FF]"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-[1.9rem] leading-none font-bold tracking-[-0.02em]">{t("shop.title")}</h2>
                <p className="mt-2 text-sm text-[#B9B3C7]">
                  {t("shop.balance")} <span className="font-bold text-[#FBBF24] tabular-nums">{tokens}</span>
                </p>
              </div>
              <button
                onClick={() => !busy && setOpen(false)}
                aria-label={t("common.close")}
                className="size-10 rounded-full bg-[#17141D] text-white/60 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {native && <div className="mt-5 flex flex-col gap-2.5">
              {TOKEN_PACKS.map((pack, index) => {
                const price = priceOf(pack.id);
                return (
                  <button
                    key={pack.id}
                    disabled={!price || Boolean(busy)}
                    onClick={() => void buy(pack)}
                    className={`cc-press relative flex items-center gap-4 rounded-[22px] px-4 py-3.5 text-left disabled:opacity-100 ${
                      pack.badge === "popular" ? "bg-[#FF1A6C]" : "bg-[#17141D]"
                    }`}
                  >
                    <CoinStack count={index + 1} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-display text-xl font-bold tabular-nums">
                        {t("shop.tokens").replace("{n}", String(pack.tokens))}
                      </span>
                      {pack.badge && (
                        <span className={`block text-xs font-semibold ${pack.badge === "popular" ? "text-white/85" : "text-[#FBBF24]"}`}>
                          {t(pack.badge === "popular" ? "shop.popular" : "shop.best")}
                        </span>
                      )}
                    </span>
                    {(
                      <span className="min-w-[88px] h-10 px-3 rounded-full bg-[#F7F3FF] text-[#07060A] text-sm font-bold flex items-center justify-center tabular-nums">
                        {busy === pack.id ? "…" : price ?? (failed ? "—" : "…")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>}

            <p className="mt-4 text-xs leading-relaxed text-[#8C8798]">
              {!native
                ? t("shop.appOnly")
                : failed
                  ? t("shop.unavailable")
                  : t("shop.earn").replace("{round}", String(TOKEN_REWARD_ROUND)).replace("{correct}", String(TOKEN_REWARD_CORRECT))}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
