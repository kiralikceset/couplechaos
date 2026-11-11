/**
 * DESIGN: Electric Pulse - Professional Onboarding Slides
 * 3-step swipeable onboarding with professional visuals
 * NOT amateur emoji-only - uses real illustrations + animated elements
 * i18n + sound effects integrated
 */
import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap, playSlide } from "@/lib/sounds";
interface Props {
  onBack: () => void;
  onNext: () => void;
}
export default function HowItWorksScreen({ onBack, onNext }: Props) {
  const { t } = useLocale();
  const [currentSlide, setCurrentSlide] = useState(0);
  const coin = (
    <span className="inline-flex items-center justify-center size-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 text-[0.55rem] font-black">J</span>
  );
  const slides = [
    {
      title: t("how.slide1.title"),
      description: t("how.slide1.desc"),
      funNote: t("how.slide1.fun"),
      accentColor: "#FF1A6C",
      illustration: (
        <div className="w-60 flex flex-col gap-2.5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.1]">
            <span className="text-3xl leading-none">🧀</span>
            <div className="text-left">
              <p className="text-[0.5rem] text-white/35 font-bold uppercase tracking-[0.3em]">{t("game.secretWord")}</p>
              <p className="text-white font-black text-lg leading-tight">{t("how.demo.word")}</p>
            </div>
          </div>
          <div className="self-end px-4 py-2 rounded-2xl rounded-br-sm bg-primary/25 border border-primary/40 text-white text-sm font-semibold">
            {t("how.demo.hint")}
          </div>
          <div className="self-end flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white/85 text-xs font-semibold">
            🅰️ {t("how.demo.ready")} <span className="flex items-center gap-0.5 pl-1.5 border-l border-white/10">{coin}<span className="text-amber-300 font-black">2</span></span>
          </div>
        </div>
      ),
    },
    {
      title: t("how.slide2.title"),
      description: t("how.slide2.desc"),
      funNote: t("how.slide2.fun"),
      accentColor: "#8B5CF6",
      illustration: (
        <div className="w-60 flex flex-col gap-2.5">
          <div className="relative h-32 rounded-2xl bg-[#0a0a0a] border border-white/[0.1] overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 120 64">
              <path d="M30 44 L60 14 L90 44 Z" fill="none" stroke="#FBBF24" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="52" cy="34" r="3" fill="#FBBF24" />
              <circle cx="66" cy="38" r="2.5" fill="#FBBF24" />
              <circle cx="60" cy="27" r="2" fill="#FBBF24" />
            </svg>
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-[0.6rem] font-bold">0:12</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[t("how.demo.opt1"), t("how.demo.word"), t("how.demo.opt2"), t("how.demo.opt3")].map((option, index) => (
              <span
                key={option}
                className={`py-2 rounded-xl text-xs font-bold text-center border ${index === 1 ? "bg-amber-400 text-black border-amber-300" : "bg-white/[0.05] text-white/70 border-white/[0.1]"}`}
              >
                {index === 1 ? "✓ " : ""}{option}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t("how.slide3.title"),
      description: t("how.slide3.desc"),
      funNote: t("how.slide3.fun"),
      accentColor: "#FBBF24",
      illustration: (
        <div className="w-60 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="aspect-square rounded-2xl bg-[#0a0a0a] border border-white/[0.12] flex items-center justify-center">
              <svg className="w-3/4 h-3/4" viewBox="0 0 64 64"><path d="M8 48 L32 14 L56 48 Z" fill="none" stroke="#FBBF24" strokeWidth="3" strokeLinejoin="round" /><circle cx="28" cy="38" r="3" fill="#FBBF24" /><circle cx="38" cy="40" r="2.5" fill="#FBBF24" /></svg>
            </div>
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-secondary/15 to-primary/10 border border-secondary/30 flex items-center justify-center text-5xl">🧀</div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-green-500/10 border border-green-400/40">
            <span className="text-green-300 text-sm font-black">{t("result.guessCorrect")}</span>
            <span className="flex items-center gap-1 text-amber-300 text-xs font-black">+5 {coin}</span>
          </div>
        </div>
      ),
    },
  ];
  const isLast = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  function handleNext() {
    playTap();
    if (isLast) {
      onNext();
    } else {
      playSlide();
      setCurrentSlide(prev => prev + 1);
    }
  }
  function handleSkip() {
    playTap();
    onNext();
  }
  return (
    <div className="relative flex flex-col intro-screen h-screen w-full bg-[#050505] overflow-hidden">
      {/* Background glow - dynamic based on slide */}
      <div
        key={currentSlide}
        className="intro-glow absolute pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse, ${slide.accentColor}99 0%, ${slide.accentColor}55 30%, ${slide.accentColor}18 55%, transparent 72%)`,
        }}
      />
      {/* Header */}
      <header className="relative z-10 pt-12 px-6 flex items-center justify-between">
        <button
          onClick={() => {
            playTap();
            currentSlide > 0 ? setCurrentSlide(prev => prev - 1) : onBack();
          }}
          aria-label={t("common.back")}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-white/60"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleSkip}
          className="text-white/30 text-sm font-medium px-3 py-1.5 rounded-full active:text-white/50 transition-colors"
        >
          {t("how.skip")}
        </button>
      </header>
      {/* Slide content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        <div
          key={currentSlide}
          className="intro-slide flex flex-col items-center text-center w-full"
        >
          {/* Professional illustration */}
          <div className="mb-10">{slide.illustration}</div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            <span
              className="text-[0.55rem] font-bold uppercase tracking-[0.3em]"
              style={{ color: `${slide.accentColor}80` }}
            >
              {t("how.step")} {currentSlide + 1}/{slides.length}
            </span>
          </div>
          {/* Title */}
          <h2 className="font-display text-[1.75rem] font-black tracking-tight text-white mb-3 leading-tight">
            {slide.title}
          </h2>
          {/* Description */}
          <p className="text-white/45 text-[0.95rem] font-medium leading-relaxed max-w-[300px] mb-5">
            {slide.description}
          </p>
          {/* Fun note - styled as a chat bubble */}
          <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.04] border border-white/[0.06]">
            <span className="text-white/40 text-xs font-medium italic">
              {slide.funNote}
            </span>
          </div>
        </div>
      </main>
      {/* Bottom section - dots + CTA */}
      <footer className="relative z-10 px-6 pb-10">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                playTap();
                setCurrentSlide(i);
              }}
              aria-label={`${t("how.step")} ${i + 1}`}
              aria-current={i === currentSlide ? "step" : undefined}
              className="rounded-full"
              style={{
                width: i === currentSlide ? "2rem" : "0.5rem",
                height: "0.5rem",
                backgroundColor:
                  i === currentSlide
                    ? slide.accentColor
                    : "rgba(255,255,255,0.15)",
                boxShadow:
                  i === currentSlide
                    ? `0 0 10px ${slide.accentColor}50`
                    : "none",
              }}
            />
          ))}
        </div>
        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="w-full font-bold text-lg py-[1.1rem] rounded-2xl relative overflow-hidden active:scale-[0.98] transition-transform duration-100"
          style={{
            backgroundColor: "#FBBF24",
            border: "none",
            color: "#111111",
            boxShadow: "0 0 30px rgba(251,191,36,0.35)",
          }}
        >
          <span className="relative z-10">
            {isLast ? t("how.letsgo") : t("how.continue")}
          </span>
          <div className="intro-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </button>
      </footer>
    </div>
  );
}
