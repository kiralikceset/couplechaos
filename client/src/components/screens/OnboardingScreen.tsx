/**
 * DESIGN: Electric Pulse - Splash/Onboarding
 * The couple illustration IS the background - full screen, immersive
 * Professional yet fun - this is a million-dollar app
 * Mobile-first: content at bottom for thumb reach
 * i18n + sound effects integrated
 */
import { useState, useEffect, type CSSProperties } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocalizedTaglines } from "@/lib/i18n";
import { playTap } from "@/lib/sounds";
interface Props {
  onNext: () => void;
  onProfile: () => void;
  transport: "online" | "local" | "connecting" | "offline";
}
// Stable parameters keep the particles from jumping and restarting on every tagline.
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: `${10 + i * 11}%`,
  bottom: `${5 + ((i * 7) % 30)}%`,
  x: (i % 2 ? 1 : -1) * (10 + i),
  duration: 4 + (i % 4),
  delay: i * 0.6,
}));
export default function OnboardingScreen({
  onNext,
  onProfile,
  transport,
}: Props) {
  const { t } = useLocale();
  return (
    <div className="intro-screen relative flex flex-col h-screen w-full overflow-hidden">
      {/* COUPLE IMAGE AS FULL BACKGROUND */}
      <div className="absolute inset-0">
        <img
          src="/images/onboarding-couple.webp"
          fetchPriority="high"
          decoding="async"
          width="1056"
          height="1408"
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-transparent" />
      </div>
      {/* Subtle animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((particle, i) => (
          <div
            key={i}
            className="onboarding-particle absolute size-1.5 rounded-full bg-primary/80"
            style={
              {
                left: particle.left,
                bottom: particle.bottom,
                "--particle-x": `${particle.x}px`,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {/* Top bar - connection status and profile */}
      <div className="relative z-20 pt-12 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${
              transport === "online"
                ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]"
                : transport === "connecting"
                  ? "bg-red-400 animate-pulse"
                  : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]"
            }`}
          />
          <span className="text-[0.6rem] text-white/30 font-medium uppercase tracking-wider">
            {transport === "online"
              ? t("connect.onlineMode")
              : transport === "connecting"
                ? t("connect.connectingMode")
                : transport === "offline"
                  ? "Couple Chaos"
                  : t("connect.localMode")}
          </span>
        </div>
        <button
          onClick={() => {
            playTap();
            onProfile();
          }}
          className="size-10 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-white/60"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>
      {/* Spacer - let the image breathe */}
      <div className="flex-1" />
      {/* Content at bottom - professional and fun */}
      <div className="relative z-10 flex flex-col px-6 pb-10">
        {/* App logo/title */}
        <div className="mb-3">
          <h1 className="font-display text-[3.2rem] font-black tracking-tighter leading-[0.85] text-white">
            {t("onboarding.title1")}
            <br />
            <span className="gradient-text">{t("onboarding.title2")}</span>
          </h1>
        </div>
        {/* Subtitle */}
        <p className="text-white/50 text-[0.95rem] font-medium mb-8 max-w-[300px] leading-relaxed">
          {t("onboarding.subtitle")}
        </p>
        {/* CTA Button */}
        <button
          onClick={() => {
            playTap();
            onNext();
          }}
          className="w-full bg-primary text-white font-bold text-lg py-[1.15rem] rounded-2xl glow-primary relative overflow-hidden active:scale-[0.98] transition-transform duration-100"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {t("onboarding.cta")}
            <span className="intro-arrow text-white/80">→</span>
          </span>
          <div className="intro-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </button>
        <RotatingTagline />
      </div>
    </div>
  );
}
function RotatingTagline() {
  useLocale();
  const [taglineIdx, setTaglineIdx] = useState(0);
  const taglines = getLocalizedTaglines();
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      clearInterval(interval);
      if (!document.hidden)
        interval = setInterval(() => {
          setTaglineIdx(prev => (prev + 1) % taglines.length);
        }, 3500);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [taglines.length]);
  return (
    <div className="mt-5 h-5 flex items-center justify-center">
      <p
        key={taglineIdx}
        className="intro-tagline text-white/25 text-[0.65rem] font-medium tracking-wider uppercase text-center"
      >
        {taglines[taglineIdx]}
      </p>
    </div>
  );
}
