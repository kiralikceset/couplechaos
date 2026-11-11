/**
 * DESIGN: Electric Pulse - Premium Paywall
 * Gorgeous upsell screen with feature list, pricing, and social proof
 * Designed to convert without being annoying
 */

import { useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { PREMIUM_PLANS, PREMIUM_FEATURES, isBillingEnabled } from "@/lib/premium";
import { playError, playSuccess, playTap } from "@/lib/sounds";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onPurchased?: () => void;
}

export default function PremiumScreen({ onBack, onPurchased }: Props) {
  const { t } = useLocale();
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [purchasing, setPurchasing] = useState(false);
  const billingEnabled = isBillingEnabled();

  function handlePurchase() {
    playTap();
    if (!billingEnabled) {
      // No store billing configured: never pretend a purchase happened.
      onBack();
      return;
    }

    setPurchasing(false);
    playError();
    toast.error(t("premium.billingUnavailable"));
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-[#FBBF24]/10 via-[#FF1A6C]/5 to-transparent rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-gradient-to-t from-[#8B5CF6]/10 to-transparent rounded-full blur-[60px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 px-6 flex items-center">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col px-6 overflow-y-auto pb-6">
        {/* Crown icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 10, delay: 0.1 }}
          className="text-center mt-4 mb-3"
        >
          <span className="text-5xl">👑</span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1 className="font-display text-3xl font-black text-white mb-2">
            Couple Chaos <span className="text-[#FBBF24]">PRO</span>
          </h1>
          <p className="text-white/40 text-sm">
            {t("premium.subtitle") || "Unlock the full chaos experience"}
          </p>
          {!billingEnabled && (
            <p className="mt-3 text-amber-300/70 text-xs">
              {t("premium.testMode")}
            </p>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2.5 mb-6"
        >
          {PREMIUM_FEATURES.map((feat, i) => (
            <motion.div
              key={feat.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <span className="text-lg">{feat.emoji}</span>
              <span className="text-white/70 text-sm font-medium">
                {t(feat.key) || feat.key}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 mb-6"
        >
          {PREMIUM_PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => { playTap(); setSelectedPlan(plan.id); }}
              className={`relative w-full p-4 rounded-2xl border-2 text-left transition-all ${
                selectedPlan === plan.id
                  ? "border-[#FBBF24] bg-[#FBBF24]/5"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#FBBF24] text-[0.6rem] font-bold text-black uppercase tracking-wider">
                  Popular
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-base">
                    {t(plan.nameKey) || plan.id}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {plan.pricePerWeek}/week
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-black text-xl text-white">{plan.price}</p>
                  {plan.savings && (
                    <p className="text-[#4ADE80] text-xs font-bold">Save {plan.savings}</p>
                  )}
                </div>
              </div>
              {/* Radio indicator */}
              <div className={`absolute top-1/2 -translate-y-1/2 left-4 size-5 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === plan.id ? "border-[#FBBF24]" : "border-white/20"
              }`}>
                {selectedPlan === plan.id && (
                  <div className="size-2.5 rounded-full bg-[#FBBF24]" />
                )}
              </div>
            </button>
          ))}
        </motion.div>

      </main>

      {/* CTA */}
      <footer className="relative z-10 px-6 pb-10 pt-4 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.97 }}
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-black font-bold text-lg py-5 rounded-2xl relative overflow-hidden disabled:opacity-70 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
        >
          {purchasing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" className="opacity-75" />
              </svg>
              Processing...
            </span>
          ) : (
            <span className="relative z-10">
              {billingEnabled ? (t("premium.cta") || "Unlock PRO") : t("premium.continue")} 👑
            </span>
          )}
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        </motion.button>
        
        <button
          onClick={() => { playTap(); onBack(); }}
          className="w-full mt-3 text-white/30 text-xs font-medium py-2"
        >
          {t("premium.later") || "Maybe later"}
        </button>
      </footer>
    </div>
  );
}
