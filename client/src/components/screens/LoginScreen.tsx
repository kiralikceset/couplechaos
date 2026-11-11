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
    <div className="relative flex flex-col h-screen w-full overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0">
        <img
          src="/images/login-bg.webp"
          decoding="async"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#050505]/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-6">
        {/* Top spacer */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* App icon/logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mb-6"
          >
            <img src="/images/app-icon.webp" alt="Couple Chaos" className="size-20 rounded-[1.5rem] shadow-[0_0_40px_rgba(255,26,108,0.35)]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="font-display text-3xl font-black text-white text-center mb-2"
          >
            {t("login.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="text-white/40 text-center text-sm max-w-[280px] leading-relaxed"
          >
            {t("login.subtitle")}
          </motion.p>
        </div>

        {/* Login buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="pb-10 space-y-3"
        >
          {providers.includes("apple") && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleProviderLogin("apple")}
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-[0.95rem] py-[0.95rem] rounded-2xl shadow-lg disabled:opacity-60 transition-all"
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
              className="w-full flex items-center justify-center gap-3 bg-[#131314] text-[#E3E3E3] font-semibold text-[0.95rem] py-[0.95rem] rounded-2xl border border-[#8E918F] disabled:opacity-60 transition-all"
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
                ? "text-white/45 text-sm py-3 active:text-white/70"
                : "bg-primary text-white text-[0.95rem] py-[0.95rem] rounded-2xl glow-primary"
            }`}
          >
            {t("login.skip")}
          </button>

          <p className="text-white/25 text-[0.65rem] text-center leading-relaxed px-4">
            {t("login.terms")}{" "}
            <button onClick={() => { playTap(); setPrivacyOpen(true); }} className="underline text-white/45">
              {t("login.privacyLink")}
            </button>
          </p>
        </motion.div>
      </div>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
