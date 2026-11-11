/**
 * DESIGN: Electric Pulse - Category Selection
 * Choose word category before starting the game
 * Shows free vs premium categories with lock icons
 * Daily challenge banner at top
 */

import { useState, useEffect } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { CATEGORIES, getCategoryWordCount, getDailyWord } from "@/lib/wordPool";
import { arePremiumFeaturesUnlocked, isBillingEnabled, isCategoryLocked, getRemainingFreeGames } from "@/lib/premium";
import { getDailyChallenge, setDailyChallenge, getStreakData } from "@/lib/retention";
import { playTap, playDailyChallenge } from "@/lib/sounds";
import type { Locale } from "@/lib/i18n";

interface Props {
  onSelect: (category: string) => void;
  onBack: () => void;
  onPremium: () => void;
  locale: Locale;
}

export default function CategoryScreen({ onSelect, onBack, onPremium, locale }: Props) {
  const { t } = useLocale();
  const [dailyWord, setDailyWord] = useState<{ word: string; category: string } | null>(null);
  const streak = getStreakData();
  const remaining = getRemainingFreeGames();
  const premium = arePremiumFeaturesUnlocked();
  const billingEnabled = isBillingEnabled();

  useEffect(() => {
    const daily = getDailyWord(locale);
    setDailyWord(daily);
    
    // Set daily challenge if not already set
    if (!getDailyChallenge()) {
      setDailyChallenge(daily.word, daily.category);
    }
  }, [locale]);

  function handleCategorySelect(categoryId: string) {
    if (isCategoryLocked(categoryId)) {
      playTap();
      onPremium();
      return;
    }
    playTap();
    onSelect(categoryId);
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,26,108,0.04)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 pt-12 px-6 flex items-center justify-between">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Streak badge */}
        {streak.currentStreak > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FBBF24]/10 border border-[#FBBF24]/20"
          >
            <span className="text-sm">🔥</span>
            <span className="text-xs font-bold text-[#FBBF24]">{streak.currentStreak}</span>
          </motion.div>
        )}
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col px-6 pt-6 overflow-y-auto pb-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <h2 className="font-display text-2xl font-black text-white mb-1">
            {t("cat.title") || "Choose Category"}
          </h2>
          <p className="text-white/40 text-sm">
            {premium 
              ? (t("cat.subtitlePro") || "All categories unlocked!")
              : `${remaining} ${t("cat.gamesLeft") || "free games left today"}`
            }
          </p>
        </motion.div>

        {/* Daily Challenge Banner */}
        {dailyWord && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playDailyChallenge();
              onSelect("daily_challenge");
            }}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#FBBF24]/10 to-[#F59E0B]/5 border border-[#FBBF24]/20 mb-5 text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#FBBF24]/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center gap-3">
              <div className="size-12 rounded-xl bg-[#FBBF24]/20 border border-[#FBBF24]/30 flex items-center justify-center text-xl">
                ⭐
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#FBBF24] text-sm uppercase tracking-wider">
                    {t("cat.dailyChallenge") || "Daily Challenge"}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold bg-[#FBBF24]/20 text-[#FBBF24]">
                    {t("cat.dailyBonus")}
                  </span>
                </div>
                <p className="text-white/50 text-xs mt-0.5">
                  {t("cat.dailyDesc") || "Special word of the day!"}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#FBBF24]/60">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        )}

        {/* Categories Grid */}
        <div className="space-y-3">
          {CATEGORIES.map((cat, i) => {
            const locked = isCategoryLocked(cat.id);
            const wordCount = getCategoryWordCount(cat.id);
            
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCategorySelect(cat.id)}
                className={`w-full p-4 rounded-2xl text-left relative overflow-hidden transition-all ${
                  locked
                    ? "bg-white/[0.02] border border-white/[0.05] opacity-70"
                    : "bg-white/[0.04] border border-white/[0.08] active:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center text-2xl ${
                    locked ? "bg-white/[0.04]" : "bg-white/[0.06]"
                  }`}>
                    {locked ? "🔒" : cat.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-base ${locked ? "text-white/40" : "text-white"}`}>
                        {t(cat.nameKey) || cat.id}
                      </h3>
                      {cat.premium && (
                        <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">
                      {wordCount} {t("cat.words") || "words"}
                    </p>
                  </div>
                  {locked ? (
                    <div className="size-8 rounded-full bg-[#FBBF24]/10 flex items-center justify-center">
                      <span className="text-xs">👑</span>
                    </div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/30">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Upgrade banner for free users */}
        {billingEnabled && !premium && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playTap(); onPremium(); }}
            className="mt-5 w-full p-4 rounded-2xl bg-gradient-to-r from-[#8B5CF6]/10 to-[#FF1A6C]/10 border border-[#8B5CF6]/20 text-center"
          >
            <p className="text-white/60 text-sm font-medium">
              👑 {t("cat.unlockAll") || "Unlock all categories & unlimited games"}
            </p>
          </motion.button>
        )}
      </main>
    </div>
  );
}
