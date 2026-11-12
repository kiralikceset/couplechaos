/**
 * Turns stroke lists (normalized 0..1 points) into a small PNG data URL,
 * so the AI's own doodles can be judged and shown like a player's drawing.
 * No native dependencies: plain pixel buffer + zlib.
 */
import { deflateSync } from "node:zlib";

export interface SketchStroke {
  color: string; // #RRGGBB
  points: number[][];
}

const WIDTH = 300;
const HEIGHT = 400;
const BACKGROUND = [10, 10, 10];

function hexToRgb(hex: string): number[] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return [255, 255, 255];
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function sketchToPng(strokes: SketchStroke[], lineWidth = 6): string {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) pixels.set(BACKGROUND, i * 3);
  const radius = lineWidth / 2;

  const dot = (cx: number, cy: number, rgb: number[]) => {
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(WIDTH - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(HEIGHT - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) pixels.set(rgb, (y * WIDTH + x) * 3);
      }
    }
  };

  for (const stroke of strokes) {
    const rgb = hexToRgb(stroke.color);
    const points = stroke.points.map(([x, y]) => [x * WIDTH, y * HEIGHT]);
    points.forEach((point, index) => {
      if (index === 0) {
        dot(point[0], point[1], rgb);
        return;
      }
      const [px, py] = points[index - 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(point[0] - px, point[1] - py) / (radius / 2)));
      for (let step = 1; step <= steps; step += 1) {
        dot(px + ((point[0] - px) * step) / steps, py + ((point[1] - py) * step) / steps, rgb);
      }
    });
  }

  const rows = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    rows[y * (WIDTH * 3 + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * WIDTH * 3, WIDTH * 3).copy(rows, y * (WIDTH * 3 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}
