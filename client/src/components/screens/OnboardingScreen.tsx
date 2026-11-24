/**
 * First screen — the game in one picture: a doodle draws itself, the real thing
 * sits next to it, and the AI jury delivers its verdict. Then one button.
 * Same sketchbook look as the home screen.
 */
import { useLocale } from "@/contexts/LocaleContext";
import { playTap } from "@/lib/sounds";

interface Props {
  onNext: () => void;
  onProfile: () => void;
  transport: "online" | "local" | "connecting" | "offline";
}

/** A wobbly cat, drawn the way people actually draw on a phone. */
function CatDoodle() {
  return (
    <svg viewBox="0 0 140 120" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="cc-draw w-full h-full">
      <path pathLength={1} strokeWidth={4.5} d="M30 92 C 22 62, 34 38, 62 36 C 92 33, 112 54, 108 84 C 104 104, 44 108, 30 92 Z" />
      <path pathLength={1} strokeWidth={4.5} className="cc-draw-3" d="M40 44 L 34 16 L 58 36 M88 36 L 106 14 L 104 46" />
      <path pathLength={1} strokeWidth={4} className="cc-draw-2" d="M54 64 h 2 M84 62 h 2 M66 76 q 4 4 8 0 M38 74 l -24 -4 M38 82 l -22 4 M104 72 l 26 -6 M104 80 l 24 4" />
    </svg>
  );
}

export default function OnboardingScreen({ onNext }: Props) {
  const { t } = useLocale();
  return (
    <div className="cc-welcome relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <div className="cc-welcome-glow" aria-hidden />

      {/* The game in one scene: a partner's drawing, the real thing, the AI's score and verdict */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pt-[max(env(safe-area-inset-top),2.5rem)]">
        <div className="cc-w-stage relative w-full max-w-[340px] h-[330px]" aria-hidden>
          <div className="cc-w-real absolute right-0 top-6 w-[46%] aspect-[4/5] rounded-[22px] bg-[#1C1824] border border-white/10 flex flex-col items-center justify-center shadow-[0_24px_40px_-18px_rgba(0,0,0,.8)]">
            <span className="text-[4.2rem] leading-none">🐱</span>
            <span className="mt-2 text-[0.7rem] font-semibold text-white/55">{t("onboarding.real")}</span>
          </div>
          <div className="cc-w-paper absolute left-0 top-0 w-[64%] aspect-[4/5] rounded-[10px] bg-[#FFF9F2] p-4 text-[#FF1A6C] shadow-[0_30px_50px_-20px_rgba(255,26,108,.55),0_10px_20px_-10px_rgba(0,0,0,.6)]">
            <div className="cc-w-tape" />
            <div className="h-full pt-4"><CatDoodle /></div>
            <span className="absolute left-4 top-3 text-[0.7rem] font-semibold text-[#07060A]/45">{t("onboarding.drawing")}</span>
          </div>
          <div className="cc-w-stamp absolute left-[40%] top-[50%] size-[86px] rounded-full border-[3px] border-[#FF1A6C] bg-[#07060A]/85 backdrop-blur flex flex-col items-center justify-center">
            <span className="font-display text-[1.9rem] font-bold leading-none text-[#FF1A6C]">23</span>
            <span className="text-[0.6rem] font-bold text-white/60">/100</span>
          </div>
          <p className="cc-w-verdict absolute left-2 right-6 bottom-0 rounded-[18px] rounded-tl-[6px] bg-[#FBBF24] text-[#07060A] px-4 py-3 text-[0.9rem] font-semibold leading-snug shadow-[0_16px_30px_-14px_rgba(251,191,36,.6)]">
            {t("onboarding.verdict")}
          </p>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-6">
        <p className="cc-w-up inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-[0.75rem] font-semibold text-white/75">
          <span className="text-[#FF1A6C]">♥</span>{t("onboarding.kicker")}
        </p>
        <h1 className="cc-w-up font-display mt-3 text-[3.1rem] leading-[0.92] font-bold tracking-[-0.035em]" style={{ animationDelay: ".08s" }}>
          Couple<br />Chaos
        </h1>
        <p className="cc-w-up mt-3 text-[#B9B3C7] text-[0.95rem] leading-relaxed max-w-[320px]" style={{ animationDelay: ".16s" }}>{t("onboarding.pitch")}</p>
        <button
          onClick={() => { playTap(); onNext(); }}
          className="cc-press cc-shine cc-w-up relative overflow-hidden mt-6 w-full h-[58px] rounded-2xl bg-[#FF1A6C] text-white font-bold text-[1.05rem] shadow-[0_18px_36px_-14px_rgba(255,26,108,.75)]"
          style={{ animationDelay: ".24s" }}
        >
          {t("onboarding.cta")}
        </button>
        <p className="cc-w-up mt-3 text-center text-[0.75rem] text-white/45" style={{ animationDelay: ".3s" }}>{t("onboarding.note")}</p>
      </footer>
    </div>
  );
}
