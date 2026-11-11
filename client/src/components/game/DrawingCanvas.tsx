import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { playTap } from "@/lib/sounds";

export interface DrawingCanvasRef {
  getImageData: () => string;
  clear: () => void;
}

/**
 * Live drawing operations sent to the partner (tiny: normalized points, 3 decimals).
 * s = stroke chunk, u = undo last stroke, x = clear.
 */
export type LiveOp =
  | { t: "s"; s: string; c: string; w: number; a: number; p: number[][] }
  | { t: "u" }
  | { t: "x" };

export const LIVE_BG = "#0a0a0a";
const COLORS = ["#FFFFFF", "#FF1A6C", "#FBBF24", "#4ADE80", "#60A5FA", "#8B5CF6"];
const PEN_WIDTH = 5;
const ERASER_WIDTH = 22;
const FLUSH_MS = 150;

type Tool = "pen" | "eraser";

interface Stroke {
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

function PenIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

const round3 = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

const DrawingCanvas = forwardRef<DrawingCanvasRef, { disabled?: boolean; onLive?: (op: LiveOp) => void }>(({ disabled = false, onLive }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const pendingRef = useRef<number[][]>([]);
  const onLiveRef = useRef(onLive);
  onLiveRef.current = onLive;
  const [color, setColor] = useState("#FFFFFF");
  const [tool, setTool] = useState<Tool>("pen");
  const [strokeCount, setStrokeCount] = useState(0);

  const ctx = () => canvasRef.current?.getContext("2d") || null;

  const paintStroke = useCallback((context: CanvasRenderingContext2D, stroke: Stroke) => {
    const { points } = stroke;
    if (!points.length) return;
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
    context.stroke();
  }, []);

  const redraw = useCallback(() => {
    const context = ctx();
    if (!context) return;
    const { w, h } = sizeRef.current;
    context.fillStyle = LIVE_BG;
    context.fillRect(0, 0, w, h);
    strokesRef.current.forEach((stroke) => paintStroke(context, stroke));
  }, [paintStroke]);

  /** Send the points collected since the last flush (keeps the line continuous). */
  const flush = useCallback(() => {
    const stroke = currentRef.current;
    const points = pendingRef.current;
    const send = onLiveRef.current;
    if (!send || !stroke || !points.length) return;
    const { w, h } = sizeRef.current;
    send({ t: "s", s: stroke.id, c: stroke.color, w: Math.round((stroke.width / Math.max(1, w)) * 10000) / 10000, a: Math.round((w / Math.max(1, h)) * 1000) / 1000, p: points });
    pendingRef.current = [points[points.length - 1]];
  }, []);

  useEffect(() => {
    if (!onLive) return;
    const interval = window.setInterval(() => { if (pendingRef.current.length > 1) flush(); }, FLUSH_MS);
    return () => window.clearInterval(interval);
  }, [onLive, flush]);

  useImperativeHandle(ref, () => ({
    getImageData: () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return "";
      // JPEG, max 768px: small enough to reach the partner and the AI judge fast.
      const maxSide = 768;
      const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(canvas.width * scale));
      out.height = Math.max(1, Math.round(canvas.height * scale));
      const outCtx = out.getContext("2d");
      if (!outCtx) return canvas.toDataURL("image/png");
      outCtx.fillStyle = LIVE_BG;
      outCtx.fillRect(0, 0, out.width, out.height);
      outCtx.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", 0.85);
    },
    clear: () => {
      strokesRef.current = [];
      setStrokeCount(0);
      redraw();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const setup = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { w: rect.width, h: rect.height };
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    setup();
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (Math.abs(rect.width - sizeRef.current.w) > 1 || Math.abs(rect.height - sizeRef.current.h) > 1) setup();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [redraw]);

  function getPos(e: { clientX: number; clientY: number }) {
    const rect = rectRef.current || canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /** Cursor moves through the DOM directly: no React re-render per finger move. */
  function moveCursor(pos: { x: number; y: number } | null) {
    const el = cursorRef.current;
    if (!el) return;
    if (!pos || disabled) {
      el.style.opacity = "0";
      return;
    }
    el.style.opacity = "1";
    el.style.transform = tool === "pen"
      ? `translate(${pos.x - 2}px, ${pos.y - 22}px)`
      : `translate(${pos.x - ERASER_WIDTH / 2}px, ${pos.y - ERASER_WIDTH / 2}px)`;
  }

  const queue = (points: Array<{ x: number; y: number }>) => {
    if (!onLiveRef.current) return;
    const { w, h } = sizeRef.current;
    const last = pendingRef.current[pendingRef.current.length - 1];
    for (const point of points) {
      const next = [round3(point.x / w), round3(point.y / h)];
      // Skip points that would not change anything on the partner's screen.
      const prev = pendingRef.current[pendingRef.current.length - 1] || last;
      if (prev && Math.abs(prev[0] - next[0]) < 0.004 && Math.abs(prev[1] - next[1]) < 0.004) continue;
      pendingRef.current.push(next);
    }
    if (pendingRef.current.length > 120) flush();
  };

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    rectRef.current = e.currentTarget.getBoundingClientRect();
    const pos = getPos(e);
    currentRef.current = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      color: tool === "eraser" ? LIVE_BG : color,
      width: tool === "eraser" ? ERASER_WIDTH : PEN_WIDTH,
      points: [pos],
    };
    pendingRef.current = [];
    queue([pos]);
    moveCursor(pos);
    const context = ctx();
    if (context) paintStroke(context, currentRef.current);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    moveCursor(pos);
    const stroke = currentRef.current;
    if (disabled || !e.isPrimary || !stroke) return;
    e.preventDefault();
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const points = (events.length ? events : [native]).map((item) => getPos(item));
    const context = ctx();
    if (!context) return;
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    const last = stroke.points[stroke.points.length - 1];
    context.moveTo(last.x, last.y);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
    stroke.points.push(...points);
    queue(points);
  }

  function endDraw() {
    const stroke = currentRef.current;
    if (!stroke) return;
    if (pendingRef.current.length) flush();
    pendingRef.current = [];
    currentRef.current = null;
    rectRef.current = null;
    strokesRef.current.push(stroke);
    setStrokeCount(strokesRef.current.length);
  }

  function undo() {
    if (!strokesRef.current.length || disabled) return;
    playTap();
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redraw();
    onLiveRef.current?.({ t: "u" });
  }

  function clearAll() {
    if (!strokesRef.current.length || disabled) return;
    playTap();
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
    onLiveRef.current?.({ t: "x" });
  }

  const iconButton = (active = false) =>
    `size-9 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
      active ? "bg-white text-black" : "bg-white/[0.06] text-white/70 border border-white/[0.08]"
    }`;

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.08] relative min-h-0 bg-[#0a0a0a]">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-none"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onLostPointerCapture={endDraw}
          onPointerLeave={() => moveCursor(null)}
        />
        <div ref={cursorRef} className="pointer-events-none absolute left-0 top-0 opacity-0 will-change-transform">
          {tool === "pen" ? (
            <span style={{ color }} className="block drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]"><PenIcon size={22} /></span>
          ) : (
            <div className="rounded-full border-2 border-white/70" style={{ width: ERASER_WIDTH, height: ERASER_WIDTH }} />
          )}
        </div>
      </div>

      {/* One row: colours (= pen) · eraser · undo · clear */}
      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => {
          const active = tool === "pen" && color === c;
          return (
            <button
              key={c}
              aria-label={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className={`size-8 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${active ? "ring-2 ring-white ring-offset-2 ring-offset-[#050505]" : "opacity-70"}`}
              style={{ backgroundColor: c }}
            >
              {active && <span className={c === "#FFFFFF" ? "text-black" : "text-white"}><PenIcon size={13} /></span>}
            </button>
          );
        })}
        <div className="flex-1" />
        <button aria-label="eraser" onClick={() => { playTap(); setTool("eraser"); }} className={iconButton(tool === "eraser")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>
        </button>
        <button aria-label="undo" onClick={undo} disabled={!strokeCount} className={`${iconButton()} disabled:opacity-30`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
        </button>
        <button aria-label="clear" onClick={clearAll} disabled={!strokeCount} className={`${iconButton()} disabled:opacity-30`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  );
});

DrawingCanvas.displayName = "DrawingCanvas";
export default DrawingCanvas;
