import { useCallback, useEffect, useRef, useState } from "react";
import socket from "@/lib/socket";
import { LIVE_BG, type LiveOp } from "./DrawingCanvas";

interface Stroke {
  id: string;
  color: string;
  width: number; // fraction of canvas width
  points: number[][]; // normalized 0..1
}

/**
 * Read-only canvas that replays the partner's drawing as it happens.
 * Draws only the new segment of each chunk; full redraw only on undo/clear/resize.
 */
export default function LiveCanvas({ roundNumber, placeholder, onSnapshot }: { roundNumber: number; placeholder: string; onSnapshot?: (image: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const strokesRef = useRef<Stroke[]>([]);
  const [aspect, setAspect] = useState(0.75);
  const [hasInk, setHasInk] = useState(false);

  const paint = useCallback((points: number[][], color: string, width: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    const { w, h } = sizeRef.current;
    if (!ctx || !w || !points.length) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
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

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const { w, h } = sizeRef.current;
    if (!ctx) return;
    ctx.fillStyle = LIVE_BG;
    ctx.fillRect(0, 0, w, h);
    strokesRef.current.forEach((stroke) => paint(stroke.points, stroke.color, stroke.width));
  }, [paint]);

  // Size the canvas inside its box, keeping the drawer's aspect ratio.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const setup = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      let w = rect.width;
      let h = w / aspect;
      if (h > rect.height) { h = rect.height; w = h * aspect; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h };
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    setup();
    const observer = new ResizeObserver(setup);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [aspect, redraw]);

  useEffect(() => {
    strokesRef.current = [];
    setHasInk(false);
    redraw();
  }, [roundNumber, redraw]);

  useEffect(() => {
    const onLive = (op: LiveOp) => {
      if (!op || typeof op !== "object") return;
      if (op.t === "x") {
        strokesRef.current = [];
        setHasInk(false);
        redraw();
        return;
      }
      if (op.t === "u") {
        strokesRef.current.pop();
        if (!strokesRef.current.length) setHasInk(false);
        redraw();
        return;
      }
      if (op.t !== "s" || !Array.isArray(op.p) || !op.p.length) return;
      if (op.a && Math.abs(op.a - aspect) > 0.01) setAspect(op.a);
      const strokes = strokesRef.current;
      let stroke = strokes[strokes.length - 1];
      if (!stroke || stroke.id !== op.s) {
        stroke = { id: op.s, color: op.c, width: op.w, points: [] };
        strokes.push(stroke);
      }
      stroke.points.push(...op.p);
      paint(op.p, op.c, op.w);
      setHasInk(true);
    };
    socket.on("live_stroke", onLive);
    return () => { socket.off("live_stroke", onLive); };
  }, [aspect, paint, redraw]);

  // When the drawing phase ends this canvas unmounts: hand over a picture of the finished drawing.
  const snapshotRef = useRef(onSnapshot);
  snapshotRef.current = onSnapshot;
  useEffect(() => {
    const canvas = canvasRef.current; // the ref is already cleared when the cleanup runs
    return () => {
      if (!snapshotRef.current || !canvas || !strokesRef.current.length) return;
      try {
        snapshotRef.current(canvas.toDataURL("image/png"));
      } catch {
        /* best effort */
      }
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0 flex items-center justify-center">
      <canvas ref={canvasRef} className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]" />
      {!hasInk && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <span className="text-3xl animate-pulse">✏️</span>
          <span className="text-white/30 text-xs font-semibold">{placeholder}</span>
        </div>
      )}
    </div>
  );
}
