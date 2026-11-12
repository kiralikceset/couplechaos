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
              <p className="text-[0.65rem] text-[#8C8798] font-semibold">{t("game.secretWord")}</p>
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
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      {/* Header: back · progress · skip */}
      <header className="relative z-10 pt-11 px-5 flex items-center gap-4">
        <button
          onClick={() => {
            playTap();
            currentSlide > 0 ? setCurrentSlide(prev => prev - 1) : onBack();
          }}
          aria-label={t("common.back")}
          className="size-10 flex-shrink-0 rounded-full bg-[#17141D] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/70"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 grid grid-cols-3 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={slides.length} aria-valuenow={currentSlide + 1}>
          {slides.map((item, i) => (
            <button
              key={i}
              onClick={() => { playTap(); setCurrentSlide(i); }}
              aria-label={`${i + 1}/${slides.length}`}
              className="h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i <= currentSlide ? item.accentColor : "#2A2533" }}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          className="cc-press flex-shrink-0 inline-flex items-center gap-1 h-10 pl-4 pr-3 rounded-full bg-[#17141D] text-[#F7F3FF] text-sm font-semibold"
        >
          {t("how.skip")}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-[#8C8798]">
            <path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" />
          </svg>
        </button>
      </header>

      {/* Slide: a coloured frame around a little game screen */}
      <main key={currentSlide} className="intro-slide relative z-10 flex-1 flex flex-col justify-center px-6">
        <div className="rounded-[28px] p-4" style={{ backgroundColor: slide.accentColor }}>
          <div className="rounded-[20px] bg-[#07060A] py-6 flex justify-center">{slide.illustration}</div>
        </div>
        <h2 className="mt-7 font-display text-[1.9rem] leading-[1.05] font-bold tracking-[-0.02em]">{slide.title}</h2>
        <p className="mt-3 text-[#B9B3C7] text-base leading-relaxed max-w-[340px]">{slide.description}</p>
      </main>

      <footer className="relative z-10 px-6 pb-10 pt-6">
        <button
          onClick={handleNext}
          className="cc-press w-full h-14 rounded-2xl bg-[#F7F3FF] text-[#07060A] font-bold text-base"
        >
          {isLast ? t("how.letsgo") : t("how.continue")}
        </button>
      </footer>
    </div>
  );
}
