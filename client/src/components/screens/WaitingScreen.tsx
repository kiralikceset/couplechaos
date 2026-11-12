/**
 * Waiting room: invite by WhatsApp or link (joins by itself), or say the code.
 * i18n + sound effects + push notifications integrated
 */

import { useState, useEffect } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap, playCopy } from "@/lib/sounds";
import { startPartnerWaitingNotifications, stopPartnerWaitingNotifications } from "@/lib/notifications";
import { toast } from "sonner";
import { copyText } from "@/lib/imageUtils";
import socket from "@/lib/socket";
import { inviteUrl } from "@/lib/invite";

interface Props {
  code: string | null;
  onBack: () => void;
  onProfile: () => void;
}

export default function WaitingScreen({ code, onBack, onProfile }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  // Start push notifications when waiting (partner hasn't joined yet)
  useEffect(() => {
    startPartnerWaitingNotifications();
    return () => stopPartnerWaitingNotifications();
  }, []);

  const link = code ? inviteUrl(code, socket.baseUrl) : "";
  const inviteMessage = t("waiting.inviteText").replace("{url}", link);

  function inviteOnWhatsApp() {
    playTap();
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, "_blank", "noopener");
  }

  async function shareLink() {
    playTap();
    const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    try {
      if (capacitor?.isNativePlatform?.()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: "Couple Chaos", text: inviteMessage });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Couple Chaos", text: inviteMessage });
        return;
      }
    } catch (error) {
      const text = String((error as { message?: string })?.message || error).toLowerCase();
      if ((error instanceof DOMException && error.name === "AbortError") || text.includes("cancel")) return;
    }
    if (await copyText(link)) toast.success(t("waiting.codeCopied"));
  }

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
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <header className="relative z-10 pt-11 px-5 flex items-center justify-between">
        <button
          onClick={() => { playTap(); onBack(); }}
          aria-label={t("common.back")}
          className="size-10 rounded-full bg-[#17141D] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/70"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <button
          onClick={() => { playTap(); onProfile(); }}
          aria-label={t("profile.title")}
          className="size-10 rounded-full bg-[#17141D] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/60"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center px-6">
        <h1 className="font-display text-[2.1rem] leading-[1.05] font-bold tracking-[-0.02em]">{t("waiting.heading")}</h1>
        <p className="mt-2 text-[#B9B3C7] text-base">{t("waiting.lead")}</p>

        {code && (
          <div className="mt-7 flex flex-col gap-2">
            <button
              onClick={inviteOnWhatsApp}
              className="cc-press h-14 rounded-2xl bg-[#25D366] text-[#07240F] font-bold text-base flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" /></svg>
              {t("waiting.whatsapp")}
            </button>
            <button
              onClick={() => void shareLink()}
              className="cc-press h-12 rounded-2xl bg-[#17141D] text-[#F7F3FF] text-sm font-semibold"
            >
              🔗 {t("waiting.shareLink")}
            </button>

            {/* The code, for telling it out loud */}
            <button
              onClick={copyCode}
              className="cc-press mt-4 rounded-[24px] border-2 border-dashed border-[#2A2533] px-5 py-5 text-center"
            >
              <span className="block text-sm text-[#8C8798]">{t("waiting.orCode")}</span>
              <span className="mt-1 block font-display text-[2.6rem] font-bold tracking-[0.18em] tabular-nums">{code}</span>
              <span className="block text-xs text-[#8C8798]">{copied ? t("waiting.copied") : t("waiting.tapCopy")}</span>
            </button>
          </div>
        )}
      </main>

      <footer className="relative z-10 px-6 pb-10 pt-4 flex items-center justify-center gap-2 text-[#8C8798] text-sm" role="status" aria-live="polite">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-[#FF1A6C]"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </span>
        {t("waiting.status")}
      </footer>
    </div>
  );
}
