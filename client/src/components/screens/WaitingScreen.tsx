/**
 * DESIGN: Electric Pulse - Waiting Screen
 * Room code display with copy, animated waiting, rotating playful messages
 * i18n + sound effects + push notifications integrated
 */

import { useState, useEffect } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocalizedPlayfulMessage } from "@/lib/i18n";
import { playTap, playCopy } from "@/lib/sounds";
import { startPartnerWaitingNotifications, stopPartnerWaitingNotifications } from "@/lib/notifications";
import { toast } from "sonner";
import { copyText } from "@/lib/imageUtils";

interface Props {
  code: string | null;
  onBack: () => void;
  onProfile: () => void;
}

export default function WaitingScreen({ code, onBack, onProfile }: Props) {
  const { t } = useLocale();
  const [message, setMessage] = useState(getLocalizedPlayfulMessage("waiting"));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessage(getLocalizedPlayfulMessage("waiting"));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Start push notifications when waiting (partner hasn't joined yet)
  useEffect(() => {
    startPartnerWaitingNotifications();
    return () => stopPartnerWaitingNotifications();
  }, []);

  async function copyCode() {
    if (!code) return;
    playCopy();
    if (await copyText(code)) {
      setCopied(true);
      toast.success(t("waiting.codeCopied"));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info(`Room code: ${code}`);
    }
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Animated background pulse */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-secondary"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 px-6 flex items-center justify-between">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="size-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(139,92,246,0.8)]"
          />
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-white/50">{t("waiting.badge")}</span>
        </div>
        <button
          onClick={() => { playTap(); onProfile(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/50">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Animated waiting icon */}
        <motion.div className="mb-6 relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-20px] border border-dashed border-white/[0.06] rounded-full"
          />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
                className="size-4 rounded-full bg-gradient-to-b from-primary to-secondary shadow-[0_0_12px_rgba(255,26,108,0.5)]"
              />
            ))}
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-black tracking-tight text-white mb-1 text-center"
        >
          {t("waiting.title")}
        </motion.h2>
        <p className="text-white/30 text-sm mb-8">{t("waiting.subtitle")}</p>

        {/* Room Code */}
        {code && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyCode}
              className={`relative px-10 py-5 rounded-2xl border-2 transition-all ${
                copied
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/[0.03] border-white/[0.1] hover:border-white/[0.2]'
              }`}
            >
              <span className="font-mono text-4xl font-bold tracking-[0.25em] text-white block">
                {code}
              </span>
              <span className="text-white/30 text-xs mt-2 block">
                {copied ? t("waiting.copied") : t("waiting.tapCopy")}
              </span>
            </motion.button>
          </motion.div>
        )}

        {/* Playful rotating message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-10 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] max-w-[280px]"
          >
            <p className="text-white/30 text-sm text-center">{message}</p>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
