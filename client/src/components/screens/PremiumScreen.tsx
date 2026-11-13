/**
 * Premium — the paywall and, for subscribers, their status.
 * Shows what Premium adds, two plans (yearly preselected), the price and renewal terms the
 * App Store requires, and Restore / Terms / Privacy.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import PrivacySheet from "@/components/PrivacySheet";
import { playError, playTap } from "@/lib/sounds";
import {
  FREE_DAILY_LIMIT,
  PREMIUM_EVENT,
  PREMIUM_TOKEN_MULTIPLIER,
  TERMS_URL,
  WEEKLY_BONUS_TOKENS,
  buyPremium,
  canBuyPremium,
  getPremiumStatus,
  loadPremiumProducts,
  manageSubscription,
  msUntilFreeGamesReset,
  restorePremium,
  type PlanId,
  type PremiumProduct,
} from "@/lib/premium";

interface Props {
  reason: "limit" | "upgrade";
  onBack: () => void;
  onPurchased: () => void;
}

function Crown() {
  return (
    <svg viewBox="0 0 120 92" className="w-[52px] h-auto" aria-hidden>
      <path d="M8 80 L4 24 L32 48 L60 8 L88 48 L116 24 L112 80 Z" fill="#FBBF24" stroke="#07060A" strokeWidth="6" strokeLinejoin="round" />
      <circle cx="60" cy="8" r="7" fill="#FF1A6C" stroke="#07060A" strokeWidth="5" />
      <path d="M22 66 H98" stroke="#07060A" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function Perk({ icon, color, title, text }: { icon: string; color: string; title: string; text: string }) {
  return (
    <li className="flex items-center gap-3" title={text}>
      <span className="size-8 shrink-0 rounded-lg flex items-center justify-center font-display font-bold text-sm text-[#07060A]" style={{ background: color }} aria-hidden>
        {icon}
      </span>
      <span className="text-[0.95rem] font-semibold text-[#F7F3FF] leading-tight">{title}</span>
    </li>
  );
}

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function PremiumScreen({ reason, onBack, onPurchased }: Props) {
  const { t, locale } = useLocale();
  const native = canBuyPremium();
  const [status, setStatus] = useState(getPremiumStatus());
  const [products, setProducts] = useState<PremiumProduct[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [msLeft, setMsLeft] = useState(() => msUntilFreeGamesReset());

  useEffect(() => {
    const update = () => setStatus(getPremiumStatus());
    window.addEventListener(PREMIUM_EVENT, update);
    const timer = window.setInterval(() => setMsLeft(msUntilFreeGamesReset()), 30_000);
    return () => {
      window.removeEventListener(PREMIUM_EVENT, update);
      window.clearInterval(timer);
    };
  }, []);

  function load() {
    setFailed(false);
    loadPremiumProducts()
      .then((list) => (list.length ? setProducts(list) : setFailed(true)))
      .catch(() => setFailed(true));
  }
  useEffect(() => {
    if (native && !status.isPremium) load();
  }, [native, status.isPremium]);

  const byPlan = (id: PlanId) => products?.find((product) => product.plan === id);
  const yearly = byPlan("yearly");
  const monthly = byPlan("monthly");
  const savings = useMemo(() => {
    if (!yearly || !monthly || monthly.amount <= 0) return 0;
    return Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
  }, [yearly, monthly]);
  const selected = byPlan(plan);

  async function subscribe() {
    if (!selected || busy) return;
    playTap();
    setBusy("buy");
    const result = await buyPremium(plan);
    setBusy(null);
    if (result === "subscribed") onPurchased();
    else if (result === "pending") toast(t("premium.pending"));
    else if (result === "failed") {
      playError();
      toast.error(t("premium.failed"));
    }
  }

  async function restore() {
    if (busy || !native) return;
    playTap();
    setBusy("restore");
    const restored = await restorePremium();
    setBusy(null);
    if (restored) onPurchased();
    else toast(t("premium.nothingToRestore"));
  }

  const hours = Math.floor(msLeft / 3_600_000);
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  const renewDate = status.expiresAt ? new Date(status.expiresAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "";

  const title = status.isPremium
    ? t("premium.activeTitle")
    : reason === "limit"
      ? t("premium.limitTitle").replace("{n}", String(FREE_DAILY_LIMIT))
      : t("premium.title");
  const lead = status.isPremium
    ? (status.willRenew ? t("premium.renews") : t("premium.ends")).replace("{date}", renewDate)
    : reason === "limit"
      ? t("premium.limitLead").replace("{n}", String(FREE_DAILY_LIMIT))
      : t("premium.lead");

  const ctaLabel = selected?.trialDays
    ? t("premium.ctaTrial").replace("{n}", String(selected.trialDays))
    : t("premium.cta");
  const afterTrial = selected
    ? (selected.plan === "yearly" ? t("premium.perYear") : t("premium.perMonth")).replace("{price}", selected.price)
    : "";

  return (
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <header className="relative z-10 pt-11 px-5 flex items-center justify-between">
        <button
          onClick={() => { playTap(); onBack(); }}
          aria-label={t("common.close")}
          className="size-10 rounded-full bg-[#17141D] text-white/70 text-xl leading-none flex items-center justify-center"
        >
          ×
        </button>
        <Crown />
        {native && !status.isPremium ? (
          <button onClick={() => void restore()} className="h-10 min-w-10 px-2 rounded-full text-sm font-semibold text-[#B9B3C7]">
            {busy === "restore" ? "…" : t("premium.restore")}
          </button>
        ) : (
          <span className="size-10" aria-hidden />
        )}
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-6 pb-6">
        <h1 className="mt-5 font-display text-[1.85rem] leading-[1.05] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-[#B9B3C7] text-base leading-snug">{lead}</p>
        {reason === "limit" && !status.isPremium && (
          <p className="mt-2 text-sm text-[#FBBF24]">
            {t("premium.refill").replace("{h}", String(hours)).replace("{m}", String(minutes))}
          </p>
        )}

        <ul className="mt-5 flex flex-col gap-2.5">
          <Perk icon="∞" color="#FF1A6C" title={t("premium.perk.unlimited")} text={t("premium.perk.unlimitedText").replace("{n}", String(FREE_DAILY_LIMIT))} />
          <Perk icon="♥" color="#8B5CF6" title={t("premium.perk.partner")} text={t("premium.perk.partnerText")} />
          <Perk icon="J" color="#FBBF24" title={t("premium.perk.weekly").replace("{n}", String(WEEKLY_BONUS_TOKENS))} text={t("premium.perk.weeklyText")} />
          <Perk icon={`×${PREMIUM_TOKEN_MULTIPLIER}`} color="#F7F3FF" title={t("premium.perk.double")} text={t("premium.perk.doubleText")} />
        </ul>

        {!native && !status.isPremium && (
          <p className="mt-7 rounded-[22px] bg-[#17141D] px-4 py-4 text-sm text-[#B9B3C7]">{t("premium.appOnly")}</p>
        )}
      </main>

      <footer className="relative z-10 px-6 pt-3 bg-[#07060A]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        {status.isPremium ? (
          <button
            onClick={() => { playTap(); void manageSubscription(); }}
            className="cc-press w-full h-14 rounded-2xl bg-[#17141D] font-bold"
          >
            {t("premium.manage")}
          </button>
        ) : native ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-3" role="radiogroup" aria-label={t("premium.plans")}>
              {(["yearly", "monthly"] as PlanId[]).map((id) => {
                const product = byPlan(id);
                const active = plan === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => { playTap(); setPlan(id); }}
                    className={`relative rounded-[20px] px-3.5 pt-3.5 pb-3 text-left border-2 transition-colors ${
                      active ? "border-[#FF1A6C] bg-[#FF1A6C]/10" : "border-[#2A2533] bg-[#17141D]"
                    }`}
                  >
                    {id === "yearly" && savings > 0 && (
                      <span className="absolute -top-2.5 left-3 rounded-full bg-[#FBBF24] text-[#07060A] text-[0.68rem] font-bold px-2 py-0.5">
                        {t("premium.save").replace("{n}", String(savings))}
                      </span>
                    )}
                    <span className="block text-sm font-semibold text-[#B9B3C7]">{t(id === "yearly" ? "premium.yearly" : "premium.monthly")}</span>
                    <span className="block mt-0.5 font-display text-xl font-bold tabular-nums">{product?.price ?? (failed ? "—" : "…")}</span>
                    <span className="block text-[0.75rem] text-[#8C8798] leading-snug min-h-[2.1em]">
                      {product
                        ? id === "yearly"
                          ? t("premium.perMonthShort").replace("{price}", formatMoney(product.amount / 12, product.currency, locale))
                          : t("premium.monthlyDetail")
                        : ""}
                      {product?.trialDays ? <><br />{t("premium.trialDays").replace("{n}", String(product.trialDays))}</> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {failed && (
              <button onClick={load} className="w-full text-sm text-[#B9B3C7] underline underline-offset-4 pb-2">
                {t("premium.retry")}
              </button>
            )}
            <button
              onClick={() => void subscribe()}
              disabled={!selected || busy !== null}
              className="cc-press w-full h-14 rounded-2xl bg-[#FF1A6C] text-white font-bold text-lg disabled:opacity-50"
            >
              {busy === "buy" ? "…" : ctaLabel}
            </button>
            {selected && (
              <p className="mt-2 text-center text-xs text-[#B9B3C7]">
                {selected.trialDays ? t("premium.thenPrice").replace("{price}", afterTrial) : afterTrial}
                {" · "}{t("premium.cancelAnytime")}
              </p>
            )}
          </>
        ) : null}
        {native && !status.isPremium && (
          <p className="mt-2 text-[0.68rem] leading-relaxed text-[#6F6A7A] text-center">
            {t("premium.legal")}{" "}
            <a href={TERMS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">{t("premium.terms")}</a>
            {" · "}
            <button onClick={() => setPrivacyOpen(true)} className="underline underline-offset-2">{t("profile.privacy")}</button>
          </p>
        )}
      </footer>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
