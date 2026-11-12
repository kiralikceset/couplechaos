/**
 * DESIGN: Electric Pulse - Connect Screen
 * Create or join room with energetic UI, code input, playful messages
 * Mobile-first with thumb-friendly buttons
 * i18n + sound effects integrated
 */

import { useEffect, useRef, useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import socket from "@/lib/socket";
import { getProfile } from "@/lib/gameData";
import { useLocale } from "@/contexts/LocaleContext";
import { CATEGORIES, normalizeCategory } from "@/lib/wordPool";
import { getLocale } from "@/lib/i18n";
import { saveProfile } from "@/lib/gameData";
import { playTap, playSend } from "@/lib/sounds";
import { requestNotificationPermission } from "@/lib/notifications";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onProfile: () => void;
  onCategory?: () => void;
  selectedCategory?: string | null;
  mode?: "classic" | "co-draw";
  onSelectCategory?: (category: string) => void;
  /** Opened from "play with AI": one start button, no rooms. */
  solo?: boolean;
}

const CATEGORY_CHIPS = CATEGORIES.map(({ id, emoji }) => ({ id, emoji }));

export default function ConnectScreen({ onBack, onProfile, onCategory, selectedCategory, mode: gameMode = "classic", onSelectCategory, solo = false }: Props) {
  const isDaily = selectedCategory === "daily_challenge" && gameMode === "classic";
  const { t } = useLocale();
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"choose" | "join" | "searching">("choose");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gender, setGender] = useState<"f" | "m" | undefined>(getProfile().gender);
  const [adult, setAdult] = useState(() => { try { return localStorage.getItem("cc_adult_ok") === "1"; } catch { return false; } });
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [transport, setTransport] = useState(socket.transport);
  const profile = getProfile();

  // Random match only shows when the server has it switched on.
  const [randomEnabled, setRandomEnabled] = useState(false);
  useEffect(() => {
    const base = socket.baseUrl;
    if (!base) return;
    const controller = new AbortController();
    fetch(`${base}/api/health`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { features?: { randomMatch?: boolean } }) => setRandomEnabled(Boolean(data?.features?.randomMatch)))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const canRandom = randomEnabled && !solo && !isDaily && gameMode === "classic" && transport === "online";
  const canSolo = transport === "online" && gameMode === "classic" && (solo || isDaily);

  // Random match: listen for the queue, count the seconds.
  useEffect(() => {
    if (mode !== "searching") return;
    setSearchSeconds(0);
    const started = Date.now();
    const timer = window.setInterval(() => setSearchSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    const onTimeout = () => {
      setMode("choose");
      toast(t("match.timeout"));
    };
    const onError = () => setMode("choose");
    socket.on("match_timeout", onTimeout);
    socket.on("join_error", onError);
    return () => {
      window.clearInterval(timer);
      socket.off("match_timeout", onTimeout);
      socket.off("join_error", onError);
    };
  }, [mode, t]);

  // Leaving the screen while searching = leave the queue.
  useEffect(() => () => { if (searchingRef.current) socket.emit("cancel_match", {}); }, []);


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
      category: selectedCategory || "mixed",
      locale: getLocale(),
    });
    void requestNotificationPermission();
  }

  const searchingRef = useRef(false);
  searchingRef.current = mode === "searching";

  function sendFindMatch() {
    socket.emit("find_match", {
      username: profile.username || "Player",
      avatar: profile.avatar,
      mode: gameMode,
      category: selectedCategory || "mixed",
      locale: getLocale(),
      gender,
      adult,
    });
  }

  function startMatch() {
    if (!gender || !adult) return;
    playTap();
    try { localStorage.setItem("cc_adult_ok", "1"); } catch {}
    if (profile.gender !== gender) saveProfile({ ...getProfile(), gender });
    setRulesOpen(false);
    setMode("searching");
    sendFindMatch();
    void requestNotificationPermission();
  }

  function cancelMatch() {
    playTap();
    socket.emit("cancel_match", {});
    setMode("choose");
  }

  function handleSolo() {
    if (submitting) return;
    playTap();
    setSubmitting(true);
    socket.emit("start_solo", {
      username: profile.username || "Player",
      avatar: profile.avatar,
      category: selectedCategory || "mixed",
      locale: getLocale(),
    });
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
      category: selectedCategory || "mixed",
    });
    void requestNotificationPermission();
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,26,108,0.05)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.05)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 pt-10 px-6 flex items-center justify-between">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-display text-base font-bold text-white">
          {isDaily ? `📅 ${t("home.dailyChallenge")}` : solo ? `🤖 ${t("home.solo")}` : gameMode === "co-draw" ? `🖌️ ${t("home.coDraw")}` : `🎨 ${t("home.classic")}`}
        </p>
        <button
          onClick={() => { playTap(); onProfile(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-transform"
        >
          <span className="text-lg">{profile.avatar || "😎"}</span>
          <span className="text-xs font-medium text-white/50 max-w-[80px] truncate">{profile.username || "Player"}</span>
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {mode === "searching" ? (
            <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center gap-4 py-10">
              <div className="relative size-28 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
                <span className="absolute inset-3 rounded-full border-2 border-amber-400/60" />
                <span className="text-5xl">🎲</span>
              </div>
              <h2 className="font-display text-xl font-black text-white">{t("match.searching")}</h2>
              <p className="text-white/45 text-sm">{t("match.searchingSub")}</p>
              <p className="text-white/30 text-xs tabular-nums">{searchSeconds}s</p>
              <button onClick={cancelMatch} className="mt-2 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/70 text-sm font-semibold">
                {t("match.cancel")}
              </button>
            </motion.div>
          ) : mode === "choose" ? (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              {isDaily ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-400/[0.07] border border-amber-400/25">
                  <span className="text-3xl">📅</span>
                  <p className="text-white/75 text-sm leading-snug">{t("connect.dailyInfo")}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-white/45 mb-2">{t("connect.category")}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CATEGORY_CHIPS.map(chip => {
                      const active = normalizeCategory(selectedCategory) === chip.id;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => { playTap(); onSelectCategory?.(chip.id); }}
                          aria-pressed={active}
                          className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl text-[0.75rem] font-semibold transition-colors ${
                            active ? "bg-amber-400 text-black" : "bg-white/[0.04] text-white/70"
                          }`}
                        >
                          <span className="text-base leading-none">{chip.emoji}</span>
                          <span className="truncate">{t(`cat.${chip.id}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {transport !== "online" && transport !== "connecting" && (
                <p className={`text-xs font-medium ${transport === "offline" ? "text-red-400/70" : "text-amber-400/70"}`}>
                  {transport === "offline" ? t("connect.offlineMode") : t("connect.localMode")}
                </p>
              )}
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

      {/* Actions — at the bottom, where the thumb is */}
      {mode === "choose" && solo && (
        <footer className="relative z-10 px-6 pb-8 pt-3">
          <button
            onClick={handleSolo}
            disabled={submitting || !canSolo}
            className="w-full py-4 rounded-2xl bg-amber-400 text-black font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {t("connect.soloStart")}
          </button>
        </footer>
      )}
      {mode === "choose" && !solo && (
        <footer className="relative z-10 px-6 pb-8 pt-3 flex flex-col gap-2">
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            ⚡ {t("connect.create")}
          </button>
          <div className={`grid gap-2 ${canRandom || canSolo ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              onClick={() => { playTap(); setMode("join"); }}
              className="py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white/85 text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              🔗 {t("connect.joinShort")}
            </button>
            {canSolo && (
              <button
                onClick={handleSolo}
                disabled={submitting}
                className="py-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/35 text-amber-200 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {t("connect.withAi")}
              </button>
            )}
            {canRandom && (
              <button
                onClick={() => { playTap(); setRulesOpen(true); }}
                className="py-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/35 text-amber-200 text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                🎲 {t("match.button")}
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Random match rules: gender + 18+ */}
      <AnimatePresence>
        {rulesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end"
            onClick={() => setRulesOpen(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-t-3xl bg-[#111] border-t border-white/10 p-6 pb-8 space-y-4"
            >
              <h3 className="font-display text-xl font-black text-white">🎲 {t("match.rulesTitle")}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{t("match.rules")}</p>
              <div>
                <p className="text-xs font-semibold text-white/45 mb-2">{t("profile.gender")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["f", "m"] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => { playTap(); setGender(value); }}
                      aria-pressed={gender === value}
                      className={`py-3 rounded-xl text-sm font-bold border transition-colors ${gender === value ? "bg-white text-black border-white" : "bg-white/[0.04] text-white/70 border-white/[0.08]"}`}
                    >
                      {value === "f" ? `👩 ${t("profile.female")}` : `👨 ${t("profile.male")}`}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.currentTarget.checked)} className="size-5 accent-amber-400" />
                <span className="text-white/80 text-sm font-semibold">{t("match.adult")}</span>
              </label>
              <button
                onClick={startMatch}
                disabled={!gender || !adult}
                className="w-full py-4 rounded-2xl bg-amber-400 text-black font-bold text-base disabled:opacity-30"
              >
                {t("match.start")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
