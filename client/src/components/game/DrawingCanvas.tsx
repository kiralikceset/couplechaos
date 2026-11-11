import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";

export interface DrawingCanvasRef {
  getImageData: () => string;
  clear: () => void;
}

const COLORS = ["#FFFFFF", "#FF1A6C", "#8B5CF6", "#FBBF24", "#4ADE80", "#60A5FA", "#F87171"];

const DrawingCanvas = forwardRef<DrawingCanvasRef, { disabled?: boolean }>(({ disabled = false }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const strokeRect = useRef<DOMRect | null>(null);
  const [color, setColor] = useState("#FFFFFF");
  const [lineWidth, setLineWidth] = useState(4);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

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
      outCtx.fillStyle = "#0a0a0a";
      outCtx.fillRect(0, 0, out.width, out.height);
      outCtx.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", 0.85);
    },
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    // Limit pixel work on high-density phones while keeping sharp strokes.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = strokeRect.current || canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    strokeRect.current = e.currentTarget.getBoundingClientRect();
    isDrawing.current = true;
    lastPos.current = getPos(e);
    // A tap also leaves a dot instead of being lost.
    const ctx = e.currentTarget.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(lastPos.current.x, lastPos.current.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !e.isPrimary || !isDrawing.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw() {
    isDrawing.current = false;
    strokeRect.current = null;
    lastPos.current = null;
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.08] relative min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onLostPointerCapture={endDraw}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2">
        {/* Colors */}
        <div className="flex gap-1.5 flex-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`size-7 rounded-full transition-all active:scale-90 ${
                color === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-60'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Brush size */}
        <div className="flex gap-1">
          {[3, 6, 10].map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`size-7 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                lineWidth === w ? 'bg-white/20 border border-white/30' : 'bg-white/[0.04]'
              }`}
            >
              <div
                className="rounded-full bg-white"
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

DrawingCanvas.displayName = "DrawingCanvas";
export default DrawingCanvas;
