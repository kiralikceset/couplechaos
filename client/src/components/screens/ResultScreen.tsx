/**
 * Result screen — one clear verdict, the drawing next to the real thing,
 * the score, one AI line, and three actions. Nothing overlaps, nothing loops.
 */

import { useEffect, useRef, useState } from "react";
import { m as motion } from "framer-motion";
import type { GameResult } from "@/pages/GameApp";
import { useLocale } from "@/contexts/LocaleContext";
import { playConfetti, playSuccess, playTap, playWordReveal, playError } from "@/lib/sounds";
import { getRoast, getScoreLabel, getScoreColor } from "@/lib/aiRoast";
import { shareOrDownloadFile, shareOrDownloadImage } from "@/lib/imageUtils";
import { canMakeVideo, makeReplayVideo } from "@/lib/replayVideo";
import { maybeAskForReview } from "@/lib/review";
import { getProfile } from "@/lib/gameData";
import { foldText } from "@/lib/hintFilter";
import { toast } from "sonner";

interface Props {
  result: GameResult;
  onShare: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
  partnerName?: string | null;
  /** Only for random matches: report + block the stranger. */
  onReport?: () => void;
  /** Daily challenge: open today's leaderboard. */
  onLeaderboard?: () => void;
}

export default function ResultScreen({ result, onShare, onPlayAgain, onHome, onReport, onLeaderboard, partnerName }: Props) {
  const { t } = useLocale();
  const score = useRef(Number.isFinite(result.aiScore) ? Math.max(1, Math.min(100, Math.round(result.aiScore!))) : 3).current;
  const comment = useRef(result.aiComment || getRoast(score, result.word)).current;
  const [shownScore, setShownScore] = useState(0);
  const classic = result.mode !== "co-draw" && result.guessCorrect !== undefined;
  const correct = classic && !!result.guessCorrect;
  const color = getScoreColor(score);

  useEffect(() => {
    if (correct) { playSuccess(); window.setTimeout(playConfetti, 250); }
    else if (classic) playError();
    else if (score >= 60) playSuccess();
    else playWordReveal();
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 600);
      setShownScore(Math.round(score * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score, classic, correct]);

  // Ask for a store rating right after a happy moment (rate-limited inside).
  useEffect(() => {
    const happy = correct || score >= 70;
    const timer = window.setTimeout(() => void maybeAskForReview(happy, getProfile().gamesPlayed ?? 0), 2200);
    return () => window.clearTimeout(timer);
  }, [correct, score]);

  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  // Always offered: strokes redraw themselves; without them the final picture is revealed.
  const videoReady = true;

  // "Yusuf 💞 Elif" (or "Yusuf 🤖 Yapay Zekâ" against the AI)
  const playerNames = () => {
    const me = getProfile().username.trim();
    const partner = (partnerName || "").trim();
    if (me && partner) return `${me} ${result.solo ? "🤖" : "💞"} ${partner}`;
    return me || partner || undefined;
  };

  const handleVideo = async () => {
    if (videoProgress !== null) return;
    playTap();
    if (!canMakeVideo()) {
      toast.error(t("result.videoFailed"));
      return;
    }
    setVideoProgress(0);
    try {
      const { blob, extension } = await makeReplayVideo({
        strokes: result.strokes || [],
        imageData: result.imageData,
        aspect: result.strokeAspect || 0.75,
        word: result.word,
        emoji: result.wordEmoji || "",
        comment,
        score,
        verdict: verdict && classic ? { text: verdict.title, good: correct } : undefined,
        labels: { should: t("video.should"), cta: t("video.cta") },
        players: playerNames(),
        onProgress: setVideoProgress,
      });
      setVideoProgress(null);
      await shareOrDownloadFile(blob, `couple-chaos-${foldText(result.word) || "cizim"}.${extension}`, "Couple Chaos", `“${result.word}” ${result.wordEmoji || ""} #couplechaos`.trim());
    } catch (error) {
      setVideoProgress(null);
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("result.videoFailed"));
    }
  };

  const handleSave = async () => {
    if (!result.imageData) return;
    playTap();
    try {
      await shareOrDownloadImage(result.imageData, `couple-chaos-${foldText(result.word) || "cizim"}.jpg`, "Couple Chaos", `“${result.word}” ${result.wordEmoji || ""}`.trim());
      toast.success(t("share.saved"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("share.saveFailed"));
    }
  };

  const verdict = classic
    ? correct
      ? { icon: "🎯", title: result.botDrew ? t("result.aiRight") : t("result.guessCorrect").replace(/\s*🎯\s*$/, ""), tone: "text-green-300", ring: "border-green-400/35 bg-green-500/[0.08]" }
      : result.playerGuess
        ? { icon: "✕", title: result.botDrew ? t("result.aiWrong") : t("result.guessWrong").replace(/\s*❌\s*$/, ""), tone: "text-red-300", ring: "border-red-400/30 bg-red-500/[0.07]" }
        : { icon: "⏱", title: t("result.guessNone").replace(/\s*🤷\s*$/, ""), tone: "text-white/70", ring: "border-white/10 bg-white/[0.03]" }
    : null;

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#050505] overflow-hidden">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-[110px] opacity-[0.14] pointer-events-none"
        style={{ backgroundColor: correct ? "#4ADE80" : classic ? "#F87171" : color }}
      />

      <main className="relative z-10 flex-1 overflow-y-auto px-5 pt-8 pb-3">
        <div className="mx-auto w-full max-w-[360px] flex flex-col gap-3">
          {/* Word */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-[0.55rem] font-bold text-white/35 uppercase tracking-[0.35em]">
              {result.mode === "co-draw" ? t("co.resultTitle") : t("result.wordWas")}
            </p>
            <h1 className="font-display text-[2rem] font-black tracking-tight text-white leading-tight break-words">{result.word}</h1>
          </motion.div>

          {/* Verdict */}
          {verdict && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 240, delay: 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${verdict.ring}`}
            >
              <span className={`size-10 rounded-full flex items-center justify-center text-xl font-black flex-shrink-0 bg-black/30 ${verdict.tone}`}>{verdict.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`font-display text-lg font-black leading-tight ${verdict.tone}`}>{verdict.title}</p>
                {result.playerGuess && (
                  <p className="text-white/45 text-xs truncate">{t("result.guessLabel")}: <span className="text-white/80 font-semibold">{result.playerGuess}</span></p>
                )}
              </div>
              {!!result.tokensEarned && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400/15 text-amber-300 text-xs font-black whitespace-nowrap">
                  +{result.tokensEarned}
                  <span className="inline-flex items-center justify-center size-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 text-[0.55rem] font-black">J</span>
                </span>
              )}
            </motion.div>
          )}

          {/* Daily challenge: place on today's leaderboard */}
          {result.dailyRank && (
            <button
              onClick={() => { playTap(); onLeaderboard?.(); }}
              className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-sm font-bold"
            >
              <span>🏆 {t("board.rank").replace("{rank}", String(result.dailyRank)).replace("{total}", String(result.dailyTotal || result.dailyRank))}</span>
              <span className="text-amber-200/60">›</span>
            </button>
          )}

          {/* Drawing vs. reality */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-2.5">
            <figure className="relative aspect-square rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0a0a0a]">
              {result.imageData
                ? <img src={result.imageData} alt={result.botDrew ? t("result.aiDrawing") : t("result.yourDrawing")} className="w-full h-full object-contain" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>}
              <figcaption className="absolute left-2 top-2 px-2 py-0.5 rounded-md bg-black/70 text-[0.55rem] font-bold text-white/70 uppercase tracking-wider">{result.botDrew ? t("result.aiDrawing") : t("result.yourDrawing")}</figcaption>
            </figure>
            <figure className="relative aspect-square rounded-2xl overflow-hidden border border-white/[0.12] bg-gradient-to-br from-secondary/15 via-[#0d0b14] to-primary/10 flex items-center justify-center">
              <span className="text-[4.5rem] leading-none" role="img" aria-label={result.word}>{result.wordEmoji || "❓"}</span>
              <figcaption className="absolute left-2 top-2 px-2 py-0.5 rounded-md bg-black/70 text-[0.55rem] font-bold text-white/70 uppercase tracking-wider">{t("result.reality")}</figcaption>
            </figure>
          </motion.div>

          {/* Score */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="flex items-baseline justify-between">
              <p className="text-[0.55rem] font-bold text-white/40 uppercase tracking-[0.25em]">{t("result.drawingScore")}</p>
              <p className="text-xs font-bold" style={{ color }}>{getScoreLabel(score)}</p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="font-display font-black leading-none tabular-nums" style={{ color }}>
                <span className="text-4xl">{shownScore}</span><span className="text-base text-white/30">/100</span>
              </p>
              <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${shownScore}%`, backgroundColor: color }} />
              </div>
            </div>
          </motion.div>

          {/* AI */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-[0.55rem] font-bold text-secondary uppercase tracking-[0.25em] mb-1.5">🤖 {t("result.gameComment")}{result.judgedBy === "ai" ? " · AI" : ""}</p>
            {result.aiGuess && (
              <p className="text-white/50 text-xs mb-1">{t("result.aiThinks")} <span className="text-white/85 font-semibold">“{result.aiGuess}”</span></p>
            )}
            <p className="text-white/80 text-sm leading-relaxed">{comment}</p>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-6 pt-2 border-t border-white/[0.05] bg-[#050505]">
        <div className="mx-auto w-full max-w-[360px] flex flex-col gap-2">
          <button
            onClick={() => { playTap(); onPlayAgain(); }}
            className="w-full bg-primary text-white font-bold text-base py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            {t("result.playAgain")}
          </button>
          <div className={`grid gap-2 ${videoReady ? "grid-cols-3" : "grid-cols-2"}`}>
            {videoReady && (
              <button
                onClick={() => void handleVideo()}
                disabled={videoProgress !== null}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-400 text-black text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
                {t("result.video")}
              </button>
            )}
            <button
              onClick={() => void handleSave()}
              disabled={!result.imageData}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white/80 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
              {t("result.save")}
            </button>
            <button
              onClick={() => { playTap(); onShare(); }}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white/80 text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>
              {t("result.share")}
            </button>
          </div>
          <div className="flex justify-center gap-6">
            <button onClick={() => { playTap(); onHome(); }} className="text-white/35 text-xs font-medium py-1.5 active:text-white/60">
              {t("common.home")}
            </button>
            {onReport && (
              <button onClick={() => { playTap(); onReport(); }} className="text-red-300/60 text-xs font-medium py-1.5">
                {t("report.link")}
              </button>
            )}
          </div>
        </div>
      </footer>
      {videoProgress !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 px-10" role="status" aria-live="polite">
          <span className="text-4xl">🎬</span>
          <p className="text-white font-bold">{t("result.videoMaking")}</p>
          <div className="w-full max-w-[260px] h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-amber-400 transition-[width] duration-200" style={{ width: `${Math.round(videoProgress * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
