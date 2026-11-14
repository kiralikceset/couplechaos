/**
 * Shown while the AI scores the drawing (a few seconds).
 * The drawing itself sits in the middle with a scan line passing over it, and three steps
 * tick off underneath, so the wait reads as work being done rather than a spinner.
 */
import { useEffect, useState } from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";

const STEP_MS = 1500;

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="#07060A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function JudgingView({ image }: { image: string | null }) {
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();
  const steps = [t("game.judgeStep1"), t("game.judgeStep2"), t("game.judgeStep3")];
  const [done, setDone] = useState(0);

  useEffect(() => {
    // The last step stays "in progress" until the result arrives.
    const timers = [1, 2].map((n) => window.setTimeout(() => setDone(n), n * STEP_MS));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <div className="cc-sketchbook relative flex flex-col items-center justify-center h-[100dvh] w-full bg-[#07060A] px-8">
      <motion.div
        initial={{ opacity: 0, y: 12, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
        className="relative w-[min(64vw,260px)] aspect-[3/4] rounded-[22px] bg-[#0A0A0A] border-[3px] border-[#2A2533] shadow-[10px_10px_0_#17141D] overflow-hidden"
      >
        {image ? (
          <img src={image} alt="" className="absolute inset-0 size-full object-contain" />
        ) : (
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto size-1/2 opacity-30" aria-hidden>
            <path d="M18 70 C 30 40, 48 78, 60 44 S 82 30, 84 52" fill="none" stroke="#F7F3FF" strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}
        {!reduceMotion && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 h-16 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(139,92,246,0) 0%, rgba(139,92,246,0.28) 85%, #8B5CF6 100%)" }}
            initial={{ top: "-20%" }}
            animate={{ top: ["-20%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.15 }}
          />
        )}
      </motion.div>

      <h2 className="mt-9 font-display text-[1.6rem] leading-tight font-bold tracking-[-0.02em] text-[#F7F3FF] text-center">
        {t("game.judgingTitle")}
      </h2>

      <ol className="mt-5 flex flex-col gap-3 w-full max-w-[260px]" aria-live="polite">
        {steps.map((label, index) => {
          const state = index < done ? "done" : index === done ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`size-6 shrink-0 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  state === "done" ? "bg-[#FBBF24]" : state === "active" ? "border-2 border-[#8B5CF6]" : "border-2 border-[#2A2533]"
                }`}
              >
                {state === "done" ? (
                  <Check />
                ) : state === "active" ? (
                  <motion.span
                    className="size-2 rounded-full bg-[#8B5CF6]"
                    animate={reduceMotion ? undefined : { opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : null}
              </span>
              <span className={`text-[0.95rem] font-semibold transition-colors duration-300 ${state === "todo" ? "text-[#5E5869]" : "text-[#F7F3FF]"}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
