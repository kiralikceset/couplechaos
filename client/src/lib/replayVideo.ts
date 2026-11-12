/**
 * 9:16 replay video for TikTok / Reels / Shorts, made on the phone:
 * the drawing draws itself, the real thing pops in, the score counts up,
 * the AI jury's verdict types out, logo at the top.
 * Canvas + MediaRecorder (MP4 where supported, otherwise WebM).
 */
import type { ReplayStroke } from "@/components/game/DrawingCanvas";

export interface ReplayInput {
  strokes: ReplayStroke[];
  /** Used when there are no strokes (e.g. Co-draw): revealed top to bottom. */
  imageData?: string;
  aspect: number;
  word: string;
  emoji: string;
  comment: string;
  score: number;
  verdict?: { text: string; good: boolean };
  labels: { should: string; cta: string };
  onProgress?: (progress: number) => void;
}

const W = 720;
const H = 1280;
const INK = "#07060A";
const PAPER = "#F7F3FF";
const PINK = "#FF1A6C";
const YELLOW = "#FBBF24";
const MUTED = "#8C8798";
const DISPLAY = '"Space Grotesk", "Outfit", system-ui, sans-serif';
const BODY = '"Outfit", system-ui, sans-serif';

// Timeline (ms)
const DRAW_START = 400;
const DRAW_END = 4400;
const EMOJI_AT = 4400;
const SCORE_AT = 4700;
const TYPE_START = 5400;
const TYPE_END = 7600;
const TOTAL = 9800;

const MIME_TYPES = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

export function canMakeVideo(): boolean {
  return typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function"
    && MIME_TYPES.some((type) => MediaRecorder.isTypeSupported(type));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, "")}…`;
  }
  return lines;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export async function makeReplayVideo(input: ReplayInput): Promise<{ blob: Blob; extension: "mp4" | "webm" }> {
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("no_video_support");
  try {
    await Promise.all([document.fonts.load(`700 64px ${DISPLAY}`), document.fonts.load(`500 30px ${BODY}`)]);
  } catch {
    /* fall back to system fonts */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Static background with the sketchbook dot grid.
  const background = document.createElement("canvas");
  background.width = W;
  background.height = H;
  const bg = background.getContext("2d")!;
  bg.fillStyle = INK;
  bg.fillRect(0, 0, W, H);
  bg.fillStyle = "rgba(247,243,255,0.06)";
  for (let y = 12; y < H; y += 26) for (let x = 12; x < W; x += 26) bg.fillRect(x, y, 2, 2);

  // Drawing area: pink frame, dark inside, drawing fitted with its own ratio.
  const frame = { x: 60, y: 240, w: 600, h: 640 };
  const inner = { x: frame.x + 18, y: frame.y + 18, w: frame.w - 36, h: frame.h - 36 };
  const aspect = input.aspect > 0.2 && input.aspect < 4 ? input.aspect : 0.75;
  let dw = inner.w;
  let dh = dw / aspect;
  if (dh > inner.h) { dh = inner.h; dw = dh * aspect; }
  const dx = inner.x + (inner.w - dw) / 2;
  const dy = inner.y + (inner.h - dh) / 2;
  const totalPoints = Math.max(1, input.strokes.reduce((sum, stroke) => sum + stroke.p.length, 0));

  // No strokes: wipe the finished picture in instead.
  let picture: HTMLImageElement | null = null;
  if (!input.strokes.length && input.imageData) {
    picture = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = input.imageData!;
    });
  }
  let px = inner.x, py = inner.y, pw = inner.w, ph = inner.h;
  if (picture) {
    const ratio = picture.width / Math.max(1, picture.height);
    pw = inner.w; ph = pw / ratio;
    if (ph > inner.h) { ph = inner.h; pw = ph * ratio; }
    px = inner.x + (inner.w - pw) / 2;
    py = inner.y + (inner.h - ph) / 2;
  }

  const drawStrokes = (progress: number) => {
    if (picture) {
      if (progress <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph * progress);
      ctx.clip();
      ctx.drawImage(picture, px, py, pw, ph);
      ctx.restore();
      return;
    }
    let budget = Math.floor(totalPoints * progress);
    ctx.save();
    roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 22);
    ctx.clip();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of input.strokes) {
      if (budget <= 0) break;
      const points = stroke.p.slice(0, budget);
      budget -= stroke.p.length;
      ctx.strokeStyle = stroke.c;
      ctx.fillStyle = stroke.c;
      ctx.lineWidth = Math.max(2, stroke.w * dw);
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(dx + points[0][0] * dw, dy + points[0][1] * dh, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(dx + points[0][0] * dw, dy + points[0][1] * dh);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(dx + points[i][0] * dw, dy + points[i][1] * dh);
      ctx.stroke();
    }
    ctx.restore();
  };

  ctx.font = `500 30px ${BODY}`;
  const commentLines = wrap(ctx, input.comment, 560, 3);
  const commentChars = commentLines.join("\n").length;

  const render = (t: number) => {
    ctx.drawImage(background, 0, 0);

    // Header: logo + verdict
    ctx.fillStyle = PAPER;
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("Couple Chaos", 60, 100);
    if (input.verdict) {
      ctx.font = `700 26px ${BODY}`;
      const label = input.verdict.text;
      const width = ctx.measureText(label).width + 40;
      ctx.fillStyle = input.verdict.good ? "#22C55E" : "#EF4444";
      roundRect(ctx, W - 60 - width, 64, width, 50, 25);
      ctx.fill();
      ctx.fillStyle = "#07060A";
      ctx.fillText(label, W - 60 - width + 20, 98);
    }

    // The word
    ctx.fillStyle = PAPER;
    let size = 76;
    ctx.font = `700 ${size}px ${DISPLAY}`;
    while (ctx.measureText(input.word).width > 600 && size > 40) {
      size -= 4;
      ctx.font = `700 ${size}px ${DISPLAY}`;
    }
    ctx.fillText(input.word, 60, 200);

    // Drawing
    ctx.fillStyle = PINK;
    roundRect(ctx, frame.x, frame.y, frame.w, frame.h, 40);
    ctx.fill();
    ctx.fillStyle = "#0A0A0A";
    roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 22);
    ctx.fill();
    drawStrokes(ease((t - DRAW_START) / (DRAW_END - DRAW_START)));

    // What it should be (emoji pops in)
    const pop = ease((t - EMOJI_AT) / 450);
    if (pop > 0) {
      ctx.globalAlpha = pop;
      ctx.fillStyle = MUTED;
      ctx.font = `500 26px ${BODY}`;
      ctx.fillText(input.labels.should, 60, 940);
      ctx.save();
      ctx.translate(120, 1020);
      ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `110px ${BODY}`;
      ctx.fillText(input.emoji || "❓", 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Score counts up
    const scoreProgress = ease((t - SCORE_AT) / 900);
    if (scoreProgress > 0) {
      const value = Math.round(input.score * scoreProgress);
      ctx.textAlign = "right";
      ctx.fillStyle = input.score >= 60 ? YELLOW : input.score >= 30 ? "#FB923C" : "#F87171";
      ctx.font = `700 120px ${DISPLAY}`;
      ctx.fillText(String(value), 572, 1060);
      ctx.textAlign = "left";
      ctx.fillStyle = MUTED;
      ctx.font = `700 36px ${DISPLAY}`;
      ctx.fillText("/100", 582, 1060);
    }

    // The jury's verdict types out
    const typed = Math.floor(commentChars * Math.min(1, Math.max(0, (t - TYPE_START) / (TYPE_END - TYPE_START))));
    if (typed > 0) {
      const box = { x: 60, y: 1090, w: 600, h: 40 + commentLines.length * 40 };
      ctx.fillStyle = YELLOW;
      roundRect(ctx, box.x, box.y, box.w, box.h, 26);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = `500 30px ${BODY}`;
      let left = typed;
      commentLines.forEach((line, index) => {
        if (left <= 0) return;
        ctx.fillText(line.slice(0, left), box.x + 24, box.y + 46 + index * 40);
        left -= line.length + 1;
      });
    }

    // Call to action
    ctx.fillStyle = MUTED;
    ctx.font = `500 26px ${BODY}`;
    ctx.textAlign = "center";
    ctx.fillText(`${input.labels.cta}: Couple Chaos`, W / 2, H - 36);
    ctx.textAlign = "left";
  };

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

  render(0);
  recorder.start(250);
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const frameLoop = () => {
      const elapsed = performance.now() - started;
      render(Math.min(elapsed, TOTAL));
      input.onProgress?.(Math.min(1, elapsed / TOTAL));
      if (elapsed >= TOTAL) resolve();
      else requestAnimationFrame(frameLoop);
    };
    requestAnimationFrame(frameLoop);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  const type = mimeType.split(";")[0];
  return { blob: new Blob(chunks, { type }), extension: type === "video/mp4" ? "mp4" : "webm" };
}
