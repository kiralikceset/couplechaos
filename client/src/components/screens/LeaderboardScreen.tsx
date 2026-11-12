/**
 * Today's daily-challenge leaderboard. Scores come from the AI judge on the server.
 */
import { useEffect, useState } from "react";
import socket from "@/lib/socket";
import { useLocale } from "@/contexts/LocaleContext";
import { getProfile } from "@/lib/gameData";
import { playTap } from "@/lib/sounds";

interface Entry {
  rank: number;
  names: string;
  avatars: string;
  score: number;
  correct: boolean;
  solo: boolean;
}

interface Props {
  onBack: () => void;
  onPlayDaily: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen({ onBack, onPlayDaily }: Props) {
  const { t } = useLocale();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const me = getProfile().username.trim();

  useEffect(() => {
    const base = socket.baseUrl;
    if (!base) {
      setFailed(true);
      return;
    }
    const controller = new AbortController();
    fetch(`${base}/api/leaderboard`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { entries?: Entry[]; total?: number }) => {
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setTotal(Number(data.total) || 0);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const isMine = (entry: Entry) => Boolean(me) && entry.names.split(" & ").includes(me);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#07060A] overflow-hidden">
      <header className="pt-10 px-5 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => { playTap(); onBack(); }}
          aria-label="back"
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-display text-lg font-black text-white">🏆 {t("board.title")}</h1>
      </header>
      <p className="px-5 pt-3 text-white/45 text-xs leading-relaxed flex-shrink-0">{t("board.sub")}</p>

      <main className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {failed ? (
          <p className="text-white/40 text-sm text-center py-16">{t("board.error")}</p>
        ) : entries === null ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((index) => <div key={index} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <span className="text-5xl">🎨</span>
            <p className="text-white/60 text-sm">{t("board.empty")}</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry) => {
              const mine = isMine(entry);
              return (
                <li
                  key={`${entry.rank}-${entry.names}`}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl border ${mine ? "bg-amber-400/10 border-amber-400/40" : entry.rank <= 3 ? "bg-white/[0.05] border-white/[0.1]" : "bg-white/[0.02] border-white/[0.05]"}`}
                >
                  <span className="w-8 text-center font-black text-white/60 tabular-nums">{MEDALS[entry.rank - 1] || entry.rank}</span>
                  <span className="text-xl leading-none">{entry.avatars || "😎"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-bold truncate">{entry.names}{mine ? ` · ${t("board.you")}` : ""}</p>
                    <p className="text-white/35 text-[0.65rem]">{entry.solo ? t("board.solo") : "💞"}{entry.correct ? " · 🎯" : ""}</p>
                  </div>
                  <span className="font-display text-lg font-black text-amber-300 tabular-nums">{entry.score}</span>
                </li>
              );
            })}
            {total > entries.length && <li className="text-center text-white/30 text-xs pt-2">+{total - entries.length}</li>}
          </ol>
        )}
      </main>

      <footer className="px-5 pb-8 pt-3 flex-shrink-0">
        <button
          onClick={() => { playTap(); onPlayDaily(); }}
          className="w-full py-4 rounded-2xl bg-amber-400 text-black font-bold text-base active:scale-[0.98] transition-transform"
        >
          📅 {t("board.play")}
        </button>
      </footer>
    </div>
  );
}
