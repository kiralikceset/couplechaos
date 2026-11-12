/**
 * Home — a sketchbook page.
 * One big pink card for the main game (its doodle draws itself once on load),
 * two smaller tiles for the other modes, and a dashed "notebook" card for the
 * daily word with its letter boxes, time left and the leaderboard.
 */

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap } from "@/lib/sounds";
import { getDailyChallenge, getStreakData } from "@/lib/retention";
import { arePremiumFeaturesUnlocked, isBillingEnabled } from "@/lib/premium";
import { getProfile } from "@/lib/gameData";
import { getDailyWord, msUntilNextDailyWord } from "@/lib/wordPool";
import { getLocale } from "@/lib/i18n";

interface Props {
  onPlayClassic: () => void;
  onPlayCoDraw: () => void;
  onDailyChallenge: () => void;
  onPlaySolo: () => void;
  onLeaderboard: () => void;
  onProfile: () => void;
  onPremium: () => void;
  onAchievements: () => void;
  partnerName: string | null;
}

/** Pen-stroke doodles (white lines, drawn like the game's own canvas). */
function HeartDoodle() {
  return (
    <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="cc-draw w-full h-full">
      <path pathLength={1} strokeWidth={5} d="M80 104 C 40 78, 14 56, 22 32 C 30 10, 62 10, 76 34 C 88 10, 124 6, 136 30 C 146 54, 116 80, 80 104 Z" />
      <path pathLength={1} strokeWidth={4} className="cc-draw-2" d="M118 18 l 22 -12 M130 30 l 20 -4 M110 8 l 6 -6" />
      <path pathLength={1} strokeWidth={3.5} className="cc-draw-3" d="M44 44 q 6 -12 18 -10" />
    </svg>
  );
}

function CanvasDoodle() {
  return (
    <svg viewBox="0 0 80 56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path strokeWidth={4} d="M6 44 C 20 10, 34 10, 40 30 S 62 50, 74 12" />
      <path strokeWidth={4} opacity={0.55} d="M6 16 C 22 46, 40 48, 48 24 S 66 8, 74 40" />
    </svg>
  );
}

function BotDoodle() {
  return (
    <svg viewBox="0 0 64 56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect x="10" y="16" width="44" height="32" rx="10" strokeWidth={4} />
      <path strokeWidth={4} d="M32 16 V 6 M28 6 h 8" />
      <circle cx="24" cy="31" r="3.5" fill="currentColor" stroke="none" />
      <circle cx="40" cy="31" r="3.5" fill="currentColor" stroke="none" />
      <path strokeWidth={3.5} d="M25 40 q 7 5 14 0" />
    </svg>
  );
}

function timeLeft(ms: number, template: string): string {
  const minutes = Math.floor(ms / 60_000);
  return template.replace("{h}", String(Math.floor(minutes / 60))).replace("{m}", String(minutes % 60));
}

export default function HomeScreen({
  onPlayClassic,
  onPlayCoDraw,
  onDailyChallenge,
  onPlaySolo,
  onLeaderboard,
  onProfile,
  onPremium,
  onAchievements,
}: Props) {
  const { t } = useLocale();
  const [streak, setStreak] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [msLeft, setMsLeft] = useState(() => msUntilNextDailyWord());
  const premium = arePremiumFeaturesUnlocked();
  const billingEnabled = isBillingEnabled();
  const profile = getProfile();
  const name = profile.username.trim();
  const dailyWord = getDailyWord(getLocale()).word;
  // One box per letter; a space between words stays a gap.
  const dailyShape = Array.from(dailyWord);

  useEffect(() => {
    setStreak(getStreakData().currentStreak);
    setDailyCompleted(Boolean(getDailyChallenge()?.completed));
    const timer = window.setInterval(() => setMsLeft(msUntilNextDailyWord()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const tap = (action: () => void) => () => { playTap(); action(); };

  return (
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden text-[#F7F3FF]">
      <header className="relative z-10 pt-11 px-5 flex items-center justify-between">
        <button
          onClick={tap(onAchievements)}
          className="flex items-center gap-1.5 h-10 pl-3 pr-3.5 rounded-full bg-[#17141D] text-sm font-semibold"
        >
          <span aria-hidden>🔥</span>
          <span className="tabular-nums">{streak}</span>
          <span className="text-[#8C8798] font-normal">{t("home.streak")}</span>
        </button>
        <div className="flex items-center gap-2">
          {billingEnabled && !premium && (
            <button onClick={tap(onPremium)} className="h-10 px-3 rounded-full bg-[#17141D] text-amber-300 text-xs font-bold">
              👑 Pro
            </button>
          )}
          <button
            onClick={tap(onProfile)}
            aria-label={t("profile.title")}
            className="size-10 rounded-full bg-[#17141D] flex items-center justify-center text-xl"
          >
            {profile.avatar || "😎"}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-5 pt-6 pb-8">
        <h1 className="font-display text-[2rem] leading-[1.05] font-bold tracking-[-0.02em]">
          {name ? t("home.hello").replace("{name}", name) : t("home.helloAnon")}
        </h1>
        <p className="mt-1.5 text-[#8C8798] text-base">{t("home.whatToDraw")}</p>

        {/* Main game */}
        <button
          onClick={tap(onPlayClassic)}
          className="cc-press mt-6 w-full text-left relative overflow-hidden rounded-[28px] bg-[#FF1A6C] text-white p-5 pb-5 min-h-[208px] flex flex-col justify-end"
        >
          <div className="absolute right-3 top-3 w-[54%] max-w-[210px] aspect-[4/3] text-white/95" aria-hidden>
            <HeartDoodle />
          </div>
          <h2 className="relative font-display text-[1.75rem] leading-none font-bold tracking-[-0.02em]">{t("home.classic")}</h2>
          <div className="relative mt-2 flex items-end justify-between gap-3">
            <p className="text-white/85 text-sm leading-snug max-w-[60%]">{t("home.classicDesc")}</p>
            <span className="flex-shrink-0 inline-flex items-center gap-2 h-11 pl-4 pr-3 rounded-full bg-[#07060A] text-white text-sm font-bold">
              {t("home.play")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
            </span>
          </div>
        </button>

        {/* Other modes */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={tap(onPlayCoDraw)}
            className="cc-press text-left rounded-[24px] bg-[#8B5CF6] text-white p-4 min-h-[156px] flex flex-col justify-between"
          >
            <div className="w-16 h-11 text-white" aria-hidden><CanvasDoodle /></div>
            <div>
              <h3 className="font-display text-lg font-bold leading-tight">{t("home.coDraw")}</h3>
              <p className="mt-1 text-white/80 text-xs leading-snug">{t("home.coDrawShort")}</p>
            </div>
          </button>
          <button
            onClick={tap(onPlaySolo)}
            className="cc-press text-left rounded-[24px] bg-[#FBBF24] text-[#07060A] p-4 min-h-[156px] flex flex-col justify-between"
          >
            <div className="w-12 h-11" aria-hidden><BotDoodle /></div>
            <div>
              <h3 className="font-display text-lg font-bold leading-tight">{t("home.solo")}</h3>
              <p className="mt-1 text-[#07060A]/70 text-xs leading-snug">{t("home.soloShort")}</p>
            </div>
          </button>
        </div>

        {/* Daily word: a notebook page */}
        <div className="mt-3 rounded-[24px] border-2 border-dashed border-[#2A2533] p-4">
          <button onClick={tap(onDailyChallenge)} className="w-full text-left">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg font-bold">{t("home.dailyTitle")}</h3>
              <span className="text-[#8C8798] text-xs tabular-nums whitespace-nowrap">
                {dailyCompleted ? `✓ ${t("home.dailyPlayed")}` : timeLeft(msLeft, t("home.dailyLeft"))}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("home.dailyLetters").replace("{n}", String(dailyWord.replace(/\s/g, "").length))}>
              {dailyShape.map((char, index) =>
                char === " " ? (
                  <span key={index} className="w-3" />
                ) : (
                  <span key={index} className="w-7 h-8 rounded-[6px] bg-[#17141D] border-b-[3px] border-[#FBBF24]" />
                ),
              )}
            </div>
            <p className="mt-3 text-[#8C8798] text-xs">{t("home.dailyLetters").replace("{n}", String(dailyWord.replace(/\s/g, "").length))}</p>
          </button>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button
              onClick={tap(onDailyChallenge)}
              className="cc-press h-12 rounded-2xl bg-[#F7F3FF] text-[#07060A] text-sm font-bold"
            >
              {t("home.play")}
            </button>
            <button
              onClick={tap(onLeaderboard)}
              className="cc-press h-12 px-4 rounded-2xl bg-[#17141D] text-sm font-semibold"
            >
              🏆 {t("home.board")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
