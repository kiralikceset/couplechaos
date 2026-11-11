import { getRoast } from "./aiRoast";

export interface DrawingMetrics {
  coverage: number;
  boundsCoverage: number;
  occupiedCells: number;
  colorVariety: number;
  edgeDensity: number;
}

export interface DrawingAssessment {
  score: number;
  comment: string;
  metrics: DrawingMetrics;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function scoreDrawingMetrics(metrics: DrawingMetrics): number {
  if (metrics.coverage < 0.003) return 3;

  const coverageQuality = clamp01(1 - Math.abs(metrics.coverage - 0.18) / 0.2);
  const boundsQuality = clamp01(metrics.boundsCoverage / 0.55);
  const gridQuality = clamp01(metrics.occupiedCells / 0.5);
  const colorQuality = clamp01(metrics.colorVariety / 0.45);
  const detailQuality = clamp01(metrics.edgeDensity / 0.22);

  return Math.max(
    1,
    Math.min(
      100,
      Math.round(
        8 +
          coverageQuality * 25 +
          boundsQuality * 24 +
          gridQuality * 20 +
          colorQuality * 8 +
          detailQuality * 15,
      ),
    ),
  );
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Drawing image could not be decoded"));
    image.src = dataUrl;
  });
}

export async function analyzeDrawing(dataUrl: string): Promise<DrawingMetrics> {
  if (!dataUrl.startsWith("data:image/")) {
    return { coverage: 0, boundsCoverage: 0, occupiedCells: 0, colorVariety: 0, edgeDensity: 0 };
  }

  const image = await loadImage(dataUrl);
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is not available");

  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const occupiedGrid = new Set<number>();
  const colors = new Set<number>();
  let inkPixels = 0;
  let edges = 0;
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;
  const inkMask = new Uint8Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixelIndex = y * size + x;
      const index = pixelIndex * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const alpha = pixels[index + 3];
      const distanceFromDark = Math.abs(r - 10) + Math.abs(g - 10) + Math.abs(b - 10);
      const hasInk = alpha > 30 && distanceFromDark > 42;

      if (!hasInk) continue;
      inkMask[pixelIndex] = 1;
      inkPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      occupiedGrid.add(Math.floor(y / 16) * 6 + Math.floor(x / 16));
      colors.add((Math.floor(r / 64) << 8) | (Math.floor(g / 64) << 4) | Math.floor(b / 64));
    }
  }

  for (let y = 1; y < size; y += 1) {
    for (let x = 1; x < size; x += 1) {
      const current = inkMask[y * size + x];
      if (current !== inkMask[y * size + x - 1]) edges += 1;
      if (current !== inkMask[(y - 1) * size + x]) edges += 1;
    }
  }

  const totalPixels = size * size;
  const boundingArea = inkPixels
    ? ((maxX - minX + 1) * (maxY - minY + 1)) / totalPixels
    : 0;

  return {
    coverage: inkPixels / totalPixels,
    boundsCoverage: boundingArea,
    occupiedCells: occupiedGrid.size / 36,
    colorVariety: Math.min(1, Math.max(0, colors.size - 1) / 5),
    edgeDensity: edges / (totalPixels * 2),
  };
}

export async function assessDrawing(dataUrl: string, word: string): Promise<DrawingAssessment> {
  try {
    const metrics = await analyzeDrawing(dataUrl);
    const score = scoreDrawingMetrics(metrics);
    return { score, comment: getRoast(score, word), metrics };
  } catch {
    const metrics = { coverage: 0, boundsCoverage: 0, occupiedCells: 0, colorVariety: 0, edgeDensity: 0 };
    return { score: 3, comment: getRoast(3, word), metrics };
  }
}
