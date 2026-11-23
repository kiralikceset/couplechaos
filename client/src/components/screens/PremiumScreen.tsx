/**
 * Premium — the paywall and, for subscribers, their status.
 * Shows what Premium adds, two plans (yearly preselected), the price and renewal terms the
 * App Store requires, and Restore / Terms / Privacy.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
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


const PERK_ICONS: Record<string, ReactNode> = {
  unlimited: <path d="M7 12c0-2.2 1.6-4 3.6-4 3.6 0 4.2 8 7.8 8 2 0 3.6-1.8 3.6-4s-1.6-4-3.6-4c-3.6 0-4.2 8-7.8 8C8.6 16 7 14.2 7 12z" transform="translate(-3 0)" />,
  partner: <path d="M9 19s-6-3.6-6-8.2C3 8.6 4.6 7 6.6 7 7.8 7 9 7.8 9 9c0-1.2 1.2-2 2.4-2 2 0 3.6 1.6 3.6 3.8M15 21s-4.5-2.7-4.5-6.1c0-1.6 1.2-2.9 2.7-2.9.9 0 1.8.6 1.8 1.5 0-.9.9-1.5 1.8-1.5 1.5 0 2.7 1.3 2.7 2.9 0 3.4-4.5 6.1-4.5 6.1z" />,
  weekly: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5l1.4 2.9 3.2.4-2.4 2.2.6 3.1L12 14.6l-2.8 1.5.6-3.1-2.4-2.2 3.2-.4z" /></>,
  double: <path d="M5 8l5 8M10 8l-5 8M14.5 9.5c0-1.4 1.1-2.5 2.6-2.5s2.6 1 2.6 2.4c0 2.6-5.2 3.9-5.2 6.6h5.4" />,
};

function Perk({ kind, color, title, text, delay }: { kind: string; color: string; title: string; text: string; delay: number }) {
  return (
    <li className="cc-rise flex items-start gap-3.5" style={{ animationDelay: `${delay}ms` }}>
      <span className="size-11 shrink-0 rounded-[14px] flex items-center justify-center" style={{ background: color }} aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#07060A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{PERK_ICONS[kind]}</svg>
      </span>
      <span className="pt-0.5">
        <span className="block text-[1rem] font-semibold text-[#F7F3FF] leading-tight">{title}</span>
        <span className="block mt-1 text-[0.85rem] text-[#8C8798] leading-snug">{text}</span>
      </span>
    </li>
  );
}

/** The two of you, crowned. */
function Hero() {
  return (
    <svg viewBox="0 0 260 150" className="w-[230px] h-auto" aria-hidden>
      <g className="cc-hero-a"><circle cx="92" cy="98" r="42" fill="#F7F3FF" />
        <circle cx="78" cy="94" r="4.5" fill="#FF1A6C" /><circle cx="104" cy="94" r="4.5" fill="#FF1A6C" />
        <path d="M76 110 q16 14 32 0" fill="none" stroke="#FF1A6C" strokeWidth="6" strokeLinecap="round" /></g>
      <g className="cc-hero-b"><circle cx="168" cy="98" r="42" fill="#07060A" stroke="#F7F3FF" strokeOpacity=".15" strokeWidth="2" />
        <path d="M150 93 q7-8 14 0 M172 93 q7-8 14 0" fill="none" stroke="#FBBF24" strokeWidth="5" strokeLinecap="round" />
        <path d="M152 110 q16 14 32 0" fill="none" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" /></g>
      <g className="cc-hero-crown">
        <path d="M100 44 L96 12 L113 26 L130 4 L147 26 L164 12 L160 44 Z" fill="#FBBF24" stroke="#07060A" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="130" cy="4" r="5" fill="#FF1A6C" stroke="#07060A" strokeWidth="3" />
      </g>
      <g className="cc-hero-spark" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round">
        <path d="M36 40 l-14 -10 M30 62 l-18 0 M224 40 l14 -10 M230 62 l18 0" />
      </g>
    </svg>
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
        <span className="font-display text-sm font-bold tracking-[0.02em] text-[#FBBF24]">PREMIUM</span>
        {native && !status.isPremium ? (
          <button onClick={() => void restore()} className="h-10 min-w-10 px-2 rounded-full text-sm font-semibold text-[#B9B3C7]">
            {busy === "restore" ? "…" : t("premium.restore")}
          </button>
        ) : (
          <span className="size-10" aria-hidden />
        )}
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-6 pb-6">
        <div className="relative -mx-6 mt-3 pt-4 pb-2 flex justify-center overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(60%_80%_at_50%_45%,rgba(255,26,108,0.38),transparent_70%)]" aria-hidden />
          <div className="relative"><Hero /></div>
        </div>
        <h1 className="mt-3 text-center font-display text-[1.85rem] leading-[1.05] font-bold tracking-[-0.02em] text-balance">{title}</h1>
        <p className="mt-2 text-center text-[#B9B3C7] text-base leading-snug text-balance">{lead}</p>
        {reason === "limit" && !status.isPremium && (
          <p className="mt-2 text-center text-sm text-[#FBBF24]">
            {t("premium.refill").replace("{h}", String(hours)).replace("{m}", String(minutes))}
          </p>
        )}

        <ul className="mt-7 flex flex-col gap-4">
          <Perk kind="unlimited" color="#FF1A6C" delay={80} title={t("premium.perk.unlimited")} text={t("premium.perk.unlimitedText").replace("{n}", String(FREE_DAILY_LIMIT))} />
          <Perk kind="partner" color="#8B5CF6" delay={140} title={t("premium.perk.partner")} text={t("premium.perk.partnerText")} />
          <Perk kind="weekly" color="#FBBF24" delay={200} title={t("premium.perk.weekly").replace("{n}", String(WEEKLY_BONUS_TOKENS))} text={t("premium.perk.weeklyText")} />
          <Perk kind="double" color="#F7F3FF" delay={260} title={t("premium.perk.double")} text={t("premium.perk.doubleText")} />
        </ul>
        {selected?.trialDays ? (
          <ol className="mt-7 rounded-[22px] bg-[#121016] border border-white/[0.06] px-4 py-4 flex flex-col gap-3">
            <li className="flex items-center gap-3">
              <span className="size-7 rounded-full bg-[#FF1A6C] flex items-center justify-center" aria-hidden>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
              </span>
              <span className="text-sm"><b className="font-semibold">{t("premium.timelineToday")}</b> <span className="text-[#8C8798]">{t("premium.timelineTodayText")}</span></span>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-7 rounded-full bg-[#2A2533] flex items-center justify-center text-[0.7rem] font-bold tabular-nums" aria-hidden>{selected.trialDays}</span>
              <span className="text-sm"><b className="font-semibold">{t("premium.timelineDay").replace("{n}", String(selected.trialDays))}</b> <span className="text-[#8C8798]">{t("premium.timelineDayText").replace("{price}", afterTrial)}</span></span>
            </li>
          </ol>
        ) : null}

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
                    {id === "yearly" && (
                      <span className="absolute -top-2.5 left-3 rounded-full bg-[#FBBF24] text-[#07060A] text-[0.68rem] font-bold px-2 py-0.5">
                        {savings > 0 ? t("premium.save").replace("{n}", String(savings)) : t("premium.bestValue")}
                      </span>
                    )}
                    <span className={`absolute top-3 right-3 size-5 rounded-full border-2 flex items-center justify-center ${active ? "border-[#FF1A6C] bg-[#FF1A6C]" : "border-[#4A4453]"}`} aria-hidden>
                      {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>}
                    </span>
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
              className="cc-press cc-shine relative overflow-hidden w-full h-14 rounded-2xl bg-[#FF1A6C] text-white font-bold text-lg shadow-[0_14px_30px_-12px_rgba(255,26,108,0.7)] disabled:opacity-50"
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
