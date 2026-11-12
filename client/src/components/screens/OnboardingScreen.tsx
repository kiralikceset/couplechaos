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
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-12">
        {/* The game in one picture */}
        <div className="grid grid-cols-[1.25fr_1fr] gap-3">
          <div className="aspect-square rounded-[24px] bg-[#FF1A6C] p-4 text-white" aria-hidden>
            <CatDoodle />
          </div>
          <div className="aspect-square rounded-[24px] bg-[#17141D] flex items-center justify-center self-end" aria-hidden>
            <span className="text-[3.5rem] leading-none">🐱</span>
          </div>
        </div>
        <p className="cc-verdict mt-3 self-start max-w-[92%] rounded-[20px] rounded-tl-[6px] bg-[#FBBF24] text-[#07060A] px-4 py-3 text-[0.95rem] font-semibold leading-snug">
          {t("onboarding.verdict")}
        </p>
      </main>

      <footer className="relative z-10 px-6 pb-10 pt-8">
        <h1 className="font-display text-[2.75rem] leading-[0.95] font-bold tracking-[-0.03em]">Couple Chaos</h1>
        <p className="mt-3 text-[#B9B3C7] text-base leading-relaxed max-w-[320px]">{t("onboarding.pitch")}</p>
        <button
          onClick={() => { playTap(); onNext(); }}
          className="cc-press mt-7 w-full h-14 rounded-2xl bg-[#F7F3FF] text-[#07060A] font-bold text-base"
        >
          {t("onboarding.cta")}
        </button>
      </footer>
    </div>
  );
}
