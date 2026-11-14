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
import { recordScore } from "@/lib/scoreStats";
import { getStreakData } from "@/lib/retention";
import { toast } from "sonner";

interface Props {
  result: GameResult;
  onPlayAgain: () => void;
  onHome: () => void;
  partnerName?: string | null;
  /** Only for random matches: report + block the stranger. */
  onReport?: () => void;
  /** Daily challenge: open today's leaderboard. */
  onLeaderboard?: () => void;
}

export default function ResultScreen({ result, onPlayAgain, onHome, onReport, onLeaderboard, partnerName }: Props) {
  const { t } = useLocale();
  const score = useRef(Number.isFinite(result.aiScore) ? Math.max(1, Math.min(100, Math.round(result.aiScore!))) : 3).current;
  const comment = useRef(result.aiComment || getRoast(score, result.word)).current;
  const [shownScore, setShownScore] = useState(0);
  const classic = result.mode !== "co-draw" && result.guessCorrect !== undefined;
  const correct = classic && !!result.guessCorrect;
  const color = getScoreColor(score);
  // Your progress: average of recent rounds, best ever, daily streak. Rounds the AI drew don't count.
  const stats = useRef(result.botDrew ? null : recordScore(score, `${result.word}|${result.imageData?.length || 0}|${(result.imageData || "").slice(-24)}`)).current;
  const streak = useRef(getStreakData().currentStreak).current;

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
      ? { icon: "🎯", title: result.botDrew ? t("result.aiRight") : t("result.guessCorrect").replace(/\s*🎯\s*$/, ""), box: "bg-[#22C55E] text-[#07240F]", sub: "text-[#07240F]/70" }
      : result.playerGuess
        ? { icon: "✕", title: result.botDrew ? t("result.aiWrong") : t("result.guessWrong").replace(/\s*❌\s*$/, ""), box: "bg-[#17141D] text-[#FCA5A5]", sub: "text-[#8C8798]" }
        : { icon: "⏱", title: t("result.guessNone").replace(/\s*🤷\s*$/, ""), box: "bg-[#17141D] text-[#F7F3FF]", sub: "text-[#8C8798]" }
    : null;
  const drawingLabel = result.botDrew ? t("result.aiDrawing") : t("result.yourDrawing");

  return (
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <main className="relative z-10 flex-1 overflow-y-auto px-5 pt-10 pb-3">
        <div className="mx-auto w-full max-w-[380px] flex flex-col gap-3">
          {/* Word */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm text-[#8C8798]">{result.mode === "co-draw" ? t("co.resultTitle") : t("result.wordWas")}</p>
            <h1 className="font-display text-[2.4rem] font-bold tracking-[-0.02em] leading-[1.05] break-words">{result.word}</h1>
          </motion.div>

          {/* Verdict */}
          {verdict && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 16, stiffness: 260, delay: 0.1 }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-[22px] ${verdict.box}`}
            >
              <span className="text-2xl leading-none flex-shrink-0" aria-hidden>{verdict.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">{verdict.title}</p>
                {result.playerGuess && (
                  <p className={`text-xs truncate ${verdict.sub}`}>{t("result.guessLabel")}: <span className="font-semibold">{result.playerGuess}</span></p>
                )}
              </div>
              {!!result.tokensEarned && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#07060A] text-[#FBBF24] text-xs font-bold whitespace-nowrap">
                  +{result.tokensEarned} 🪙
                </span>
              )}
            </motion.div>
          )}

          {/* Daily challenge: place on today's leaderboard */}
          {result.dailyRank && (
            <button
              onClick={() => { playTap(); onLeaderboard?.(); }}
              className="cc-press flex items-center justify-between px-4 py-3 rounded-[22px] bg-[#FBBF24] text-[#07060A] text-sm font-bold"
            >
              <span>🏆 {t("board.rank").replace("{rank}", String(result.dailyRank)).replace("{total}", String(result.dailyTotal || result.dailyRank))}</span>
              <span aria-hidden>›</span>
            </button>
          )}

          {/* Drawing vs. reality */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-2.5">
            <figure className="rounded-[22px] bg-[#FF1A6C] p-2">
              <div className="aspect-square rounded-[16px] overflow-hidden bg-[#0A0A0A]">
                {result.imageData
                  ? <img src={result.imageData} alt={drawingLabel} className="w-full h-full object-contain" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>}
              </div>
              <figcaption className="px-1.5 pt-2 pb-0.5 text-xs font-semibold text-white">{drawingLabel}</figcaption>
            </figure>
            <figure className="rounded-[22px] bg-[#17141D] p-2">
              <div className="aspect-square rounded-[16px] bg-[#0F0D14] flex items-center justify-center">
                <span className="text-[4.5rem] leading-none" role="img" aria-label={result.word}>{result.wordEmoji || "❓"}</span>
              </div>
              <figcaption className="px-1.5 pt-2 pb-0.5 text-xs font-semibold text-[#B9B3C7]">{t("result.reality")}</figcaption>
            </figure>
          </motion.div>

          {/* Score */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="px-4 py-3.5 rounded-[22px] bg-[#17141D]">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-[#8C8798] flex items-center gap-2">
                {t("result.drawingScore")}
                {stats?.newBest && (
                  <span className="rounded-full bg-[#FBBF24] text-[#07060A] text-[0.7rem] font-bold px-2 py-0.5">{t("result.newBest")}</span>
                )}
              </p>
              <p className="text-sm font-bold" style={{ color }}>{getScoreLabel(score)}</p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="font-display font-bold leading-none tabular-nums" style={{ color }}>
                <span className="text-[2.6rem]">{shownScore}</span><span className="text-base text-[#8C8798]">/100</span>
              </p>
              <div className="flex-1 h-2 rounded-full bg-[#07060A] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${shownScore}%`, backgroundColor: color }} />
              </div>
            </div>
          </motion.div>

          {/* Your progress */}
          {stats && (
            <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-3 gap-2.5">
              {[
                { label: t("result.average"), value: String(stats.average) },
                { label: t("result.best"), value: String(stats.best) },
                { label: t("result.streak"), value: t("result.days").replace("{n}", String(streak)) },
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] bg-[#17141D] px-3 py-2.5">
                  <dt className="text-xs text-[#8C8798]">{item.label}</dt>
                  <dd className="mt-0.5 font-display text-xl font-bold text-[#F7F3FF] tabular-nums">{item.value}</dd>
                </div>
              ))}
            </motion.dl>
          )}

          {/* The jury */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <p className="rounded-[20px] rounded-tl-[6px] bg-[#FBBF24] text-[#07060A] px-4 py-3 text-[0.95rem] font-semibold leading-snug">{comment}</p>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-7 pt-3 bg-[#07060A]">
        <div className="mx-auto w-full max-w-[380px] flex flex-col gap-2">
          <button
            onClick={() => { playTap(); onPlayAgain(); }}
            className="cc-press w-full h-14 rounded-2xl bg-[#FF1A6C] text-white font-bold text-base"
          >
            {t("result.playAgain")}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void handleVideo()}
              disabled={videoProgress !== null}
              className="cc-press h-12 flex items-center justify-center gap-2 rounded-2xl bg-[#FBBF24] text-[#07060A] text-sm font-bold disabled:opacity-60"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
              {t("result.video")}
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={!result.imageData}
              className="cc-press h-12 flex items-center justify-center gap-2 rounded-2xl bg-[#17141D] text-[#F7F3FF] text-sm font-semibold disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>
              {t("result.image")}
            </button>
          </div>
          <div className="flex justify-center gap-6">
            <button onClick={() => { playTap(); onHome(); }} className="text-[#8C8798] text-sm font-medium py-2">
              {t("common.home")}
            </button>
            {onReport && (
              <button onClick={() => { playTap(); onReport(); }} className="text-red-300/70 text-sm font-medium py-2">
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
