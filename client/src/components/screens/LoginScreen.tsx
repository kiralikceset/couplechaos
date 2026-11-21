/**
 * Login: a taped polaroid of the couple draws itself, and what sign-in keeps
 * (streak, tokens, drawings) floats around it as stickers. Google + Apple sign-in.
 * Flow: After onboarding → Login → Premium → Home
 */

import { useEffect, useRef, useState } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { playError, playSuccess, playTap } from "@/lib/sounds";
import { toast } from "sonner";
import { AuthCancelled, getAvailableProviders, isWebPlatform, renderGoogleWebButton, signIn, type AuthProvider } from "@/lib/auth";
import PrivacySheet from "@/components/PrivacySheet";
import EmailSignInSheet from "@/components/EmailSignInSheet";

interface Props {
  onSignedIn: () => void;
}

/** There is no guest mode: Apple, Google or email (a 6-digit code). */
export default function LoginScreen({ onSignedIn }: Props) {
  const { t, locale } = useLocale();
  const webGoogleRef = useRef<HTMLDivElement>(null);
  const useWebGoogle = isWebPlatform() && getAvailableProviders().includes("google");
  const providers = getAvailableProviders();
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  async function handleProviderLogin(provider: AuthProvider) {
    if (busy) return;
    playTap();
    setBusy(provider);
    try {
      await signIn(provider);
      playSuccess();
      onSignedIn();
    } catch (error) {
      if (error instanceof AuthCancelled) {
        toast(t("login.cancelled"));
      } else {
        console.warn("[auth]", error);
        playError();
        toast.error(t("login.failed"));
      }
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!useWebGoogle || !webGoogleRef.current) return;
    renderGoogleWebButton(webGoogleRef.current, ({ account, error }) => {
      if (account) {
        playSuccess();
        onSignedIn();
      } else if (error instanceof AuthCancelled) {
        toast(t("login.cancelled"));
      } else if (error) {
        console.warn("[auth]", error);
        playError();
        toast.error(t("login.failed"));
      }
    }, locale).catch((error) => console.warn("[auth] Google button unavailable", error));
  }, [useWebGoogle, locale]);

  return (
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-10">
        {/* Hero: a taped polaroid of the two of you, drawing itself. What you keep floats around it. */}
        <div className="relative mx-auto w-full max-w-[300px]" aria-hidden>
          <div className="cc-login-card relative mx-auto w-[78%] rounded-[22px] bg-[#FF1A6C] p-3 pb-4 shadow-[0_26px_50px_-22px_rgba(255,26,108,0.65)]">
            <span className="absolute -top-3 left-1/2 -ml-10 h-6 w-20 rotate-[-4deg] rounded-[4px] bg-[#FBBF24]/85" />
            <div className="aspect-[1.15] rounded-[14px] bg-[#FFF4F8] text-[#07060A]">
              <svg viewBox="0 10 230 160" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="cc-login-draw h-full w-full">
                <path pathLength={1} strokeWidth={5} d="M38 118 C 30 82, 52 58, 82 60 C 110 62, 122 88, 116 116 C 110 144, 46 148, 38 118 Z" />
                <path pathLength={1} strokeWidth={5} className="cc-d2" d="M120 112 C 116 80, 138 58, 166 62 C 196 66, 206 94, 196 120 C 186 146, 126 142, 120 112 Z" />
                <path pathLength={1} strokeWidth={4.5} className="cc-d3" d="M44 76 C 54 50, 92 44, 108 70 M126 74 C 136 52, 176 46, 192 76 M150 58 l -4 -14 M164 58 l 6 -14" />
                <path pathLength={1} strokeWidth={4} className="cc-d4" d="M64 100 h 2 M92 98 h 2 M66 118 q 12 12 24 0 M146 98 q 5 -6 10 0 M174 98 q 5 -6 10 0 M150 118 q 12 10 26 0" />
                <path pathLength={1} strokeWidth={4.5} stroke="#FF1A6C" className="cc-d5" d="M118 52 C 104 40, 98 30, 106 24 C 112 19, 118 24, 118 30 C 118 24, 124 19, 130 24 C 138 30, 132 40, 118 52 Z" />
              </svg>
            </div>
            <p className="mt-2.5 text-center text-white font-display font-bold text-[1.05rem] tracking-[-0.01em]">{t("login.caption")}</p>
          </div>
          <span className="cc-login-chip cc-chip-1 absolute -left-1 top-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#FBBF24] text-2xl shadow-lg">🔥</span>
          <span className="cc-login-chip cc-chip-2 absolute -right-2 top-[38%] flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#8B5CF6] text-2xl shadow-lg">🎨</span>
          <span className="cc-login-chip cc-chip-3 absolute left-2 bottom-4 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#F7F3FF] text-xl shadow-lg">🪙</span>
        </div>
        <h1 className="mt-9 font-display text-[2.1rem] leading-[1.05] font-bold tracking-[-0.02em]">{t("login.heading")}</h1>
        <p className="mt-3 text-[#B9B3C7] text-base leading-relaxed max-w-[320px]">{t("login.lead")}</p>
      </main>

        <div className="relative z-10 px-6 pb-10 pt-6 space-y-3">
          {providers.includes("apple") && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleProviderLogin("apple")}
              disabled={busy !== null}
              className="w-full h-14 flex items-center justify-center gap-3 bg-[#F7F3FF] text-black font-semibold text-base rounded-2xl disabled:opacity-60"
            >
              <svg width="18" height="20" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true">
                <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-2.159-3.816-2.159-1.624 0-2.94.968-3.726.968-.81 0-2.04-.943-3.36-.918C2.612 4.797.877 6.093.877 8.874c0 1.661.645 3.42 1.44 4.56.79 1.14 1.657 2.293 2.84 2.25 1.14-.044 1.57-.737 2.95-.737 1.36 0 1.75.737 2.95.713 1.23-.02 1.98-1.16 2.76-2.3.87-1.32 1.23-2.6 1.25-2.67-.027-.01-2.4-.92-2.42-3.65l-.1-.8z"/>
                <path d="M11.15 3.21c.66-.8 1.1-1.9 .98-3.01-.95.04-2.1.63-2.78 1.43-.6.7-1.13 1.82-.99 2.9 1.06.08 2.14-.54 2.79-1.32z"/>
              </svg>
              {busy === "apple" ? t("login.signingIn") : t("login.apple")}
            </motion.button>
          )}

          {useWebGoogle && (
            <div ref={webGoogleRef} className="w-full min-h-[44px] flex justify-center" />
          )}

          {providers.includes("google") && !useWebGoogle && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleProviderLogin("google")}
              disabled={busy !== null}
              className="w-full h-14 flex items-center justify-center gap-3 bg-[#131314] text-[#E3E3E3] font-semibold text-base rounded-2xl border border-[#8E918F] disabled:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {busy === "google" ? t("login.signingIn") : t("login.google")}
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { playTap(); setEmailOpen(true); }}
            disabled={busy !== null}
            className={`w-full h-14 flex items-center justify-center gap-3 font-semibold text-base rounded-2xl disabled:opacity-60 ${
              providers.length || useWebGoogle
                ? "bg-transparent text-[#F7F3FF] border border-white/25"
                : "bg-[#F7F3FF] text-[#07060A]"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            {t("login.email")}
          </motion.button>

          <p className="text-[#8C8798] text-xs text-center leading-relaxed px-4">
            <button onClick={() => { playTap(); setPrivacyOpen(true); }} className="underline decoration-white/30 underline-offset-2">
              {t("login.privacy")}
            </button>
          </p>
        </div>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <EmailSignInSheet open={emailOpen} onClose={() => setEmailOpen(false)} onSignedIn={() => { setEmailOpen(false); onSignedIn(); }} />
    </div>
  );
}
