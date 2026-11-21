/**
 * Email sign-in without a password: type your address, get a 6-digit code, type the code.
 * For people who'd rather not use Apple or Google.
 */
import { useEffect, useRef, useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { EmailAuthError, startEmailSignIn, verifyEmailCode } from "@/lib/auth";
import { playError, playSuccess, playTap } from "@/lib/sounds";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const RESEND_SECONDS = 45;

export default function EmailSignInSheet({ open, onClose, onSignedIn }: Props) {
  const { t, locale } = useLocale();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setStep("email"); setCode(""); setError(""); setBusy(false); }
  }, [open]);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait(wait - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);
  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  function explain(failure: unknown) {
    const reason = failure instanceof EmailAuthError ? failure.message : "";
    const key: Record<string, string> = {
      BAD_EMAIL: "email.badEmail", WRONG_CODE: "email.wrongCode", BAD_CODE: "email.wrongCode",
      CODE_EXPIRED: "email.expired", WAIT_BEFORE_RESEND: "email.wait", RATE_LIMITED: "email.wait",
      EMAIL_NOT_CONFIGURED: "email.unavailable", EMAIL_SEND_FAILED: "email.sendFailed", NETWORK: "email.network",
    };
    playError();
    setError(t(key[reason] || "login.failed"));
    if (reason === "CODE_EXPIRED") { setStep("email"); setCode(""); }
  }

  async function sendCode() {
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) { setError(t("email.badEmail")); return; }
    playTap(); setBusy(true); setError("");
    try {
      await startEmailSignIn(email.trim(), locale);
      setStep("code"); setWait(RESEND_SECONDS);
    } catch (failure) {
      explain(failure);
    } finally {
      setBusy(false);
    }
  }

  async function checkCode(value: string) {
    if (busy || value.length !== 6) return;
    setBusy(true); setError("");
    try {
      await verifyEmailCode(email.trim(), value);
      playSuccess();
      onSignedIn();
    } catch (failure) {
      explain(failure);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 flex items-end"
          onClick={busy ? undefined : onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="cc-sketchbook relative w-full rounded-t-[28px] bg-[#0E0C12] border-t border-white/10 px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-[#F7F3FF]"
            role="dialog" aria-modal="true" aria-labelledby="email-sheet-title"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="email-sheet-title" className="font-display text-[1.6rem] leading-tight font-bold tracking-[-0.02em]">
                    {step === "email" ? t("email.title") : t("email.codeTitle")}
                  </h2>
                  <p className="mt-2 text-[#B9B3C7] text-[0.95rem] leading-relaxed">
                    {step === "email" ? t("email.lead") : t("email.codeLead").replace("{email}", email.trim())}
                  </p>
                </div>
                <button onClick={onClose} aria-label={t("email.close")} className="shrink-0 size-9 rounded-full bg-white/[0.07] text-white/70 text-lg">×</button>
              </div>

              {step === "email" ? (
                <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void sendCode(); }}>
                  <label className="sr-only" htmlFor="cc-email">{t("email.placeholder")}</label>
                  <input
                    id="cc-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }}
                    placeholder={t("email.placeholder")} autoFocus
                    className="w-full h-14 rounded-2xl bg-white/[0.06] border border-white/15 px-4 text-base text-white placeholder:text-white/35 outline-none focus:border-[#FF1A6C]"
                  />
                  {error && <p className="mt-3 text-sm text-[#FF6B9A]" role="alert">{error}</p>}
                  <button type="submit" disabled={busy} className="cc-press mt-4 w-full h-14 rounded-2xl bg-[#FF1A6C] text-white font-bold text-base disabled:opacity-60">
                    {busy ? t("email.sending") : t("email.send")}
                  </button>
                </form>
              ) : (
                <div className="mt-6">
                  <label className="sr-only" htmlFor="cc-code">{t("email.codeLabel")}</label>
                  <input
                    id="cc-code" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                    value={code}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(value); setError("");
                      if (value.length === 6) void checkCode(value);
                    }}
                    className="w-full h-16 rounded-2xl bg-white/[0.06] border border-white/15 text-center font-display text-[2rem] font-bold tracking-[0.5em] pl-[0.5em] text-white outline-none focus:border-[#FF1A6C]"
                  />
                  {error && <p className="mt-3 text-sm text-[#FF6B9A]" role="alert">{error}</p>}
                  <p className="mt-4 text-sm text-[#8C8798]">{t("email.spam")}</p>
                  <div className="mt-3 flex items-center justify-between text-sm font-semibold">
                    <button onClick={() => { playTap(); setStep("email"); setCode(""); setError(""); }} className="text-[#B9B3C7] py-2">
                      {t("email.change")}
                    </button>
                    <button onClick={() => void sendCode()} disabled={wait > 0 || busy} className="text-[#FBBF24] py-2 disabled:text-[#5D5869]">
                      {wait > 0 ? t("email.resendIn").replace("{s}", String(wait)) : t("email.resend")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
