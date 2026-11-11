/**
 * DESIGN: Electric Pulse - Social Share Screen
 * Renders game results in Instagram Story (9:16) and Square (1:1) format
 * Beautiful shareable card with game result, AI comment, and branding
 * One-tap share to social platforms
 */

import { useRef, useState } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { playTap, playCopy, playSuccess } from "@/lib/sounds";
import { checkNewAchievements, incrementStat } from "@/lib/retention";
import type { GameResult } from "@/pages/GameApp";
import { toast } from "sonner";
import { copyText, shareOrDownloadImage } from "@/lib/imageUtils";

interface Props {
  result: GameResult;
  onBack: () => void;
}

export default function ShareScreen({ result, onBack }: Props) {
  const { t } = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareFormat, setShareFormat] = useState<"story" | "square">("story");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    playTap();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Couple Chaos",
          text: `${t("share.text") || "Look what we drew!"} 😂 "${result.word}" - ${result.aiComment}`,
        });
        incrementStat("sharedResults");
        checkNewAchievements();
        playSuccess();
        return;
      } catch {}
    }
    
    handleCopyLink();
  }

  async function handleCopyLink() {
    const text = `${t("share.text") || "Look what we drew!"} 😂 "${result.word}" - ${result.aiComment}`;
    const didCopy = await copyText(text);
    if (!didCopy) {
      toast.error(t("share.copyFailed"));
      return;
    }
    playCopy();
    incrementStat("sharedResults");
    checkNewAchievements();
    setCopied(true);
    toast.success(t("share.copied") || "Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadCard() {
    playTap();

    try {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = (shareFormat === "story" ? 360 : 360) * scale;
      canvas.height = (shareFormat === "story" ? 640 : 360) * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#0a0012");
      grad.addColorStop(0.5, "#1a0025");
      grad.addColorStop(1, "#050505");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Decorative circles
      ctx.fillStyle = "rgba(255,26,108,0.08)";
      ctx.beginPath();
      ctx.arc(canvas.width * 0.2, canvas.height * 0.15, 80 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(139,92,246,0.06)";
      ctx.beginPath();
      ctx.arc(canvas.width * 0.8, canvas.height * 0.85, 100 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw the game image
      if (result.imageData) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = result.imageData;
        });
        if (img.complete && img.naturalWidth > 0) {
          const imgSize = (shareFormat === "story" ? 200 : 160) * scale;
          const x = (canvas.width - imgSize) / 2;
          const y = shareFormat === "story" ? 140 * scale : 40 * scale;
          
          // Rounded rect clip
          ctx.save();
          const radius = 16 * scale;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + imgSize - radius, y);
          ctx.quadraticCurveTo(x + imgSize, y, x + imgSize, y + radius);
          ctx.lineTo(x + imgSize, y + imgSize - radius);
          ctx.quadraticCurveTo(x + imgSize, y + imgSize, x + imgSize - radius, y + imgSize);
          ctx.lineTo(x + radius, y + imgSize);
          ctx.quadraticCurveTo(x, y + imgSize, x, y + imgSize - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x, y, imgSize, imgSize);
          ctx.restore();
          
          // Border
          ctx.strokeStyle = "rgba(255,26,108,0.4)";
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + imgSize - radius, y);
          ctx.quadraticCurveTo(x + imgSize, y, x + imgSize, y + radius);
          ctx.lineTo(x + imgSize, y + imgSize - radius);
          ctx.quadraticCurveTo(x + imgSize, y + imgSize, x + imgSize - radius, y + imgSize);
          ctx.lineTo(x + radius, y + imgSize);
          ctx.quadraticCurveTo(x, y + imgSize, x, y + imgSize - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.stroke();
        }
      }
      
      // Word
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${22 * scale}px sans-serif`;
      ctx.textAlign = "center";
      const wordY = shareFormat === "story" ? 420 * scale : 260 * scale;
      ctx.fillText(`"${result.word}"`, canvas.width / 2, wordY);
      
      // AI comment
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `${11 * scale}px sans-serif`;
      const comment = result.aiComment.length > 45 ? result.aiComment.substring(0, 45) + "..." : result.aiComment;
      ctx.fillText(comment, canvas.width / 2, wordY + 28 * scale);
      
      // Branding
      ctx.fillStyle = "#FF1A6C";
      ctx.font = `bold ${13 * scale}px sans-serif`;
      const brandY = shareFormat === "story" ? 590 * scale : 330 * scale;
      ctx.fillText("Couple Chaos 💕", canvas.width / 2, brandY);
      const dataUrl = canvas.toDataURL("image/png");
      await shareOrDownloadImage(
        dataUrl,
        `couple-chaos-${Date.now()}.png`,
        "Couple Chaos",
        `“${result.word}”`,
      );
      incrementStat("sharedResults");
      checkNewAchievements();
      playSuccess();
      toast.success(t("share.downloaded") || "Card downloaded!");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(t("share.saveFailed"));
    }
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#FF1A6C]/5 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 px-6 flex items-center justify-between">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-display text-lg font-bold text-white">
          {t("share.title") || "Share"}
        </h2>
        <div className="size-10" />
      </header>

      {/* Format toggle */}
      <div className="relative z-10 flex items-center justify-center gap-2 mt-4 px-6">
        <button
          onClick={() => { playTap(); setShareFormat("story"); }}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            shareFormat === "story"
              ? "bg-[#FF1A6C]/20 text-[#FF1A6C] border border-[#FF1A6C]/30"
              : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
          }`}
        >
          Story 9:16
        </button>
        <button
          onClick={() => { playTap(); setShareFormat("square"); }}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            shareFormat === "square"
              ? "bg-[#FF1A6C]/20 text-[#FF1A6C] border border-[#FF1A6C]/30"
              : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
          }`}
        >
          Square 1:1
        </button>
      </div>

      {/* Preview Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className={`relative rounded-3xl overflow-hidden border border-white/[0.1] shadow-[0_20px_60px_-10px_rgba(255,26,108,0.25)] ${
            shareFormat === "story" ? "w-[220px] h-[390px]" : "w-[260px] h-[260px]"
          }`}
        >
          {/* Card background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0012] via-[#1a0025] to-[#050505]" />
          
          {/* Decorative */}
          <div className="absolute top-3 left-3 w-12 h-12 bg-[#FF1A6C]/10 rounded-full blur-xl" />
          <div className="absolute bottom-3 right-3 w-16 h-16 bg-[#8B5CF6]/10 rounded-full blur-xl" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center p-4">
            {/* Game image */}
            {result.imageData && (
              <div className={`rounded-xl overflow-hidden border border-[#FF1A6C]/30 mb-3 ${
                shareFormat === "story" ? "w-[140px] h-[140px]" : "w-[110px] h-[110px]"
              }`}>
                <img
                  src={result.imageData}
                  alt="Drawing"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Word */}
            <h3 className={`font-display font-black text-white text-center mb-1 ${
              shareFormat === "story" ? "text-lg" : "text-base"
            }`}>
              "{result.word}"
            </h3>
            
            {/* AI Comment */}
            <p className="text-white/50 text-[0.6rem] text-center mb-3 px-2 line-clamp-2">
              {result.aiComment}
            </p>
            
            {/* Branding */}
            <div className="flex items-center gap-1">
              <span className="text-[#FF1A6C] font-display font-bold text-[0.6rem]">Couple Chaos</span>
              <span className="text-white/20 text-[0.5rem]">💕</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Share Actions */}
      <footer className="relative z-10 px-6 pb-10 pt-4 space-y-3">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-[#FF1A6C] to-[#E11D48] text-white font-bold text-base py-4 rounded-2xl shadow-[0_0_20px_rgba(255,26,108,0.3)]"
        >
          {t("share.shareNow") || "Share"} 📤
        </motion.button>
        
        <div className="flex gap-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadCard}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/60 font-medium text-sm py-3.5 rounded-xl"
          >
            {t("share.download") || "Download"} 📥
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyLink}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/60 font-medium text-sm py-3.5 rounded-xl"
          >
            {copied ? "✓" : (t("share.copyLink") || "Copy")} 🔗
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
