import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { playTap } from "@/lib/sounds";
import { useLocale } from "@/contexts/LocaleContext";

export interface DrawingCanvasRef {
  getImageData: () => string;
  clear: () => void;
}

const COLORS = ["#FFFFFF", "#FF1A6C", "#8B5CF6", "#FBBF24", "#4ADE80", "#60A5FA", "#F87171"];
const WIDTHS = [3, 6, 11];
const BG = "#0a0a0a";

type Tool = "pen" | "eraser";

interface Stroke {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

/** Pen icon (also used as the on-canvas cursor). */
function PenIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function EraserIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, { disabled?: boolean; compact?: boolean }>(({ disabled = false, compact = false }, ref) => {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [color, setColor] = useState("#FFFFFF");
  const [widthIndex, setWidthIndex] = useState(1);
  const [tool, setTool] = useState<Tool>("pen");
  const [strokeCount, setStrokeCount] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

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
    context.fillStyle = BG;
    context.fillRect(0, 0, w, h);
    strokesRef.current.forEach((stroke) => paintStroke(context, stroke));
  }, [paintStroke]);

  useImperativeHandle(ref, () => ({
    getImageData: () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return "";
      // JPEG, max 768px: ~5-10x smaller than a full-DPR PNG, so the drawing
      // reaches the partner (and the AI judge) quickly on mobile data.
      const maxSide = 768;
      const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(canvas.width * scale));
      out.height = Math.max(1, Math.round(canvas.height * scale));
      const outCtx = out.getContext("2d");
      if (!outCtx) return canvas.toDataURL("image/png");
      outCtx.fillStyle = BG;
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
      // Limit pixel work on high-density phones while keeping sharp strokes.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
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

  function getPos(e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) {
    const rect = rectRef.current || canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const strokeColor = tool === "eraser" ? BG : color;
  const strokeWidth = tool === "eraser" ? WIDTHS[widthIndex] * 3 : WIDTHS[widthIndex];

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    rectRef.current = e.currentTarget.getBoundingClientRect();
    const pos = getPos(e);
    currentRef.current = { color: strokeColor, width: strokeWidth, points: [pos] };
    setCursor(pos);
    const context = ctx();
    if (context) paintStroke(context, currentRef.current);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    if (e.pointerType !== "touch") setCursor(pos);
    const stroke = currentRef.current;
    if (disabled || !e.isPrimary || !stroke) return;
    e.preventDefault();
    if (e.pointerType === "touch") setCursor(pos);
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
  }

  function endDraw() {
    const stroke = currentRef.current;
    currentRef.current = null;
    rectRef.current = null;
    if (stroke) {
      strokesRef.current.push(stroke);
      setStrokeCount(strokesRef.current.length);
    }
  }

  function undo() {
    if (!strokesRef.current.length || disabled) return;
    playTap();
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redraw();
  }

  function clearAll() {
    if (!strokesRef.current.length || disabled) return;
    playTap();
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
  }

  const toolButton = (active: boolean) =>
    `h-9 px-2.5 rounded-xl flex items-center justify-center gap-1 text-[0.65rem] font-bold transition-all active:scale-90 ${
      active ? "bg-white text-black shadow-[0_0_14px_rgba(255,255,255,0.25)]" : "bg-white/[0.06] text-white/70 border border-white/[0.08]"
    }`;

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"} flex-1 min-h-0`}>
      {/* Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.08] relative min-h-0 bg-[#0a0a0a]">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-none"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onLostPointerCapture={endDraw}
          onPointerLeave={() => setCursor(null)}
        />
        {/* Pen / eraser cursor that follows the finger */}
        {cursor && !disabled && (
          <div
            className="pointer-events-none absolute"
            style={{ left: cursor.x, top: cursor.y, transform: tool === "pen" ? "translate(-2px, -22px)" : "translate(-50%, -50%)" }}
          >
            {tool === "pen" ? (
              <span style={{ color }} className="drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]">
                <PenIcon size={22} />
              </span>
            ) : (
              <div className="rounded-full border-2 border-white/70" style={{ width: strokeWidth, height: strokeWidth }} />
            )}
          </div>
        )}
      </div>

      {/* Tools: pen · eraser · undo · clear */}
      <div className="flex items-center gap-1.5 px-1">
        <button aria-label="pen" onClick={() => { playTap(); setTool("pen"); }} className={toolButton(tool === "pen")}>
          <PenIcon size={15} /> <span>{t("draw.pen")}</span>
        </button>
        <button aria-label="eraser" onClick={() => { playTap(); setTool("eraser"); }} className={toolButton(tool === "eraser")}>
          <EraserIcon size={15} /> <span>{t("draw.eraser")}</span>
        </button>
        <div className="flex-1" />
        <button aria-label="undo" onClick={undo} disabled={!strokeCount} className={`${toolButton(false)} disabled:opacity-30`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
        </button>
        <button aria-label="clear" onClick={clearAll} disabled={!strokeCount} className={`${toolButton(false)} disabled:opacity-30`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
        </button>
      </div>

      {/* Colors + brush sizes */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex gap-1.5 flex-1">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className={`size-7 rounded-full transition-all active:scale-90 ${color === c && tool === "pen" ? "ring-2 ring-white/60 scale-110" : "opacity-60"}`}
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
              <div className="rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

DrawingCanvas.displayName = "DrawingCanvas";
export default DrawingCanvas;
