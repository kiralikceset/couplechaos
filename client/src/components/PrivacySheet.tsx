import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";

// The hosted copy carries the live contact address; the bundled copy is only a web fallback.
const PRIVACY_BASE = String(import.meta.env.VITE_GAME_SERVER_URL || "").replace(/\/$/, "");

/** In-app privacy policy viewer (works on iOS too, where there is no system back button). */
export default function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useLocale();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full h-[88%] bg-[#0b0b0d] rounded-t-3xl border-t border-white/10 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-white font-bold">{t("profile.privacy")}</h2>
              <button onClick={onClose} aria-label="close" className="size-9 rounded-full bg-white/[0.06] text-white/60 text-lg">×</button>
            </div>
            <iframe title="privacy" src={`${PRIVACY_BASE}/privacy.html#${locale === "tr" ? "tr" : "en"}`} className="flex-1 w-full bg-[#0b0b0d]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
