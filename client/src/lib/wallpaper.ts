import { shareOrDownloadImage } from "./imageUtils";

// Wallpaper Export System
// Allows users to save their drawings as phone wallpapers with custom backgrounds

interface WallpaperTheme {
  name: string;
  gradient: string;
  textColor: string;
}

export const wallpaperThemes: WallpaperTheme[] = [
  { name: 'Neon Night', gradient: 'linear-gradient(135deg, #0f0f23 0%, #1a0533 50%, #0d1b2a 100%)', textColor: '#ffffff' },
  { name: 'Sunset Love', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)', textColor: '#ffffff' },
  { name: 'Ocean Deep', gradient: 'linear-gradient(135deg, #0c3547 0%, #1a6b7c 50%, #2d9cdb 100%)', textColor: '#ffffff' },
  { name: 'Galaxy', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', textColor: '#ffffff' },
  { name: 'Cotton Candy', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ff9a9e 100%)', textColor: '#333333' },
  { name: 'Forest', gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', textColor: '#ffffff' },
  { name: 'Midnight', gradient: 'linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #16213e 100%)', textColor: '#ffffff' },
  { name: 'Cherry', gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', textColor: '#ffffff' },
];

export function generateWallpaper(
  drawingDataUrl: string,
  word: string,
  playerName: string,
  partnerName: string,
  theme: WallpaperTheme,
  score?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    // Phone wallpaper dimensions (1080x1920)
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas is not available'));
      return;
    }

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    // Parse gradient colors from theme
    const colors = theme.gradient.match(/#[a-fA-F0-9]{6}/g) || ['#0f0f23', '#1a0533'];
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle pattern overlay
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 100 + 20,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw the drawing in center
    const img = new Image();
    img.onload = () => {
      // Drawing frame
      const drawSize = 700;
      const drawX = (canvas.width - drawSize) / 2;
      const drawY = 500;

      // White background for drawing
      ctx.save();
      ctx.shadowColor = 'rgba(255, 0, 200, 0.3)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(drawX - 20, drawY - 20, drawSize + 40, drawSize + 40, 20);
      ctx.fill();
      ctx.restore();

      // Draw the actual drawing
      ctx.drawImage(img, drawX, drawY, drawSize, drawSize);

      // Add "Couple Chaos" branding at top
      ctx.font = 'bold 48px "Space Grotesk", sans-serif';
      ctx.fillStyle = theme.textColor;
      ctx.textAlign = 'center';
      ctx.fillText('COUPLE CHAOS', canvas.width / 2, 120);

      // Add hearts decoration
      ctx.font = '36px serif';
      ctx.fillText('💕', canvas.width / 2, 180);

      // Add word below drawing
      ctx.font = 'bold 56px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#ff1a6c';
      ctx.fillText(`"${word}"`, canvas.width / 2, drawY + drawSize + 100);

      // Add player names
      ctx.font = '32px "Outfit", sans-serif';
      ctx.fillStyle = theme.textColor;
      ctx.globalAlpha = 0.8;
      ctx.fillText(`${playerName} & ${partnerName}`, canvas.width / 2, drawY + drawSize + 160);
      ctx.globalAlpha = 1;

      // Add score if available
      if (score !== undefined) {
        ctx.font = 'bold 72px "Space Grotesk", sans-serif';
        const scoreColor = score > 80 ? '#a855f7' : score > 60 ? '#22c55e' : score > 40 ? '#eab308' : '#ef4444';
        ctx.fillStyle = scoreColor;
        ctx.fillText(`${score}/100`, canvas.width / 2, drawY + drawSize + 260);
      }

      // Add date at bottom
      ctx.font = '24px "Outfit", sans-serif';
      ctx.fillStyle = theme.textColor;
      ctx.globalAlpha = 0.5;
      const date = new Date().toLocaleDateString();
      ctx.fillText(date, canvas.width / 2, canvas.height - 100);
      ctx.globalAlpha = 1;

      // Add small watermark
      ctx.font = '20px "Outfit", sans-serif';
      ctx.fillStyle = theme.textColor;
      ctx.globalAlpha = 0.3;
      ctx.fillText('Made with Couple Chaos ❤️', canvas.width / 2, canvas.height - 60);
      ctx.globalAlpha = 1;

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Drawing image could not be decoded'));
    img.src = drawingDataUrl;
  });
}

// Download wallpaper
export async function downloadWallpaper(dataUrl: string, filename: string = 'couple-chaos-wallpaper') {
  await shareOrDownloadImage(dataUrl, `${filename}.png`, 'Couple Chaos', filename);
}
