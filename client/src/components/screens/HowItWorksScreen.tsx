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
  const slides = [
    {
      title: t("how.slide1.title"),
      description: t("how.slide1.desc"),
      funNote: t("how.slide1.fun"),
      accentColor: "#FF1A6C",
      illustration: (
        <div className="relative w-48 h-48">
          {/* Chat bubble illustration */}
          <div className="intro-bubble absolute top-4 left-4 px-5 py-3 rounded-2xl rounded-bl-sm bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30">
            <span className="text-white font-bold text-sm">Kedi 🐱</span>
          </div>
          <div className="intro-bubble intro-bubble-reverse absolute bottom-8 right-4 px-5 py-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-purple-500/30 to-purple-500/10 border border-purple-500/30">
            <span className="text-white font-bold text-sm">Tüylü? 🤔</span>
          </div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(255,26,108,0.2)]">
              💬
            </div>
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
        <div className="relative w-48 h-48">
          {/* Drawing canvas illustration */}
          <div className="intro-canvas absolute inset-4 rounded-2xl bg-white/[0.04] border border-white/[0.1] overflow-hidden">
            {/* Simulated drawing strokes */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <path
                d="M 20 50 Q 35 20 50 50 T 80 50"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="35"
                r="12"
                fill="none"
                stroke="#FF1A6C"
                strokeWidth="2.5"
              />
              <path
                d="M 30 70 L 40 65 L 50 72 L 60 60 L 70 70"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* Timer badge */}
          <div className="absolute -top-1 -right-1 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[0.6rem] font-bold">
            0:10
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
        <div className="relative w-48 h-48">
          {/* AI scoring illustration with generated image */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <img
                src="/images/scoring.svg"
                width="144"
                height="144"
                decoding="async"
                alt="Drawing score"
                className="w-36 h-36 rounded-2xl object-cover border border-white/[0.1] shadow-[0_0_40px_rgba(251,191,36,0.15)]"
              />
              {/* Score badge */}
              <div className="intro-badge absolute -top-3 -right-3 size-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                <span className="text-black font-black text-xs">9.2</span>
              </div>
              {/* Roast bubble */}
              <div className="absolute -bottom-4 -left-6 px-3 py-1.5 rounded-xl rounded-bl-sm bg-white/[0.08] border border-white/[0.1] max-w-[120px]">
                <span className="text-white/70 text-[0.55rem]">
                  Bu kedi mi yoksa patates mi? 😂
                </span>
              </div>
            </div>
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
            backgroundColor: isLast
              ? slide.accentColor
              : "rgba(255,255,255,0.06)",
            border: isLast ? "none" : "1px solid rgba(255,255,255,0.1)",
            color: "white",
            boxShadow: isLast ? `0 0 30px ${slide.accentColor}40` : "none",
          }}
        >
          <span className="relative z-10">
            {isLast ? t("how.letsgo") : t("how.continue")}
          </span>
          {isLast && (
            <div className="intro-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          )}
        </button>
      </footer>
    </div>
  );
}
