/**
 * DESIGN: Electric Pulse - Achievement Popup
 * Shows when user unlocks a new achievement
 * Animated, celebratory, makes user feel accomplished
 */

import { useEffect, useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { playAchievement } from "@/lib/sounds";
import { useLocale } from "@/contexts/LocaleContext";
import type { Achievement } from "@/lib/retention";

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

const RARITY_COLORS = {
  common: { bg: "from-[#60A5FA]/20 to-[#3B82F6]/10", border: "border-[#60A5FA]/30", text: "text-[#60A5FA]" },
  rare: { bg: "from-[#8B5CF6]/20 to-[#7C3AED]/10", border: "border-[#8B5CF6]/30", text: "text-[#8B5CF6]" },
  epic: { bg: "from-[#FF1A6C]/20 to-[#E11D48]/10", border: "border-[#FF1A6C]/30", text: "text-[#FF1A6C]" },
  legendary: { bg: "from-[#FBBF24]/20 to-[#F59E0B]/10", border: "border-[#FBBF24]/30", text: "text-[#FBBF24]" },
};

export default function AchievementPopup({ achievement, onDismiss }: Props) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      playAchievement();
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  const colors = RARITY_COLORS[achievement.rarity];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: "spring", damping: 15 }}
          className="fixed top-16 left-4 right-4 z-[100]"
          onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        >
          <div className={`p-4 rounded-2xl bg-gradient-to-r ${colors.bg} border ${colors.border} backdrop-blur-xl shadow-2xl`}>
            <div className="flex items-center gap-3">
              {/* Achievement icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 8, delay: 0.2 }}
                className="size-14 rounded-xl bg-white/[0.06] flex items-center justify-center text-3xl"
              >
                {achievement.emoji}
              </motion.div>
              
              <div className="flex-1">
                <p className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-0.5`}>
                  {t("ach.unlocked") || "Achievement Unlocked!"}
                </p>
                <p className="text-white font-bold text-base">
                  {t(achievement.nameKey) || achievement.nameKey}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {t(achievement.descKey) || achievement.descKey}
                </p>
              </div>
            </div>
            
            {/* Shimmer effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
