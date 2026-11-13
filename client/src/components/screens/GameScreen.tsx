/**
 * DESIGN: Electric Pulse - Game Screen
 * Multi-phase game: describing → drawing → watch_drawing → generating
 * HUD-style timer, kinetic word reveal, chat bubbles, canvas
 * Anti-boredom: surprise messages, dynamic personality
 * i18n + sound effects integrated
 */

import { useState, useEffect, useRef } from "react";
import { m as motion } from "framer-motion";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { MAX_HINT_LENGTH } from "@/lib/gameData";
import { useLocale } from "@/contexts/LocaleContext";
import { getLocalizedPlayfulMessage } from "@/lib/i18n";
import { playTap, playSend, playWordReveal, playTick, playError, playSuccess } from "@/lib/sounds";
import type { GamePhase, HintOptionView } from "@/pages/GameApp";
import CountdownTimer from "@/components/game/CountdownTimer";
import DrawingCanvas, { type DrawingCanvasRef, type LiveOp } from "@/components/game/DrawingCanvas";
import LiveCanvas from "@/components/game/LiveCanvas";
import { assessDrawing } from "@/lib/drawingScore";
import { hintRevealsWord } from "@/lib/hintFilter";
import { getTokens, spendTokens, TOKEN_EVENT } from "@/lib/tokens";
import { canBuyTokens, openTokenShop } from "@/lib/tokenStore";

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
  /** Only for random matches: report + block the stranger. */
  onReport?: () => void;
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
      className="inline-flex items-center justify-center rounded-full bg-[#FBBF24] text-[#5B3A00] font-black flex-shrink-0"
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
  hintOptions = [], guessOptions = [], partnerGuess = null, wordEmoji = "", partnerName = null, onReport,
}: Props) {
  const { t } = useLocale();
  const tokens = useTokens();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myGuess, setMyGuess] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [blockedNote, setBlockedNote] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);
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
      setBlockedNote(data.message || t("game.hintBlocked"));
    };
    socket.on("hint_rejected", onRejected);
    return () => { socket.off("hint_rejected", onRejected); };
  }, [t]);

  const canHint = isDescriber && (phase === "describing" || phase === "watch_drawing");

  function sendHint() {
    const text = hintInput.trim();
    if (!text || !code || !canHint) return;
    if (word && hintRevealsWord(text, word)) {
      playError();
      setShake(value => value + 1);
      setBlockedNote(t("game.hintBlocked"));
      return;
    }
    playSend();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    socket.emit("send_hint", { code, text, id });
    setMessages(prev => [...prev, { id, text, mine: true }]);
    setHintInput("");
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (!blockedNote) return;
    const timer = window.setTimeout(() => setBlockedNote(null), 2600);
    return () => window.clearTimeout(timer);
  }, [blockedNote, shake]);

  function applyReadyHint(option: HintOptionView) {
    if (!canHint || option.used) return;
    if (!spendTokens(option.cost)) {
      playError();
      toast.error(t("game.notEnoughTokens"), canBuyTokens() ? { action: { label: t("shop.buy"), onClick: openTokenShop } } : undefined);
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

  function sendLive(op: LiveOp) {
    if (code && !submittedRef.current) socket.emit("live_stroke", op);
  }

  async function submitDrawing() {
    if (!canvasRef.current || !code || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    playTap();
    const imageData = canvasRef.current.getImageData();
    const replay = canvasRef.current.getStrokes();
    const assessment = await assessDrawing(imageData, word || "");
    socket.emit("submit_drawing", {
      code,
      imageData,
      strokes: replay.strokes,
      aspect: replay.aspect,
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

  const reportButton = onReport ? (
    <button
      onClick={() => { playTap(); onReport(); }}
      aria-label={t("report.do")}
      className="size-9 flex-shrink-0 rounded-xl bg-[#17141D] flex items-center justify-center text-sm"
    >
      🚩
    </button>
  ) : null;

  const tokenBadge = (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
      <Coin size={16} />
      <span className="text-amber-300 text-xs font-black tabular-nums">{tokens}</span>
    </div>
  );

  // ═══════════════════════════════════════════
  // DESCRIBER — sees the drawing live, sends hints, sees the live guess
  // ═══════════════════════════════════════════
  if (isDescriber && (phase === "describing" || phase === "watch_drawing")) {
    const sent = messages.filter(m => m.mine).slice().reverse();
    const drawingNow = phase === "watch_drawing";
    return (
      <div className="relative flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden">
        <header className="pt-7 px-4 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer key={`${phase}-${endsAt}`} endsAt={endsAt} duration={timeLimit} size="sm" onComplete={phase === "describing" ? handleDescriptionDone : undefined} onTick={playTick} />
          <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#17141D]">
            <span className="text-2xl leading-none">{wordEmoji || "🤫"}</span>
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold text-[#FF1A6C] leading-none">{t("game.dontSay")}</p>
              <h1 className="font-display text-lg font-black text-white leading-tight truncate">{word || "???"}</h1>
            </div>
          </div>
          {tokenBadge}
          {reportButton}
        </header>

        {/* Before drawing: hints first. While drawing: live canvas + live guess */}
        <div className="relative flex-1 min-h-0 flex flex-col px-4 pt-3">
          {drawingNow ? (
            <>
              <LiveCanvas roundNumber={roundNumber} placeholder={t("game.partnerDrawingNow").replace("{name}", partner)} />
              <div className="absolute left-6 top-5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 text-[0.65rem]">
                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/50">{t("game.partnerGuess").replace("{name}", partner)}</span>
                <span className={`font-black ${partnerGuess ? "text-amber-300" : "text-white/30"}`}>{partnerGuess || t("game.noGuessYet")}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed border-[#2A2533] px-6 text-center">
              <span className="text-4xl">💬</span>
              <p className="text-white/80 text-sm font-semibold leading-snug">{t("game.hintFirst").replace("{name}", partner)}</p>
              <button
                onClick={() => { playTap(); handleDescriptionDone(); }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-bold active:scale-95 transition-transform"
              >
                ✏️ {t("game.startDrawingNow").replace("{name}", partner)}
              </button>
            </div>
          )}
        </div>

        {/* Hints already sent */}
        {sent.length > 0 && (
          <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
            {sent.map(m => (
              <span key={m.id} className="flex-shrink-0 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-white/85 text-[0.7rem] font-semibold whitespace-nowrap">{m.text}</span>
            ))}
          </div>
        )}

        {/* Ready hints (tokens) */}
        {hintOptions.some(option => !option.used) && (
          <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
            {hintOptions.filter(option => !option.used).map(option => (
              <button
                key={option.id}
                onClick={() => applyReadyHint(option)}
                className={`flex-shrink-0 max-w-[200px] flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg border text-[0.7rem] font-semibold active:scale-95 transition-transform ${
                  tokens >= option.cost ? "bg-amber-400/[0.08] border-amber-400/30 text-white/85" : "bg-white/[0.02] border-white/[0.06] text-white/30"
                }`}
              >
                <span className="truncate">{option.kind === "ai" ? `✨ ${option.label}` : option.label}</span>
                <span className="flex items-center gap-0.5 text-amber-300 font-black"><Coin size={12} />{option.cost}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} className="px-4 pb-5 pt-2 flex-shrink-0">
          {blockedNote && <p className="text-red-300 text-[0.7rem] font-semibold mb-1.5 px-1">⛔ {blockedNote}</p>}
          <div className={`flex items-center gap-2 bg-[#17141D] border rounded-2xl pl-4 pr-1.5 py-1.5 focus-within:border-primary/40 ${blockedNote ? "border-red-400/50" : "border-transparent"}`}>
            <input
              ref={inputRef}
              type="text"
              placeholder={t("game.typeHint")}
              maxLength={MAX_HINT_LENGTH}
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendHint(); } }}
              className="flex-1 bg-transparent text-white placeholder-white/25 text-sm font-medium focus:outline-none min-w-0 py-2"
            />
            <button
              onClick={sendHint}
              disabled={!hintInput.trim()}
              aria-label={t("game.sendHint")}
              className="size-10 rounded-xl bg-primary flex items-center justify-center disabled:opacity-25 active:scale-90 transition-all flex-shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DRAWER — draws AND guesses from the buttons
  // ═══════════════════════════════════════════
  if (phase === "drawing") {
    const latest = messages.filter(m => !m.mine).slice().reverse();
    return (
      <div className="relative flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden">
        <header className="pt-7 px-4 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer key={`${phase}-${endsAt}`} endsAt={endsAt} duration={timeLimit} size="sm" onComplete={submitDrawing} onTick={playTick} />
          <h2 className="flex-1 text-center font-display text-lg font-black tracking-tight text-white truncate">{t("game.drawAndGuess")}</h2>
          {reportButton}
          <button
            onClick={submitDrawing}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            {submitting ? t("game.sending") : t("game.done")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          </button>
        </header>

        {/* Hints from the partner (newest first) */}
        <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto flex-shrink-0 min-h-[34px]">
          {latest.length === 0 ? (
            <span className="text-white/30 text-xs py-1.5">💬 {t("game.waitHints")}</span>
          ) : latest.map((m, index) => (
            <motion.span
              key={m.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${index === 0 ? "bg-[#FF1A6C] border-[#FF1A6C] text-white" : "bg-[#17141D] border-transparent text-white/60"}`}
            >
              {m.text}
            </motion.span>
          ))}
        </div>

        <main className="flex-1 px-4 py-2 min-h-0 flex flex-col">
          <DrawingCanvas ref={canvasRef} disabled={submitting} onLive={sendLive} />
        </main>

        {guessOptions.length > 0 && (
          <div className="px-4 pb-5 flex-shrink-0">
            <p className="text-xs text-[#8C8798] mb-1.5 text-center">{t("game.guessTitle")}</p>
            <div className="grid grid-cols-2 gap-2">
              {guessOptions.map(option => {
                const selected = myGuess === option;
                return (
                  <button
                    key={option}
                    onClick={() => chooseGuess(option)}
                    disabled={submitting}
                    className={`py-3 px-2 rounded-xl text-sm font-bold border transition-colors truncate active:scale-[0.97] ${
                      selected ? "bg-[#FBBF24] text-[#07060A] border-[#FBBF24]" : "bg-[#17141D] text-white/85 border-transparent"
                    }`}
                  >
                    {selected ? "✓ " : ""}{option}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Drawer before the canvas opens: read the first hints
  if (phase === "watch_drawing" || phase === "describing") {
    return (
      <div className="relative flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden">
        <header className="pt-7 px-4 flex items-center gap-3 flex-shrink-0">
          <CountdownTimer key={endsAt} endsAt={endsAt} duration={timeLimit} size="sm" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-black text-white leading-tight">{t("game.readHints")}</h2>
            <p className="text-white/40 text-xs">{t("game.canvasSoon")}</p>
          </div>
          {reportButton}
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">💬</span>
              <p className="text-white/50 text-sm">{t("game.readHintsSub").replace("{name}", partner)}</p>
            </div>
          ) : messages.map((m, index) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`self-start max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-md text-base font-semibold border ${index === messages.length - 1 ? "bg-[#FF1A6C]/20 border-[#FF1A6C]/50 text-white" : "bg-[#17141D] border-transparent text-white/80"}`}
            >
              {m.text}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // GENERATING PHASE
  // ═══════════════════════════════════════════
  if (phase === "generating") {
    return (
      <div className="relative flex flex-col items-center justify-center h-[100dvh] w-full bg-[#07060A]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center px-10"
        >
          <motion.div
            animate={{ rotate: [-8, 8, -8] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl mb-6 inline-block"
          >
            🧑‍⚖️
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
            className="h-1 bg-[#FF1A6C] rounded-full mt-6 mx-auto max-w-[200px]"
          />
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // DEFAULT - Waiting for game start
  // ═══════════════════════════════════════════
  return (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] w-full bg-[#07060A]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="flex gap-2 justify-center mb-5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} className="size-3 rounded-full bg-[#FF1A6C]" />
          ))}
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">{t("game.starting")}</h2>
        <p className="text-white/30 text-sm">{t("game.getReady")}</p>
      </motion.div>
    </div>
  );
}
