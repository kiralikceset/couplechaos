/**
 * DESIGN: Electric Pulse - Login Screen
 * Professional login with Google + Apple sign-in
 * Beautiful aurora background, premium feel
 * Flow: After onboarding → Login → Premium → Home
 */

import { useEffect, useRef, useState } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { playError, playSuccess, playTap } from "@/lib/sounds";
import { toast } from "sonner";
import { AuthCancelled, getAvailableProviders, isWebPlatform, renderGoogleWebButton, signIn, type AuthProvider } from "@/lib/auth";
import PrivacySheet from "@/components/PrivacySheet";

interface Props {
  onSkip: () => void;
  onSignedIn?: () => void;
}

export default function LoginScreen({ onSkip, onSignedIn }: Props) {
  const { t, locale } = useLocale();
  const webGoogleRef = useRef<HTMLDivElement>(null);
  const useWebGoogle = isWebPlatform() && getAvailableProviders().includes("google");
  const providers = getAvailableProviders();
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  async function handleProviderLogin(provider: AuthProvider) {
    if (busy) return;
    playTap();
    setBusy(provider);
    try {
      await signIn(provider);
      playSuccess();
      (onSignedIn || onSkip)();
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
        (onSignedIn || onSkip)();
      } else if (error instanceof AuthCancelled) {
        toast(t("login.cancelled"));
      } else if (error) {
        console.warn("[auth]", error);
        playError();
        toast.error(t("login.failed"));
      }
    }, locale).catch((error) => console.warn("[auth] Google button unavailable", error));
  }, [useWebGoogle, locale]);

  function handleSkip() {
    playTap();
    try { localStorage.setItem("cc_logged_in", "guest"); } catch { /* Continue in memory. */ }
    onSkip();
  }

  return (
    <div className="cc-sketchbook relative flex flex-col h-[100dvh] w-full bg-[#07060A] text-[#F7F3FF] overflow-hidden">
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-12">
        {/* What you keep when you sign in */}
        <div className="flex gap-2.5" aria-hidden>
          <span className="flex-1 h-24 rounded-[22px] bg-[#FF1A6C] flex flex-col justify-between p-3"><span className="text-2xl">🔥</span><span className="h-2 w-10 rounded-full bg-white/60" /></span>
          <span className="flex-1 h-24 rounded-[22px] bg-[#FBBF24] flex flex-col justify-between p-3 mt-5"><span className="text-2xl">🪙</span><span className="h-2 w-8 rounded-full bg-black/40" /></span>
          <span className="flex-1 h-24 rounded-[22px] bg-[#8B5CF6] flex flex-col justify-between p-3 mt-2"><span className="text-2xl">🎨</span><span className="h-2 w-12 rounded-full bg-white/60" /></span>
        </div>
        <h1 className="mt-8 font-display text-[2.1rem] leading-[1.05] font-bold tracking-[-0.02em]">{t("login.heading")}</h1>
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

          <button
            onClick={handleSkip}
            disabled={busy !== null}
            className={`w-full text-center font-semibold transition-colors ${
              providers.length
                ? "text-[#B9B3C7] text-sm py-3"
                : "bg-[#F7F3FF] text-[#07060A] text-base h-14 rounded-2xl"
            }`}
          >
            {providers.length ? t("login.guest") : t("login.skip")}
          </button>

          <p className="text-[#8C8798] text-xs text-center leading-relaxed px-4">
            {t("login.terms")}{" "}
            <button onClick={() => { playTap(); setPrivacyOpen(true); }} className="underline text-[#B9B3C7]">
              {t("login.privacyLink")}
            </button>
          </p>
        </div>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
