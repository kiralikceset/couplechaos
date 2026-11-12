/**
 * "Ortak Tuval" — both partners draw on ONE canvas at the same time.
 *
 * Strokes are sent as normalised (0..1) point chunks, so two phones with
 * different screen sizes see the same picture. The canvas has a fixed 3:4
 * aspect ratio on every device for the same reason.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import socket from "@/lib/socket";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap, playTick, playSend, playWordReveal } from "@/lib/sounds";
import CountdownTimer from "@/components/game/CountdownTimer";
import { assessDrawing } from "@/lib/drawingScore";

interface Props {
  word: string | null;
  timeLimit: number;
  endsAt?: number;
  roundNumber: number;
  seat: number;
  myName: string;
  myAvatar: string;
  partnerName: string | null;
  partnerAvatar: string | null;
}

interface RemoteStroke {
  s: string;
  c: string;
  w: number;
  p: number[][];
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  mine: boolean;
  x: number;
}

const COLORS = ["#FF1A6C", "#60A5FA", "#FFFFFF", "#FBBF24", "#4ADE80", "#8B5CF6", "#F87171"];
const SEAT_COLORS = ["#FF1A6C", "#60A5FA"];
const WIDTHS = [0.008, 0.016, 0.03];
const REACTIONS = ["😂", "🔥", "😱", "😍", "🤡", "👏"];
const FLUSH_MS = 50;
const BG = "#0a0a0a";

export default function CoDrawScreen({
  word,
  timeLimit,
  endsAt,
  roundNumber,
  seat,
  myName,
  myAvatar,
  partnerName,
  partnerAvatar,
}: Props) {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [color, setColor] = useState(SEAT_COLORS[seat % 2] || COLORS[0]);
  const [widthIndex, setWidthIndex] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [iAmDone, setIAmDone] = useState(false);
  const [partnerDone, setPartnerDone] = useState(false);
  const [partnerActive, setPartnerActive] = useState(false);
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [sending, setSending] = useState(false);

  const drawingRef = useRef(false);
  const strokeIdRef = useRef("");
  const lastPointRef = useRef<[number, number] | null>(null);
  const pendingRef = useRef<number[][]>([]);
  const sentAnyRef = useRef(false);
  const remoteLastRef = useRef(new Map<string, number[]>());
  const partnerTimerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const lockedRef = useRef(false);
  const startedRef = useRef(false);
  const colorRef = useRef(color);
  const widthRef = useRef(widthIndex);
  lockedRef.current = locked;
  startedRef.current = started;
  colorRef.current = color;
  widthRef.current = widthIndex;

  const startsAt = endsAt !== undefined ? endsAt - timeLimit * 1000 : Date.now();

  // ── Countdown 3-2-1 until the shared start moment ──
  useEffect(() => {
    submittedRef.current = false;
    setLocked(false);
    setIAmDone(false);
    setPartnerDone(false);
    setSending(false);
    const tick = () => {
      const left = Math.ceil((startsAt - Date.now()) / 1000);
      if (left <= 0) {
        setCountdown(0);
        setStarted(true);
        playWordReveal();
        return true;
      }
      setCountdown((previous) => {
        if (previous !== left) playTick();
        return left;
      });
      return false;
    };
    setStarted(false);
    if (tick()) return;
    const interval = window.setInterval(() => {
      if (tick()) window.clearInterval(interval);
    }, 100);
    return () => window.clearInterval(interval);
  }, [startsAt]);

  // ── Canvas sizing (fixed 3:4, crisp on high-DPI) ──
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    let w = rect.width;
    let h = (w * 4) / 3;
    if (h > rect.height) {
      h = rect.height;
      w = (h * 3) / 4;
    }
    if (w < 10 || h < 10) return;
    if (Math.abs(w - sizeRef.current.w) < 1 && Math.abs(h - sizeRef.current.h) < 1) return;
    // Keep what is already drawn when the size changes (e.g. rotation of the toolbar).
    const previous = sizeRef.current.w ? canvas.toDataURL() : null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    sizeRef.current = { w, h };
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    if (previous) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, w, h);
      image.src = previous;
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    const observer = new ResizeObserver(() => setupCanvas());
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [setupCanvas]);

  // New round → wipe the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, sizeRef.current.w, sizeRef.current.h);
    remoteLastRef.current.clear();
  }, [roundNumber]);

  const drawPolyline = useCallback((points: number[][], strokeColor: string, width: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    const { w, h } = sizeRef.current;
    if (!ctx || !w || !points.length) return;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = Math.max(1, width * w);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0][0] * w, points[0][1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0] * w, points[i][1] * h);
    ctx.stroke();
  }, []);

  // ── Sending my strokes in small chunks ──
  const flush = useCallback(() => {
    const points = pendingRef.current;
    if (!points.length || !strokeIdRef.current) return;
    pendingRef.current = [];
    socket.emit("co_draw_stroke", {
      s: strokeIdRef.current,
      c: colorRef.current,
      w: WIDTHS[widthRef.current],
      p: points,
    });
    sentAnyRef.current = true;
    // The next chunk starts where this one ended, so the line stays continuous.
    const last = points[points.length - 1];
    pendingRef.current = drawingRef.current ? [last] : [];
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (pendingRef.current.length > (drawingRef.current ? 1 : 0)) flush();
    }, FLUSH_MS);
    return () => window.clearInterval(interval);
  }, [flush]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    return [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000];
  }

  function onDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!startedRef.current || lockedRef.current || !event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    strokeIdRef.current = `${seat}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const point = pointFromEvent(event);
    lastPointRef.current = point;
    pendingRef.current = [point];
    drawPolyline([point], color, WIDTHS[widthIndex]);
  }

  function onMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || lockedRef.current || !event.isPrimary) return;
    event.preventDefault();
    const native = event.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const rect = event.currentTarget.getBoundingClientRect();
    const points: [number, number][] = (events.length ? events : [native]).map((item) => [
      Math.round(Math.max(0, Math.min(1, (item.clientX - rect.left) / rect.width)) * 10000) / 10000,
      Math.round(Math.max(0, Math.min(1, (item.clientY - rect.top) / rect.height)) * 10000) / 10000,
    ]);
    const previous = lastPointRef.current;
    if (previous) drawPolyline([previous, ...points], color, WIDTHS[widthIndex]);
    lastPointRef.current = points[points.length - 1];
    pendingRef.current.push(...points);
    if (pendingRef.current.length > 200) flush();
  }

  function onUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    flush();
    pendingRef.current = [];
    lastPointRef.current = null;
  }

  // ── Partner events ──
  useEffect(() => {
    const onStroke = (stroke: RemoteStroke) => {
      if (!stroke || !Array.isArray(stroke.p)) return;
      const previous = remoteLastRef.current.get(stroke.s);
      const points = previous && (previous[0] !== stroke.p[0]?.[0] || previous[1] !== stroke.p[0]?.[1])
        ? [previous, ...stroke.p]
        : stroke.p;
      drawPolyline(points, stroke.c, stroke.w);
      remoteLastRef.current.set(stroke.s, stroke.p[stroke.p.length - 1]);
      setPartnerActive(true);
      if (partnerTimerRef.current !== null) window.clearTimeout(partnerTimerRef.current);
      partnerTimerRef.current = window.setTimeout(() => setPartnerActive(false), 700);
    };
    const onReact = (data: { emoji: string; id: string }) => {
      setFloating((list) => [...list, { id: data.id, emoji: data.emoji, mine: false, x: 55 + Math.random() * 30 }].slice(-12));
    };
    const onPartnerReady = () => setPartnerDone(true);
    const onTimeUp = () => {
      setLocked(true);
      onUp();
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSending(true);
      // Give the last strokes still on the way a moment to land, then snapshot.
      window.setTimeout(async () => {
        const imageData = snapshot();
        const assessment = await assessDrawing(imageData, word || "");
        socket.emit("co_draw_submit", { imageData, score: assessment.score, comment: assessment.comment });
      }, 700);
    };
    socket.on("co_draw_stroke", onStroke);
    socket.on("co_draw_react", onReact);
    socket.on("co_draw_partner_ready", onPartnerReady);
    socket.on("co_draw_time_up", onTimeUp);
    return () => {
      socket.off("co_draw_stroke", onStroke);
      socket.off("co_draw_react", onReact);
      socket.off("co_draw_partner_ready", onPartnerReady);
      socket.off("co_draw_time_up", onTimeUp);
      if (partnerTimerRef.current !== null) window.clearTimeout(partnerTimerRef.current);
    };
  }, [drawPolyline, word]);

  function snapshot(): string {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return "";
    const maxSide = 768;
    const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
    const out = document.createElement("canvas");
    out.width = Math.round(canvas.width * scale);
    out.height = Math.round(canvas.height * scale);
    const ctx = out.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.85);
  }

  function react(emoji: string) {
    playSend();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setFloating((list) => [...list, { id, emoji, mine: true, x: 15 + Math.random() * 30 }].slice(-12));
    socket.emit("co_draw_react", { emoji, id });
  }

  function markDone() {
    if (iAmDone || locked) return;
    playTap();
    onUp();
    setIAmDone(true);
    socket.emit("co_draw_ready", {});
  }

  const partnerLabel = partnerName || "Partner";

  return (
    <div className="relative flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden select-none">
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-secondary/[0.08] to-transparent pointer-events-none" />

      {/* Header: timer · word · players */}
      <header className="relative z-20 pt-8 px-4 flex items-center gap-3 flex-shrink-0">
        <div className="size-11 flex items-center justify-center">
          {started && endsAt ? (
            <CountdownTimer key={`co-${endsAt}`} endsAt={endsAt} duration={timeLimit} size="sm" onTick={playTick} />
          ) : (
            <div className="size-11 rounded-full border-2 border-white/10 flex items-center justify-center text-white/40 text-xs font-bold">{timeLimit}</div>
          )}
        </div>
        <div className="flex-1 text-center min-w-0">
          <span className="text-[0.5rem] font-bold text-secondary/70 uppercase tracking-[0.25em] block">
            {t("game.round")} {roundNumber} · {t("co.title")}
          </span>
          <h2 className="font-display text-2xl font-black tracking-tight text-white truncate">{word || "???"}</h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={markDone}
          disabled={!started || iAmDone || locked}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
            iAmDone ? "bg-white/10 text-white/50" : "bg-primary text-white glow-primary"
          } disabled:opacity-60`}
        >
          {iAmDone ? "✓" : t("co.done")}
        </motion.button>
      </header>

      {/* Players strip */}
      <div className="relative z-10 px-4 mt-3 flex items-center justify-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm">{myAvatar}</span>
          <span className="text-white/70 text-xs font-semibold max-w-[90px] truncate">{myName || t("co.you")}</span>
          {iAmDone && <span className="text-green-400 text-xs">✓</span>}
        </div>
        <span className="text-white/20 text-xs">+</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <motion.span
            animate={partnerActive ? { scale: [1, 1.5, 1] } : { scale: 1 }}
            transition={{ duration: 0.6, repeat: partnerActive ? Infinity : 0 }}
            className="size-2 rounded-full"
            style={{ backgroundColor: SEAT_COLORS[(seat + 1) % 2] }}
          />
          <span className="text-sm">{partnerAvatar || "💞"}</span>
          <span className="text-white/70 text-xs font-semibold max-w-[90px] truncate">{partnerLabel}</span>
          {partnerDone && <span className="text-green-400 text-xs">✓</span>}
        </div>
      </div>
      <p className="relative z-10 text-center text-[0.65rem] h-4 mt-1 text-white/35 flex-shrink-0">
        {partnerDone && !iAmDone
          ? `${partnerLabel} ${t("co.partnerDone")}`
          : iAmDone && !partnerDone
            ? t("co.waitingPartner")
            : partnerActive
              ? `${partnerLabel} ${t("co.partnerDrawing")}`
              : ""}
      </p>

      {/* Shared canvas */}
      <main ref={wrapRef} className="relative z-10 flex-1 mx-3 my-2 min-h-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-2xl border border-white/[0.1] touch-none shadow-[0_0_40px_rgba(139,92,246,0.12)]"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
        />

        {/* Countdown overlay */}
        <AnimatePresence>
          {!started && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl"
            >
              <p className="text-white/50 text-sm font-semibold mb-2">{t("co.getReady")}</p>
              <motion.span
                key={countdown}
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display text-7xl font-black text-white text-glow-primary"
              >
                {countdown || "🎨"}
              </motion.span>
              <p className="text-white/35 text-xs mt-4 px-10 text-center">{t("co.hint")}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time-up overlay */}
        <AnimatePresence>
          {locked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/85 border border-primary/30"
            >
              <p className="text-white/80 text-sm font-semibold whitespace-nowrap">
                {sending ? t("co.sending") : t("co.timeUp")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating reactions */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AnimatePresence>
            {floating.map((item) => (
              <motion.span
                key={item.id}
                initial={{ y: 0, opacity: 0, scale: 0.6 }}
                animate={{ y: -260, opacity: [0, 1, 1, 0], scale: 1.3 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
                onAnimationComplete={() => setFloating((list) => list.filter((entry) => entry.id !== item.id))}
                className="absolute bottom-6 text-4xl"
                style={{ left: `${item.x}%` }}
              >
                {item.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Tools */}
      <div className="relative z-10 px-3 flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={`size-7 flex-shrink-0 rounded-full transition-all active:scale-90 ${color === c ? "ring-2 ring-white/60 scale-110" : "opacity-60"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {WIDTHS.map((w, index) => (
            <button
              key={w}
              aria-label={`brush ${index + 1}`}
              onClick={() => setWidthIndex(index)}
              className={`size-7 rounded-lg flex items-center justify-center transition-all active:scale-90 ${widthIndex === index ? "bg-white/20 border border-white/30" : "bg-white/[0.04]"}`}
            >
              <div className="rounded-full bg-white" style={{ width: 4 + index * 4, height: 4 + index * 4 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Reactions */}
      <div className="relative z-10 px-4 pt-2 pb-5 flex items-center justify-between flex-shrink-0">
        {REACTIONS.map((emoji) => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.4 }}
            onClick={() => react(emoji)}
            disabled={!started || locked}
            className="size-11 rounded-full bg-white/[0.04] border border-white/[0.08] text-xl flex items-center justify-center disabled:opacity-40"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
