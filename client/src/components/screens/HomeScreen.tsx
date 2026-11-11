/**
 * DESIGN: Electric Pulse - Home Screen
 * Professional home with game mode selection, streak display, and game history
 * This is the main hub - feels like a premium gaming app
 * Bottom: game history, Top: streak/profile, Middle: game modes
 */

import { useState, useEffect } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap } from "@/lib/sounds";
import { getDailyChallenge, getStreakData } from "@/lib/retention";
import { arePremiumFeaturesUnlocked, isBillingEnabled } from "@/lib/premium";

interface GameHistoryItem {
  id: string;
  mode: string;
  partner: string;
  word: string;
  score: number;
  date: string;
  imageData?: string;
}

interface Props {
  onPlayClassic: () => void;
  onPlayCoDraw: () => void;
  onDailyChallenge: () => void;
  onProfile: () => void;
  onPremium: () => void;
  onAchievements: () => void;
  partnerName: string | null;
}

export default function HomeScreen({
  onPlayClassic,
  onPlayCoDraw,
  onDailyChallenge,
  onProfile,
  onPremium,
  onAchievements,
  partnerName,
}: Props) {
  const { t } = useLocale();
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const premium = arePremiumFeaturesUnlocked();
  const billingEnabled = isBillingEnabled();

  useEffect(() => {
    const data = getStreakData();
    setStreak(data.currentStreak);
    setDailyCompleted(Boolean(getDailyChallenge()?.completed));

    // Load game history from localStorage
    try {
      const saved = localStorage.getItem("cc_game_history");
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, 20));
    } catch { /* Storage is optional; the game remains playable. */ }
  }, []);

  const gameModes = [
    {
      id: "classic",
      title: t("home.classic"),
      desc: t("home.classicDesc"),
      icon: "🎨",
      color: "#FF1A6C",
      image: "/images/onboarding-couple.webp",
      onClick: onPlayClassic,
      premium: false,
      badge: "",
    },
    {
      id: "co-draw",
      title: t("home.coDraw"),
      desc: t("home.coDrawDesc"),
      icon: "🖌️",
      color: "#8B5CF6",
      image: "/images/co-draw.svg",
      onClick: onPlayCoDraw,
      premium: false,
      badge: "NEW",
    },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Header */}
      <header className="relative z-10 pt-12 px-5 pb-3 flex items-center justify-between">
        {/* Streak */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { playTap(); onAchievements(); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]"
        >
          <span className="text-base">🔥</span>
          <span className="text-white font-bold text-sm">{streak}</span>
          <span className="text-white/30 text-xs">{t("home.streak")}</span>
        </motion.button>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {billingEnabled && !premium && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { playTap(); onPremium(); }}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center gap-1.5"
            >
              <span className="text-xs">👑</span>
              <span className="text-amber-400 text-xs font-bold">PRO</span>
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { playTap(); onProfile(); }}
            className="size-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/60">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </motion.button>
        </div>
      </header>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-hide">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 mt-2"
        >
          <h1 className="font-display text-2xl font-black text-white mb-1">
            {t("home.welcome")} 👋
          </h1>
          <p className="text-white/35 text-sm">
            {t("home.whatToPlay")}
          </p>
        </motion.div>

        {/* Game Modes Grid */}
        <div className="space-y-3 mb-8">
          {gameModes.map((mode, idx) => (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playTap();
                if (mode.premium && !premium) {
                  onPremium();
                } else {
                  mode.onClick();
                }
              }}
              className="w-full relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] active:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Mode image thumbnail */}
                <div className="relative size-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={mode.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    {mode.icon}
                  </div>
                </div>

                {/* Mode info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-white">{mode.title}</h3>
                    {mode.badge && (
                      <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary font-bold border border-secondary/30">{mode.badge}</span>
                    )}
                    {mode.premium && !premium && (
                      <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">PRO</span>
                    )}
                  </div>
                  <p className="text-white/35 text-xs mt-0.5 line-clamp-2">{mode.desc}</p>
                </div>

                {/* Arrow */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/20 flex-shrink-0">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>

              {/* Subtle glow accent */}
              <div
                className="absolute top-0 left-0 w-1 h-full opacity-60"
                style={{ backgroundColor: mode.color }}
              />
            </motion.button>
          ))}
        </div>

        {/* Daily Challenge Banner */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { playTap(); onDailyChallenge(); }}
          className="w-full mb-8 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 relative overflow-hidden text-left"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg">
              🎯
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm">{t("home.dailyChallenge")}</h4>
              <p className="text-white/30 text-xs">{t("home.dailyChallengeDesc")}</p>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-primary text-xs font-bold"
            >
              {dailyCompleted ? `✓ ${t("home.dailyDone")}` : "NEW"}
            </motion.div>
          </div>
        </motion.button>

        {/* Game History */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold text-white">{t("home.history")}</h3>
            {history.length > 0 && (
              <span className="text-white/20 text-xs">{history.length} {t("home.games")}</span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-3xl mb-3">🎮</div>
              <p className="text-white/25 text-sm">{t("home.noHistory")}</p>
              <p className="text-white/15 text-xs mt-1">{t("home.noHistoryDesc")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.16 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  {/* Mini drawing preview */}
                  <div className="size-10 rounded-lg bg-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.imageData ? (
                      <img src={item.imageData} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">🎨</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{item.word}</span>
                      <span className="text-white/15 text-[0.6rem]">•</span>
                      <span className="text-white/25 text-xs">{item.partner}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/20 text-[0.6rem]">{item.mode}</span>
                      <span className="text-white/15 text-[0.6rem]">{item.date}</span>
                    </div>
                  </div>
                  {/* Score */}
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 text-sm font-bold">{item.score}</span>
                    <span className="text-amber-400/50 text-[0.6rem]">/100</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
