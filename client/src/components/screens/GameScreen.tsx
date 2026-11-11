/**
 * DESIGN: Electric Pulse - Game Screen
 * Multi-phase game: describing → drawing → watch_drawing → generating
 * HUD-style timer, kinetic word reveal, chat bubbles, canvas
 * Anti-boredom: surprise messages, dynamic personality
 * i18n + sound effects integrated
 */

import { useState, useEffect, useRef } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { MAX_HINT_LENGTH } from "@/lib/gameData";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocalizedSurpriseMessage, getLocalizedPlayfulMessage } from "@/lib/i18n";
import { playTap, playSend, playWordReveal, playTick, playError, playSuccess } from "@/lib/sounds";
import type { GamePhase, HintOptionView } from "@/pages/GameApp";
import CountdownTimer from "@/components/game/CountdownTimer";
import ChatBubble from "@/components/game/ChatBubble";
import DrawingCanvas, { type DrawingCanvasRef } from "@/components/game/DrawingCanvas";
import { assessDrawing } from "@/lib/drawingScore";
import { hintRevealsWord } from "@/lib/hintFilter";
import { getTokens, spendTokens, TOKEN_EVENT } from "@/lib/tokens";

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
  hintOptions?: HintOptionView[];
  guessOptions?: string[];
  partnerGuess?: string | null;
  wordEmoji?: string;
  partnerName?: string | null;
}

interface Message {
  id: string;
  text: string;
  mine: boolean;
}

/** Small gold coin used for the hint-token counter and prices. */
export function Coin({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 font-black shadow-[0_0_8px_rgba(251,191,36,0.5)] border border-amber-200/70 flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      J
    </span>
  );
}

function useTokens(): number {
  const [tokens, setTokens] = useState(getTokens());
  useEffect(() => {
    const update = () => setTokens(getTokens());
    window.addEventListener(TOKEN_EVENT, update);
    return () => window.removeEventListener(TOKEN_EVENT, update);
  }, []);
  return tokens;
}

export default function GameScreen({
  phase, role, word, timeLimit, endsAt, roundNumber, receivedHints, code, onProfile,
  hintOptions = [], guessOptions = [], partnerGuess = null, wordEmoji = "", partnerName = null,
}: Props) {
  const { t } = useLocale();
  const tokens = useTokens();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [surprise, setSurprise] = useState<string | null>(null);
  const [myGuess, setMyGuess] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const guessRef = useRef<string | null>(null);
  guessRef.current = myGuess;
  const isDescriber = role === "describer";
  const partner = partnerName || t("game.partner");

  // Play word reveal sound when game starts
  useEffect(() => {
    if (phase === "describing" || phase === "drawing") playWordReveal();
  }, [phase]);

  useEffect(() => {
    if (phase === "drawing") { submittedRef.current = false; setSubmitting(false); }
  }, [phase]);

  // New round → clean slate.
  useEffect(() => {
    setMessages([]);
    setMyGuess(null);
    setHintInput("");
  }, [roundNumber]);

  // Hints are collected by the mounted app controller, including while this
  // screen's code is loading, so the first fast hint cannot be lost.
  useEffect(() => {
    setMessages(previous => {
      const known = new Set(previous.map(message => message.id));
      const incoming = receivedHints.filter(hint => !known.has(hint.id));
      return incoming.length ? [...previous, ...incoming.map(hint => ({ id: hint.id, text: hint.text, mine: !!hint.fromSelf }))] : previous;
    });
  }, [receivedHints]);

  // The server refused a hint that gave the word away: take it back off the screen.
  useEffect(() => {
    const onRejected = (data: { id: string; message?: string }) => {
      setMessages(previous => previous.filter(message => message.id !== data.id));
      playError();
      setShake(value => value + 1);
      toast.error(data.message || t("game.hintBlocked"));
    };
    socket.on("hint_rejected", onRejected);
    return () => { socket.off("hint_rejected", onRejected); };
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Random surprise messages - Anti-boredom system
  useEffect(() => {
    if (phase === "drawing" || phase === "describing") {
      const timeout = setTimeout(() => {
        setSurprise(getLocalizedSurpriseMessage());
        setTimeout(() => setSurprise(null), 2500);
      }, Math.random() * 8000 + 6000);
      return () => clearTimeout(timeout);
    }
  }, [phase, surprise]);

  const canHint = isDescriber && (phase === "describing" || phase === "watch_drawing");

  function sendHint() {
    const text = hintInput.trim();
    if (!text || !code || !canHint) return;
    if (word && hintRevealsWord(text, word)) {
      playError();
      setShake(value => value + 1);
      toast.error(t("game.hintBlocked"));
      return;
    }
    playSend();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    socket.emit("send_hint", { code, text, id });
    setMessages(prev => [...prev, { id, text, mine: true }]);
    setHintInput("");
    inputRef.current?.focus();
  }

  function applyReadyHint(option: HintOptionView) {
    if (!canHint || option.used) return;
    if (!spendTokens(option.cost)) {
      playError();
      toast.error(t("game.notEnoughTokens"));
      return;
    }
    playSuccess();
    socket.emit("use_hint_option", { code, optionId: option.id });
  }

  function chooseGuess(option: string) {
    if (submittedRef.current) return;
    playTap();
    setMyGuess(option);
    socket.emit("submit_guess", { code, guess: option });
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
      guess: guessRef.current || undefined,
    });
  }

  useEffect(() => {
    const timeUp = () => { if (phase === "drawing") void submitDrawing(); };
    socket.on("drawing_time_up", timeUp);
    return () => { socket.off("drawing_time_up", timeUp); };
  }, [phase, code, word]);

  function handleDescriptionDone() {
    if (!code) return;
    socket.emit("description_done", { code });
  }

  const surprisePopup = (
    <AnimatePresence>
      {surprise && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-black/90 border border-primary/30 max-w-[85%]"
        >
          <p className="text-white/75 text-xs font-medium text-center">{surprise}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const tokenBadge = (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
      <Coin size={16} />
      <span className="text-amber-300 text-xs font-black tabular-nums">{tokens}</span>
    </div>
  );

  // ═══════════════════════════════════════════
  // DESCRIBER — gives hints the whole round (before AND while the partner draws)
  // ═══════════════════════════════════════════
  if (isDescriber && (phase === "describing" || phase === "watch_drawing")) {
    const drawingNow = phase === "watch_drawing";
    return (
      <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none" />

        <header className="relative z-20 pt-8 px-4 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer
            key={`${phase}-${endsAt}`}
            endsAt={endsAt}
            duration={timeLimit}
            size="sm"
            onComplete={drawingNow ? undefined : handleDescriptionDone}
            onTick={playTick}
          />
          <div className="flex-1 text-center min-w-0">
            <span className="text-[0.5rem] font-bold text-primary/70 uppercase tracking-[0.25em] block">
              {t("game.round")} {roundNumber} · {drawingNow ? t("game.partnerDrawingNow").replace("{name}", partner) : t("game.describing")}
            </span>
          </div>
          {tokenBadge}
        </header>

        {/* Secret word card */}
        <motion.div
          key={roundNumber}
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="relative z-10 mx-4 mt-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3 flex-shrink-0"
        >
          <span className="text-4xl leading-none">{wordEmoji || "🤫"}</span>
          <div className="min-w-0 flex-1">
            <span className="text-[0.5rem] font-semibold text-white/30 uppercase tracking-[0.35em] block">{t("game.secretWord")}</span>
            <h1 className={`font-display font-black tracking-tight text-white leading-tight break-words line-clamp-2 ${(word || "").length > 12 ? "text-xl" : "text-2xl"}`}>{word || "???"}</h1>
          </div>
          <span className="text-[0.55rem] font-bold text-primary/80 uppercase tracking-wider text-right leading-tight max-w-[90px]">{t("game.dontSay")}</span>
        </motion.div>

        {/* Live guess of the drawer */}
        {drawingNow && (
          <div className="relative z-10 mx-4 mt-2 px-3 py-2 rounded-xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center gap-2 flex-shrink-0">
            <span className="text-lg">🤔</span>
            <span className="text-white/60 text-xs">{t("game.partnerGuess").replace("{name}", partner)}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={partnerGuess || "none"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`ml-auto text-sm font-black ${partnerGuess ? "text-amber-300" : "text-white/25"}`}
              >
                {partnerGuess || t("game.noGuessYet")}
              </motion.span>
            </AnimatePresence>
          </div>
        )}

        {/* Ready-made hints (cost tokens) */}
        {hintOptions.length > 0 && (
          <div className="relative z-10 px-4 mt-3 flex-shrink-0">
            <p className="text-[0.5rem] font-bold text-white/30 uppercase tracking-[0.25em] mb-1.5">{t("game.readyHints")}</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
              {hintOptions.map(option => {
                const affordable = tokens >= option.cost;
                return (
                  <motion.button
                    key={option.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => applyReadyHint(option)}
                    disabled={option.used}
                    className={`snap-start flex-shrink-0 max-w-[220px] flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      option.used
                        ? "bg-green-500/10 border-green-500/30 text-green-300/80"
                        : affordable
                          ? "bg-white/[0.05] border-white/[0.12] text-white/85 active:bg-white/[0.1]"
                          : "bg-white/[0.02] border-white/[0.06] text-white/30"
                    }`}
                  >
                    <span className="truncate">{option.kind === "ai" ? `✨ ${option.label}` : option.label}</span>
                    {option.used ? (
                      <span className="text-green-400 font-black">✓</span>
                    ) : (
                      <span className="flex items-center gap-0.5 pl-1 border-l border-white/10"><Coin size={13} /><span className="text-amber-300 font-black">{option.cost}</span></span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-2 min-h-0">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-2xl">💬</motion.div>
              <p className="text-white/20 text-[0.65rem] font-bold uppercase tracking-widest text-center">{t("game.sendHints")}</p>
            </div>
          )}
          {messages.map(m => <ChatBubble key={m.id} text={m.text} mine={m.mine} />)}
          <div ref={messagesEndRef} />
        </div>

        

        {/* Input */}
        <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} className="relative z-10 px-4 pb-6 pt-1 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 focus-within:border-primary/40 focus-within:shadow-[0_0_20px_rgba(255,26,108,0.1)] transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder={t("game.typeHint")}
              maxLength={MAX_HINT_LENGTH}
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendHint(); } }}
              className="flex-1 bg-transparent text-white placeholder-white/25 text-sm font-medium focus:outline-none min-w-0"
            />
            <span className="text-[0.5rem] text-white/15 font-mono flex-shrink-0">{hintInput.length}/{MAX_HINT_LENGTH}</span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={sendHint}
              disabled={!hintInput.trim()}
              aria-label={t("game.sendHint")}
              className="size-10 rounded-xl bg-primary flex items-center justify-center disabled:opacity-25 transition-all flex-shrink-0 shadow-[0_0_12px_rgba(255,26,108,0.3)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DRAWER — draws AND guesses from the buttons
  // ═══════════════════════════════════════════
  if (phase === "drawing") {
    const latest = messages.filter(m => !m.mine).slice(-6);
    return (
      <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-secondary/[0.06] to-transparent pointer-events-none" />

        <header className="relative z-20 pt-8 px-4 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer key={`${phase}-${endsAt}`} endsAt={endsAt} duration={timeLimit} size="sm" onComplete={submitDrawing} onTick={playTick} />
          <div className="flex-1 text-center min-w-0">
            <span className="text-[0.5rem] font-bold text-secondary/70 uppercase tracking-[0.2em] block">{t("game.round")} {roundNumber}</span>
            <h2 className="font-display text-lg font-black tracking-tight text-white truncate">{t("game.drawAndGuess")}</h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={submitDrawing}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 glow-primary"
          >
            {submitting ? t("game.sending") : t("game.done")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white"><path d="M20 6L9 17l-5-5" /></svg>
          </motion.button>
        </header>

        {/* Live hints from the describer */}
        <div className="relative z-10 px-3 pt-2 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {latest.length === 0 ? (
              <span className="text-white/25 text-[0.65rem] px-2 py-1.5">💬 {t("game.waitHints")}</span>
            ) : (
              <AnimatePresence initial={false}>
                {latest.map(m => (
                  <motion.span
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.7, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    {m.text}
                  </motion.span>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <main className="relative z-10 flex-1 px-3 py-2 min-h-0 flex flex-col">
          <DrawingCanvas ref={canvasRef} disabled={submitting} compact />
        </main>

        {/* Guess buttons */}
        {guessOptions.length > 0 && (
          <div className="relative z-10 px-3 pb-5 flex-shrink-0">
            <p className="text-[0.5rem] font-bold text-white/35 uppercase tracking-[0.25em] mb-1.5 text-center">{t("game.guessTitle")}</p>
            <div className="grid grid-cols-2 gap-2">
              {guessOptions.map(option => {
                const selected = myGuess === option;
                return (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => chooseGuess(option)}
                    disabled={submitting}
                    className={`py-2.5 px-2 rounded-xl text-sm font-bold border transition-all truncate ${
                      selected
                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.45)]"
                        : "bg-white/[0.05] text-white/85 border-white/[0.1]"
                    }`}
                  >
                    {selected ? "✓ " : ""}{option}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {surprisePopup}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DRAWER — reading the first hints before the canvas opens
  // ═══════════════════════════════════════════
  if (phase === "watch_drawing") {
    return (
      <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,26,108,0.05)_0%,transparent_60%)] pointer-events-none" />

        <header className="relative z-10 pt-10 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex-1">
            <p className="text-white/60 text-sm font-bold">{t("game.round")} {roundNumber} · {t("game.readHints")}</p>
            <p className="text-white/25 text-xs mt-0.5">{t("game.canvasSoon")}</p>
          </div>
          <CountdownTimer key={endsAt} endsAt={endsAt} duration={timeLimit} size="sm" />
        </header>

        <div className="relative z-10 pt-6 text-center flex-shrink-0">
          <motion.div animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl mb-2 inline-block">🕵️</motion.div>
          <h2 className="font-display text-xl font-black tracking-tighter text-white">{t("game.readHints")}</h2>
          <p className="text-white/30 text-xs mt-1 px-10">{t("game.readHintsSub").replace("{name}", partner)}</p>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2 min-h-0">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ y: [0, -8, 0] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} className="size-2.5 rounded-full bg-primary/30" />
                ))}
              </div>
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">{t("game.waitHints")}</p>
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
