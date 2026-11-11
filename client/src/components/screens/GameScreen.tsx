/**
 * DESIGN: Electric Pulse - Game Screen
 * Multi-phase game: describing → drawing → watch_drawing → generating
 * HUD-style timer, kinetic word reveal, chat bubbles, canvas
 * Anti-boredom: surprise messages, dynamic personality
 * i18n + sound effects integrated
 */

import { useState, useEffect, useRef } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import socket from "@/lib/socket";
import { MAX_HINT_LENGTH } from "@/lib/gameData";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocalizedSurpriseMessage, getLocalizedPlayfulMessage } from "@/lib/i18n";
import { playTap, playSend, playWordReveal, playTick } from "@/lib/sounds";
import type { GamePhase } from "@/pages/GameApp";
import CountdownTimer from "@/components/game/CountdownTimer";
import ChatBubble from "@/components/game/ChatBubble";
import DrawingCanvas, { type DrawingCanvasRef } from "@/components/game/DrawingCanvas";
import { assessDrawing } from "@/lib/drawingScore";

interface Props {
  phase: GamePhase;
  role: string | null;
  word: string | null;
  timeLimit: number;
  endsAt?: number;
  roundNumber: number;
  receivedHints: Array<{ id: string; text: string; fromSelf?: boolean }>;
  code: string | null;
  onProfile: () => void;
}

interface Message {
  id: string;
  text: string;
  mine: boolean;
}

export default function GameScreen({ phase, role, word, timeLimit, endsAt, roundNumber, receivedHints, code, onProfile }: Props) {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [surprise, setSurprise] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  // Play word reveal sound when game starts
  useEffect(() => {
    if (phase === "describing" || phase === "drawing") {
      playWordReveal();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "drawing") { submittedRef.current = false; setSubmitting(false); }
  }, [phase]);

  // Hints are collected by the mounted app controller, including while this
  // screen's code is loading, so the first fast hint cannot be lost.
  useEffect(() => {
    setMessages(previous => {
      const known = new Set(previous.map(message => message.id));
      const incoming = receivedHints.filter(hint => !known.has(hint.id));
      return incoming.length ? [...previous, ...incoming.map(hint => ({ id: hint.id, text: hint.text, mine: !!hint.fromSelf }))] : previous;
    });
  }, [receivedHints]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Random surprise messages - Anti-boredom system
  useEffect(() => {
    if (phase === "drawing" || phase === "describing") {
      const timeout = setTimeout(() => {
        setSurprise(getLocalizedSurpriseMessage());
        setTimeout(() => setSurprise(null), 3000);
      }, Math.random() * 8000 + 5000);
      return () => clearTimeout(timeout);
    }
  }, [phase, surprise]);

  function sendHint() {
    if (!hintInput.trim() || !code || phase !== "describing") return;
    playSend();
    const id = Date.now().toString();
    socket.emit("send_hint", { code, text: hintInput.trim(), id });
    setMessages(prev => [...prev, { id, text: hintInput.trim(), mine: true }]);
    setHintInput("");
    inputRef.current?.focus();
  }

  async function submitDrawing() {
    if (!canvasRef.current || !code || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    playTap();
    const imageData = canvasRef.current.getImageData();
    const assessment = await assessDrawing(imageData, word || "");
    socket.emit("submit_drawing", {
      code,
      imageData,
      score: assessment.score,
      comment: assessment.comment,
    });
  }

  useEffect(() => {
    const timeUp = () => { if (phase === "drawing") void submitDrawing(); };
    socket.on("drawing_time_up", timeUp);
    return () => { socket.off("drawing_time_up", timeUp); };
  }, [phase, code, word]);

  function handleDescriptionDone() {
    if (!code) return;
    playTap();
    socket.emit("description_done", { code });
  }

  // ═══════════════════════════════════════════
  // DESCRIBING PHASE
  // ═══════════════════════════════════════════
  if (phase === "describing") {
    return (
      <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none" />

        {/* Header with timer */}
        <header className="relative z-20 pt-10 px-5 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer key={`${phase}-${endsAt}`} endsAt={endsAt} duration={timeLimit} size="sm" onComplete={handleDescriptionDone} onTick={playTick} />
          <div className="flex-1 text-center">
            <span className="text-[0.5rem] font-bold text-primary/60 uppercase tracking-[0.3em] block">{t("game.round")} {roundNumber} · {t("game.describing")}</span>
          </div>
          <button onClick={() => { playTap(); onProfile(); }} className="size-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/40">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </header>

        {/* Secret Word - Kinetic slam */}
        <motion.div
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 10, stiffness: 200 }}
          className="relative z-10 text-center px-6 py-3 flex-shrink-0"
        >
          <span className="text-[0.5rem] font-semibold text-white/20 uppercase tracking-[0.5em] block mb-1">{t("game.secretWord")}</span>
          <h1 className="font-display text-4xl font-black tracking-tight text-white text-glow-primary">
            {word || "???"}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-primary/60 text-xs font-bold mt-1.5 uppercase tracking-widest"
          >
            {t("game.dontSay")}
          </motion.p>
        </motion.div>

        {/* Messages area */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-2 min-h-0">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl">
                💬
              </motion.div>
              <p className="text-white/15 text-xs font-bold uppercase tracking-widest">{t("game.sendHints")}</p>
            </div>
          )}
          {messages.map(m => <ChatBubble key={m.id} text={m.text} mine={m.mine} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* Surprise popup */}
        <AnimatePresence>
          {surprise && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-5 py-3 rounded-2xl bg-black/90 border border-primary/30 shadow-[0_0_30px_rgba(255,26,108,0.2)]"
            >
              <p className="text-white/80 text-sm font-medium text-center">{surprise}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="relative z-10 px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 focus-within:border-primary/40 focus-within:shadow-[0_0_20px_rgba(255,26,108,0.1)] transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder={t("game.typeHint")}
              maxLength={MAX_HINT_LENGTH}
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendHint(); } }}
              className="flex-1 bg-transparent text-white placeholder-white/20 text-sm font-medium focus:outline-none"
            />
            <span className="text-[0.5rem] text-white/15 font-mono flex-shrink-0">{hintInput.length}/{MAX_HINT_LENGTH}</span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={sendHint}
              disabled={!hintInput.trim()}
              className="size-9 rounded-xl bg-primary flex items-center justify-center disabled:opacity-20 transition-all flex-shrink-0 shadow-[0_0_12px_rgba(255,26,108,0.3)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Done button */}
        <div className="relative z-10 px-4 pb-6 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={sendHint}
            disabled={!hintInput.trim()}
            className="w-full bg-white/[0.06] border border-white/[0.12] text-white font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-white/[0.1] transition-all"
          >
            {t("game.sendHint")}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
            </svg>
          </motion.button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DRAWING PHASE
  // ═══════════════════════════════════════════
  if (phase === "drawing") {
    return (
      <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-secondary/[0.06] to-transparent pointer-events-none" />

        {/* Header */}
        <header className="relative z-20 pt-8 px-4 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer key={`${phase}-${endsAt}`} endsAt={endsAt} duration={timeLimit} size="sm" onComplete={submitDrawing} onTick={playTick} />
          <div className="flex-1 text-center min-w-0">
            <span className="text-[0.5rem] font-bold text-secondary/60 uppercase tracking-[0.2em] block">{t("game.round")} {roundNumber} · {t("game.drawThis")}</span>
            <h2 className="font-display text-xl font-black tracking-tighter text-white truncate">{word || t("game.drawFromHints")}</h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={submitDrawing}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 glow-primary"
          >
            {submitting ? t("game.sending") : t("game.done")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </motion.button>
        </header>

        {/* Canvas with floating hints */}
        <main className="relative z-10 flex-1 px-3 py-2 min-h-0 flex flex-col">
          <DrawingCanvas ref={canvasRef} disabled={submitting} />
        </main>

        {/* Surprise popup */}
        <AnimatePresence>
          {surprise && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-black/90 border border-secondary/30"
            >
              <p className="text-white/70 text-sm">{surprise}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // WATCH DRAWING PHASE
  // ═══════════════════════════════════════════
  if (phase === "watch_drawing") {
    return (
      <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,26,108,0.05)_0%,transparent_60%)] pointer-events-none" />

        <header className="relative z-10 pt-10 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex-1">
            <p className="text-white/50 text-sm font-bold">{t("game.round")} {roundNumber} · {t(role === "drawer" ? "game.readHints" : "game.theyDrawing")}</p>
            <p className="text-white/20 text-xs mt-0.5">{t(role === "drawer" ? "game.hints10" : "game.drawing10")}</p>
          </div>
          <CountdownTimer key={endsAt} endsAt={endsAt} duration={timeLimit} size="sm" />
        </header>

        {/* Drawing animation */}
        <div className="relative z-10 pt-6 text-center flex-shrink-0">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-7xl mb-3 inline-block"
          >
            🎨
          </motion.div>
          <h2 className="font-display text-xl font-black tracking-tighter text-white">{t(role === "drawer" ? "game.readHints" : "game.partnerArt")}</h2>
          <p className="text-white/20 text-xs mt-1">{t(role === "drawer" ? "game.hints10" : "game.drawing10")}</p>
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2 min-h-0">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ y: [0, -8, 0] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} className="size-2.5 rounded-full bg-primary/30" />
                ))}
              </div>
              <p className="text-white/15 text-xs font-bold uppercase tracking-widest">{t(role === "drawer" ? "game.waitHints" : "game.drawing10")}</p>
            </div>
          )}
          {messages.map(m => <ChatBubble key={m.id} text={m.text} mine={m.mine} />)}
          <div ref={messagesEndRef} />
        </div>


      </div>
    );
  }

  // ═══════════════════════════════════════════
  // GENERATING PHASE
  // ═══════════════════════════════════════════
  if (phase === "generating") {
    return (
      <div className="relative flex flex-col items-center justify-center h-screen w-full bg-[#050505]">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary"
          />
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center px-10"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-6 inline-block"
          >
            🔮
          </motion.div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white mb-3">
            {t("game.processing")}
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/40 text-sm"
          >
            {getLocalizedPlayfulMessage("result")}
          </motion.p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "easeInOut" }}
            className="h-0.5 bg-gradient-to-r from-primary via-secondary to-primary rounded-full mt-6 mx-auto max-w-[200px]"
          />
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DEFAULT - Waiting for game start
  // ═══════════════════════════════════════════
  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-full bg-[#050505]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="flex gap-2 justify-center mb-5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} className="size-3 rounded-full bg-gradient-to-b from-primary to-secondary" />
          ))}
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">{t("game.starting")}</h2>
        <p className="text-white/30 text-sm">{t("game.getReady")}</p>
      </motion.div>
    </div>
  );
}
