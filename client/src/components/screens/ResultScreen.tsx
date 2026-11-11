/**
 * DESIGN: Electric Pulse - Result Screen
 * AI Scoring + Roast, Wallpaper Export, Celebration, Replay Addiction
 * Score-based sound effects, animated score counter, savage AI comments
 */

import { useState, useEffect, useRef } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import type { GameResult } from "@/pages/GameApp";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocalizedPlayfulMessage } from "@/lib/i18n";
import { playConfetti, playSuccess, playTap, playWordReveal, playError, playAchievement } from "@/lib/sounds";
import { getRoast, getScoreEmoji, getScoreLabel, getScoreColor } from "@/lib/aiRoast";
import { wallpaperThemes, generateWallpaper, downloadWallpaper } from "@/lib/wallpaper";
import { getProfile } from "@/lib/gameData";
import { toast } from "sonner";

interface Props {
  result: GameResult;
  onShare: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
  partnerName?: string | null;
}

const CONFETTI_COLORS = ['#FF1A6C', '#8B5CF6', '#FBBF24', '#4ADE80', '#60A5FA', '#F472B6', '#A78BFA'];

export default function ResultScreen({ result, onShare, onPlayAgain, onHome, partnerName }: Props) {
  const { t } = useLocale();
  const [showConfetti, setShowConfetti] = useState(true);
  const [replayMessage, setReplayMessage] = useState(getLocalizedPlayfulMessage("replay"));
  const [showAiComment, setShowAiComment] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [wallpaperPreview, setWallpaperPreview] = useState<string | null>(null);
  const [isGeneratingWallpaper, setIsGeneratingWallpaper] = useState(false);
  const scoreRef = useRef(
    Number.isFinite(result.aiScore)
      ? Math.max(1, Math.min(100, Math.round(result.aiScore!)))
      : 3,
  );
  const roastRef = useRef(result.aiComment || getRoast(scoreRef.current, result.word));
  const score = scoreRef.current;

  useEffect(() => {
    // Play sound based on score
    if (score >= 80) {
      playAchievement();
      setTimeout(() => playConfetti(), 300);
    } else if (score >= 60) {
      playSuccess();
      setTimeout(() => playConfetti(), 300);
    } else if (score >= 40) {
      playWordReveal();
    } else {
      playError();
    }

    const timer = setTimeout(() => setShowConfetti(false), 2200);
    const scoreTimer = setTimeout(() => setShowScore(true), 0);
    const aiTimer = setTimeout(() => setShowAiComment(true), 100);
    return () => { clearTimeout(timer); clearTimeout(scoreTimer); clearTimeout(aiTimer); };
  }, [score]);

  // Animate score counter
  useEffect(() => {
    if (!showScore) return;
    const duration = 480;
    const steps = 12;
    const increment = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [showScore, score]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReplayMessage(getLocalizedPlayfulMessage("replay"));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleWallpaper = async () => {
    if (!result.imageData) return;
    setIsGeneratingWallpaper(true);
    try {
      const playerName = getProfile().username.trim() || "Player";
      const wp = await generateWallpaper(
        result.imageData,
        result.word,
        playerName,
        partnerName?.trim() || "Partner",
        wallpaperThemes[selectedTheme],
        score
      );
      setWallpaperPreview(wp);
    } catch {
      toast.error(t("result.wallpaperFailed"));
      playError();
    }
    setIsGeneratingWallpaper(false);
  };

  const handleDownloadWallpaper = async () => {
    if (wallpaperPreview) {
      try {
        await downloadWallpaper(wallpaperPreview, `couple-chaos-${result.word}`);
        playSuccess();
        toast.success(t("result.wallpaperSaved"));
      } catch {
        playError();
        toast.error(t("result.wallpaperFailed"));
      }
    }
  };

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Celebration background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ backgroundColor: getScoreColor(score) }}
        />
      </div>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && score >= 60 && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className="result-confetti absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${(i * 37) % 100}%`,
                  backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  animationDelay: `${(i % 5) * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 overflow-y-auto pt-8 pb-4">
        {/* Word SLAM reveal */}
        <motion.div
          initial={{ scale: 4, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 8, stiffness: 200, delay: 0.1 }}
          className="text-center mb-3"
        >
          <span className="text-[0.55rem] font-bold text-white/25 uppercase tracking-[0.4em] block mb-1">{result.mode === "co-draw" ? t("co.resultTitle") : t("result.wordWas")}</span>
          <h1 className="font-display text-4xl font-black tracking-tight text-white leading-tight">
            {result.word}
          </h1>
        </motion.div>

        {/* Drawing result with frame */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 12 }}
          className="relative w-full max-w-[200px] mb-3"
        >
          <div className="absolute inset-[-4px] rounded-2xl blur-sm" style={{ background: `linear-gradient(135deg, ${getScoreColor(score)}40, transparent)` }} />
          <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white/[0.15]">
            {result.imageData ? (
              <img src={result.imageData} alt="Drawing" className="w-full h-full object-contain bg-[#0a0a0a]" />
            ) : (
              <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center text-4xl">🎨</div>
            )}
          </div>
        </motion.div>

        {/* AI SCORE - Animated counter */}
        <AnimatePresence>
          {showScore && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 200 }}
              className="text-center mb-3"
            >
              <p className="text-[0.55rem] font-bold text-white/30 uppercase tracking-[0.3em] mb-1">{t("result.drawingScore")}</p>
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  className="font-display text-5xl font-black"
                  style={{ color: getScoreColor(score) }}
                  animate={animatedScore === score ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {animatedScore}
                </motion.span>
                <span className="text-white/30 text-2xl font-bold">/100</span>
                <span className="text-3xl">{getScoreEmoji(score)}</span>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.16 }}
                className="text-sm font-bold mt-1"
                style={{ color: getScoreColor(score) }}
              >
                {getScoreLabel(score)}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Roast Comment - dramatic reveal */}
        <AnimatePresence>
          {showAiComment && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-full max-w-sm px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-3"
            >
              <div className="flex items-start gap-3">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-xl flex-shrink-0"
                >
                  🤖
                </motion.span>
                <div>
                  <p className="text-[0.5rem] font-bold text-secondary uppercase tracking-widest mb-1">{t("result.gameComment")}{result.judgedBy === "ai" ? " · AI" : ""}</p>
                  <p className="text-white/70 text-sm font-medium italic leading-relaxed">
                    {roastRef.current}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wallpaper button */}
        {result.imageData && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
            onClick={() => { playTap(); setShowWallpaperModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/50 text-xs font-medium hover:bg-white/[0.08] transition-all mb-2"
          >
            🖼️ {t("result.makeWallpaper") || "Make Wallpaper"}
          </motion.button>
        )}

        {/* Replay encouragement */}
        <AnimatePresence mode="wait">
          <motion.p
            key={replayMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-white/20 text-xs italic text-center"
          >
            {replayMessage}
          </motion.p>
        </AnimatePresence>
      </main>

      {/* Action buttons - sticky bottom */}
      <footer className="relative z-10 px-6 pb-8 pt-3 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent space-y-3">
        {/* Play Again - PULSING primary CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => { playTap(); onPlayAgain(); }}
          className="w-full bg-primary text-white font-bold text-lg py-4 rounded-2xl glow-primary relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {t("result.playAgain")}
            <motion.span
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
            >
              🔥
            </motion.span>
          </span>
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />
        </motion.button>

        {/* Share */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { playTap(); onShare(); }}
          className="w-full bg-white/[0.06] border border-white/[0.1] text-white/60 font-bold text-base py-3.5 rounded-2xl active:bg-white/[0.1] transition-all"
        >
          {t("result.shareResult")} ↗
        </motion.button>
        <button
          onClick={() => { playTap(); onHome(); }}
          className="w-full text-white/35 text-sm font-medium py-2 active:text-white/60 transition-colors"
        >
          {t("common.home")}
        </button>
      </footer>

      {/* Wallpaper Modal */}
      <AnimatePresence>
        {showWallpaperModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
            onClick={() => setShowWallpaperModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#111] rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg text-center mb-4">🖼️ {t("result.makeWallpaper") || "Make Wallpaper"}</h3>
              
              {/* Theme selector */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {wallpaperThemes.map((theme, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedTheme(i); setWallpaperPreview(null); }}
                    className={`aspect-square rounded-xl border-2 transition-all ${selectedTheme === i ? 'border-primary scale-105' : 'border-white/10'}`}
                    style={{ background: theme.gradient }}
                  />
                ))}
              </div>

              <p className="text-white/40 text-xs text-center mb-4">{wallpaperThemes[selectedTheme].name}</p>

              {/* Preview */}
              {wallpaperPreview && (
                <div className="mb-4">
                  <img src={wallpaperPreview} alt="Wallpaper preview" className="w-full max-h-[300px] object-contain rounded-xl" />
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {!wallpaperPreview ? (
                  <button
                    onClick={handleWallpaper}
                    disabled={isGeneratingWallpaper}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50"
                  >
                    {isGeneratingWallpaper ? `⏳ ${t("result.wallpaperGenerating")}` : `✨ ${t("result.wallpaperGenerate")}`}
                  </button>
                ) : (
                  <button
                    onClick={handleDownloadWallpaper}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl"
                  >
                    📥 {t("result.wallpaperDownload")}
                  </button>
                )}
                <button
                  onClick={() => setShowWallpaperModal(false)}
                  className="w-full bg-white/5 text-white/50 font-medium py-3 rounded-xl"
                >
                  {t("result.wallpaperClose")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
