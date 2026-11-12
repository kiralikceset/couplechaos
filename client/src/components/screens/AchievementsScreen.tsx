/**
 * DESIGN: Electric Pulse - Achievements & Stats Screen
 * Shows streak, daily challenge, unlocked achievements, and couple stats
 * Gamification hub - makes users want to keep playing
 */

import { useState, useEffect } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap } from "@/lib/sounds";
import { getStreakData, getPlayerStats, getUnlockedAchievements, ACHIEVEMENTS } from "@/lib/retention";

interface Props {
  onBack: () => void;
}

export default function AchievementsScreen({ onBack }: Props) {
  const { t } = useLocale();
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, lastPlayDate: "" });
  const [stats, setStats] = useState({ totalGames: 0, sharedResults: 0, categoriesPlayed: 0 });
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    setStreak(getStreakData());
    const s = getPlayerStats(); setStats({ totalGames: s.totalGames, sharedResults: s.sharedResults, categoriesPlayed: s.categoriesPlayed.size });
    setUnlockedIds(getUnlockedAchievements());
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).length;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden">
      {/* Header */}
      <header className="relative z-10 pt-12 px-5 pb-4 flex items-center gap-4">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-display text-xl font-bold text-white">{t("ach.title")}</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">
        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-amber-500/10 border border-orange-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8C8798] text-xs font-medium mb-1">{t("ach.currentStreak")}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-white">{streak.currentStreak}</span>
                <span className="text-white/30 text-sm">{t("ach.days")}</span>
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl"
            >
              🔥
            </motion.div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-white/20 text-xs">{t("ach.longest")}: {streak.longestStreak} {t("ach.days")}</span>
            <span className="text-white/20 text-xs">{t("ach.totalGames")}: {stats.totalGames}</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="font-display text-xl font-bold text-white">{stats.totalGames}</p>
            <p className="text-white/25 text-[0.6rem] mt-0.5">{t("ach.played")}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="font-display text-xl font-bold text-white">{stats.sharedResults}</p>
            <p className="text-white/25 text-[0.6rem] mt-0.5">{t("ach.shared")}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="font-display text-xl font-bold text-amber-400">{unlockedCount}/{ACHIEVEMENTS.length}</p>
            <p className="text-white/25 text-[0.6rem] mt-0.5">{t("ach.badges")}</p>
          </div>
        </div>

        {/* Achievements List */}
        <h3 className="font-display text-base font-bold text-white mb-3">{t("ach.allBadges")}</h3>
        <div className="space-y-2">
          {ACHIEVEMENTS.map((ach, idx) => {
            const unlocked = unlockedIds.includes(ach.id);
            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  unlocked
                    ? 'bg-white/[0.04] border-amber-500/20'
                    : 'bg-white/[0.01] border-white/[0.04] opacity-50'
                }`}
              >
                <div className={`size-10 rounded-xl flex items-center justify-center text-lg ${
                  unlocked ? 'bg-amber-500/20' : 'bg-white/[0.04]'
                }`}>
                  {unlocked ? ach.emoji : "🔒"}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${unlocked ? 'text-white' : 'text-white/30'}`}>
                    {t(ach.nameKey)}
                  </p>
                  <p className="text-white/20 text-xs">{t(ach.descKey)}</p>
                </div>
                {unlocked && (
                  <span className="text-amber-400 text-xs">✓</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
