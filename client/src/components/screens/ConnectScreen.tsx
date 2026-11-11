/**
 * DESIGN: Electric Pulse - Connect Screen
 * Create or join room with energetic UI, code input, playful messages
 * Mobile-first with thumb-friendly buttons
 * i18n + sound effects integrated
 */

import { useState, useEffect } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import socket from "@/lib/socket";
import { getProfile } from "@/lib/gameData";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocale, getLocalizedSurpriseMessage } from "@/lib/i18n";
import { playTap, playSend } from "@/lib/sounds";
import { requestNotificationPermission } from "@/lib/notifications";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onProfile: () => void;
  onCategory?: () => void;
  selectedCategory?: string | null;
  mode?: "classic" | "co-draw";
}

export default function ConnectScreen({ onBack, onProfile, onCategory, selectedCategory, mode: gameMode = "classic" }: Props) {
  const { t } = useLocale();
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [funMessage, setFunMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transport, setTransport] = useState(socket.transport);
  const profile = getProfile();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFunMessage(getLocalizedSurpriseMessage());
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handleTransport = ({ transport: nextTransport }: { transport: typeof socket.transport }) => {
      setTransport(nextTransport);
    };
    const handleSuccess = () => setSubmitting(false);
    const handleError = ({ message }: { message?: string }) => {
      setSubmitting(false);
      toast.error(message || t("connect.error"));
    };
    const handleConnectError = ({ message }: { message?: string }) => {
      setSubmitting((wasSubmitting) => {
        if (wasSubmitting) toast.error(message || t("connect.error"));
        return false;
      });
    };
    socket.on("transport_changed", handleTransport);
    socket.on("room_created", handleSuccess);
    socket.on("room_joined", handleSuccess);
    socket.on("join_error", handleError);
    socket.on("protocol_error", handleError);
    socket.on("connect_error", handleConnectError);
    setTransport(socket.transport);
    socket.connect();
    return () => {
      socket.off("transport_changed", handleTransport);
      socket.off("room_created", handleSuccess);
      socket.off("room_joined", handleSuccess);
      socket.off("join_error", handleError);
      socket.off("protocol_error", handleError);
      socket.off("connect_error", handleConnectError);
    };
  }, [t]);

  function handleCreate() {
    if (submitting) return;
    playTap();
    setSubmitting(true);
    socket.emit("create_room", {
      username: profile.username || "Player",
      avatar: profile.avatar,
      mode: gameMode,
      category: selectedCategory || "daily",
      locale: getLocale(),
    });
    void requestNotificationPermission();
  }

  function handleJoin() {
    if (joinCode.trim().length !== 6 || submitting) return;
    playSend();
    setSubmitting(true);
    socket.emit("join_room", {
      code: joinCode.trim().toUpperCase(),
      username: profile.username || "Player",
      avatar: profile.avatar,
      locale: getLocale(),
      mode: "classic",
      category: selectedCategory || "daily",
    });
    void requestNotificationPermission();
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,26,108,0.05)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.05)_0%,transparent_50%)] pointer-events-none" />

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
        <button
          onClick={() => { playTap(); onProfile(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-transform"
        >
          <span className="text-lg">{profile.avatar || "😎"}</span>
          <span className="text-xs font-medium text-white/50 max-w-[80px] truncate">{profile.username || "Player"}</span>
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6">
        <AnimatePresence mode="wait">
          {mode === "choose" ? (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="mb-8">
                <h2 className="font-display text-3xl font-black tracking-tight text-white mb-2">
                  {t("connect.title")}
                </h2>
                <p className="text-white/40 text-sm">
                  {t("connect.subtitle")}
                </p>
                <span className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider border ${gameMode === "co-draw" ? "bg-secondary/10 border-secondary/30 text-secondary" : "bg-primary/10 border-primary/30 text-primary"}`}>
                  {gameMode === "co-draw" ? `🖌️ ${t("home.coDraw")}` : `🎨 ${t("home.classic")}`}
                </span>
                <p className={`mt-3 text-xs font-medium ${transport === "online" ? "text-green-400/70" : transport === "offline" ? "text-red-400/70" : "text-amber-400/70"}`}>
                  {transport === "online"
                    ? t("connect.onlineMode")
                    : transport === "connecting"
                      ? t("connect.connectingMode")
                      : transport === "offline"
                        ? t("connect.offlineMode")
                        : t("connect.localMode")}
                </p>
              </div>

              {/* Create Room */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                disabled={submitting}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 text-left group relative overflow-hidden disabled:opacity-50"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl group-active:scale-90 transition-transform shadow-[0_0_20px_rgba(255,26,108,0.2)]">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg">{t("connect.create")}</h3>
                    <p className="text-white/40 text-sm">{t("connect.create.desc")}</p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/30 ml-auto">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>

              {/* Category Selector */}
              {onCategory && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { playTap(); onCategory(); }}
                  className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-[#FBBF24]/20 border border-[#FBBF24]/30 flex items-center justify-center text-lg">
                      {selectedCategory === "daily_challenge" ? "⭐" : selectedCategory === "romantic" ? "💕" : selectedCategory === "funny" ? "😂" : selectedCategory === "hard" ? "🧠" : selectedCategory === "spicy" ? "🌶️" : "☀️"}
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 text-sm font-medium">{t("cat.title")}</p>
                      <p className="text-white/30 text-xs">
                        {selectedCategory === "daily_challenge"
                          ? t("cat.dailyChallenge")
                          : selectedCategory
                            ? t(`cat.${selectedCategory}`)
                            : t("cat.daily")}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/30">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              )}
              {/* Join Room */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { playTap(); setMode("join"); }}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-secondary/15 to-secondary/5 border border-secondary/25 text-left group relative overflow-hidden"
              >
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                <div className="relative flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center text-2xl group-active:scale-90 transition-transform shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                    🔗
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg">{t("connect.join")}</h3>
                    <p className="text-white/40 text-sm">{t("connect.join.desc")}</p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/30 ml-auto">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-4">
                <h2 className="font-display text-3xl font-black tracking-tight text-white mb-2">
                  {t("connect.enterCode")}
                </h2>
                <p className="text-white/40 text-sm">
                  {t("connect.askPartner")}
                </p>
              </div>

              {/* Code Input */}
              <div className="relative">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(event) => {
                    const value = event.currentTarget.value.replace(/[^a-z0-9]/gi, "").toUpperCase();
                    setJoinCode(value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  maxLength={6}
                  placeholder="• • • • • •"
                  className="w-full text-center font-mono text-4xl font-bold tracking-[0.4em] bg-white/[0.03] border-2 border-white/[0.1] rounded-2xl px-6 py-6 text-white placeholder-white/15 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_30px_rgba(255,26,108,0.15)] transition-all uppercase"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                />
              </div>

              {/* Join Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleJoin}
                disabled={joinCode.length !== 6 || submitting}
                className="w-full bg-secondary text-white font-bold text-lg py-5 rounded-2xl active:scale-[0.97] transition-all disabled:opacity-30 disabled:glow-none glow-secondary relative overflow-hidden"
              >
                <span className="relative z-10">{t("connect.joinGame")}</span>
                {joinCode.length === 6 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[gradient-shift_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
                )}
              </motion.button>

              {/* Back */}
              <button
                onClick={() => { playTap(); setMode("choose"); setJoinCode(""); }}
                className="w-full text-white/40 text-sm font-medium py-2 active:text-white/60"
              >
                {t("connect.backOptions")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fun message */}
      <AnimatePresence>
        {funMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 px-6 pb-10 text-center"
          >
            <p className="text-white/20 text-xs italic">{funMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
