/**
 * DESIGN: Electric Pulse - Profile Screen
 * Professional profile with avatar, stats, settings
 * NO amateur "Back to Game" button - just clean back arrow in header
 * After saving profile for first time, auto-navigates back
 */

import { useState } from "react";
import { m as motion } from "framer-motion";
import { getProfile, saveProfile, AVATARS } from "@/lib/gameData";
import { useLocale } from "@/contexts/LocaleContext";
import { AVAILABLE_LOCALES, type Locale } from "@/lib/i18n";
import { playTap, playSuccess } from "@/lib/sounds";
import { isSoundEnabled, toggleSound } from "@/lib/sounds";
import { isBillingEnabled, isPremiumUser } from "@/lib/premium";
import { deleteAccountAndData, getAccount, getAvailableProviders, signOut, type Account } from "@/lib/auth";
import PrivacySheet from "@/components/PrivacySheet";
import { toast } from "sonner";

const APP_VERSION = "1.2.0";
import { getPlayerStats, getStreakData } from "@/lib/retention";
import { getTokens } from "@/lib/tokens";

interface HistoryItem {
  id: string;
  word: string;
  score: number;
  imageData?: string;
  emoji?: string;
  guessCorrect?: boolean;
}

function readHistory(): HistoryItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("cc_game_history") || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

/** 100 XP for level 2, +50 more per level after that. */
function computeLevel(xp: number) {
  let level = 1;
  let need = 100;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= need) {
    rest -= need;
    level += 1;
    need += 50;
  }
  return { level, xpInLevel: rest, xpForLevel: need, progress: rest / need };
}

interface Props {
  onBack: () => void;
  partnerName: string | null;
  onPremium?: () => void;
  onSignIn?: () => void;
  onAccountDeleted?: () => void;
}

export default function ProfileScreen({ onBack, partnerName, onPremium, onSignIn, onAccountDeleted }: Props) {
  const { t, locale, setLocale } = useLocale();
  const [profile, setProfile] = useState(getProfile());
  const [editing, setEditing] = useState(!profile.username.trim());
  const [editData, setEditData] = useState<{ username: string; avatar: string; gender?: "f" | "m" }>({ username: profile.username, avatar: profile.avatar, gender: profile.gender });
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const premium = isPremiumUser();
  const billingEnabled = isBillingEnabled();
  const streak = getStreakData().currentStreak;
  const tokens = getTokens();
  const [account, setAccount] = useState<Account | null>(getAccount());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const canSignIn = getAvailableProviders().length > 0;

  async function handleSignOut() {
    playTap();
    await signOut();
    setAccount(null);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      playTap();
      setConfirmDelete(true);
      return;
    }
    await deleteAccountAndData();
    playSuccess();
    toast.success(t("profile.deleted"));
    onAccountDeleted?.();
  }

  function handleSave() {
    if (!editData.username.trim()) return;
    playSuccess();
    const updated = {
      ...profile,
      username: editData.username.trim().slice(0, 16),
      avatar: editData.avatar,
      gender: editData.gender,
    };
    setProfile(updated);
    saveProfile(updated);
    setEditing(false);
    // Auto-navigate back after first profile creation
    if (!profile.username.trim()) {
      onBack();
    }
  }

  function handleToggleSound() {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playTap();
  }

  const history = readHistory();
  const correctGuesses = Number(localStorage.getItem("cc_correct_guesses")) || 0;
  const playerStats = getPlayerStats();
  const level = computeLevel((profile.gamesPlayed ?? 0) * 10 + correctGuesses * 15 + playerStats.perfectGuesses * 20);
  const stats = [
    { label: t("profile.games"), value: profile.gamesPlayed ?? 0, icon: "🎮" },
    { label: t("profile.wins"), value: correctGuesses, icon: "🎯" },
    { label: t("profile.streak"), value: streak, icon: "🔥" },
  ];

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[#050505] overflow-y-auto pb-8">
      {/* Background */}

      {/* Header - clean back arrow only */}
      <header className="relative z-10 pt-10 px-5 flex items-center">
        <button
          onClick={() => { playTap(); onBack(); }}
          className="size-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/60">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="flex-1 text-center font-display text-lg font-bold text-white">{t("profile.title")}</h2>
        {/* Premium badge in header */}
        {billingEnabled && !premium && onPremium && (
          <button
            onClick={() => { playTap(); onPremium(); }}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center gap-1.5 active:scale-90 transition-transform"
          >
            <span className="text-xs">👑</span>
            <span className="text-amber-400 text-[0.6rem] font-bold">PRO</span>
          </button>
        )}
        {premium && <div className="size-10" />}
      </header>

      {/* Content */}
      <main className="relative z-10 px-5 pt-6 space-y-4">
        {/* Who you are */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => { if (!editing) { playTap(); setEditing(true); } }}
            aria-label={t("profile.editProfile")}
            className="relative size-16 flex-shrink-0 rounded-2xl bg-white/[0.06] flex items-center justify-center text-4xl active:scale-95 transition-transform"
          >
            {editing ? editData.avatar : profile.avatar}
            {!editing && (
              <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white text-black flex items-center justify-center border-2 border-[#050505]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white truncate">{profile.username || t("profile.newPlayer")}</h2>
            <p className="text-xs text-white/45 truncate">
              {t("profile.level")} {level.level}{partnerName ? ` · 💞 ${partnerName}` : ""}
            </p>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.round(level.progress * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-col items-center flex-shrink-0">
            <span className="inline-flex items-center justify-center size-8 rounded-full bg-amber-400 text-black text-xs font-black">J</span>
            <span className="text-amber-300 text-sm font-black tabular-nums mt-0.5">{tokens}</span>
          </div>
        </div>

        {!editing && (
          <>
            {/* Three numbers */}
            <div className="grid grid-cols-3 gap-2">
              {stats.map(item => (
                <div key={item.label} className="py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-xl font-black text-white tabular-nums leading-none">{item.value}</p>
                  <p className="text-[0.6rem] text-white/40 mt-1.5">{item.icon} {item.label}</p>
                </div>
              ))}
            </div>

            {/* Recent drawings */}
            {history.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-2">{t("profile.recent")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {history.slice(0, 4).map(item => (
                    <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0a0a]">
                      {item.imageData ? <img src={item.imageData} alt={item.word} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{item.emoji || "🎨"}</div>}
                      {item.guessCorrect !== undefined && <span className="absolute top-0.5 left-1 text-[0.65rem]">{item.guessCorrect ? "✅" : "❌"}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit form */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-6"
          >
            <h3 className="text-[0.6rem] font-bold text-white/40 uppercase tracking-[0.2em]">
              {profile.username ? t("profile.editProfile") : t("profile.createProfile")}
            </h3>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-[0.55rem] font-bold text-white/25 uppercase tracking-widest">{t("profile.username")}</label>
              <input
                type="text"
                value={editData.username}
                maxLength={16}
                onChange={(event) => {
                  const username = event.currentTarget.value;
                  setEditData(current => ({ ...current, username }));
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm font-medium focus:outline-none focus:border-primary/50 transition-colors"
                placeholder={t("profile.usernamePlaceholder")}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
              />
            </div>

            {/* Avatar selection */}
            <div className="space-y-2">
              <label className="text-[0.55rem] font-bold text-white/25 uppercase tracking-widest">{t("profile.chooseAvatar")}</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => { playTap(); setEditData(d => ({ ...d, avatar: a })); }}
                    className={`size-12 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${
                      editData.avatar === a
                        ? 'bg-primary/20 border-2 border-primary shadow-[0_0_12px_rgba(255,26,108,0.3)] scale-105'
                        : 'bg-white/[0.03] border border-white/[0.06]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Save/Cancel */}
            <div className="flex gap-3 pt-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!editData.username.trim()}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 glow-primary"
              >
                {profile.username ? t("profile.save") : t("profile.start")}
              </motion.button>
              {profile.username && (
                <button
                  onClick={() => { playTap(); setEditing(false); }}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/50 font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all"
                >
                  {t("profile.cancel")}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings: one simple list */}
        {!editing && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.06]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-white/70">🌍 {t("profile.language")}</span>
              <div className="flex gap-1">
                {AVAILABLE_LOCALES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { playTap(); setLocale(l.code as Locale); }}
                    aria-label={l.name}
                    className={`size-9 rounded-lg text-lg flex items-center justify-center transition-colors ${locale === l.code ? "bg-white/15 ring-1 ring-white/40" : "opacity-50"}`}
                  >
                    {l.flag}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleToggleSound} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-sm text-white/70">{soundOn ? "🔊" : "🔇"} {t("profile.sound")}</span>
              <span className={`w-11 h-6 rounded-full relative transition-colors ${soundOn ? "bg-primary" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${soundOn ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>

            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-white/70 truncate">
                👤 {account ? (account.name || account.email || (account.provider === "apple" ? "Apple" : "Google")) : t("profile.guest")}
              </span>
              {account ? (
                <button onClick={() => void handleSignOut()} className="text-xs font-semibold text-white/60 px-3 py-1.5 rounded-lg bg-white/[0.06]">{t("profile.signOut")}</button>
              ) : canSignIn && onSignIn ? (
                <button onClick={() => { playTap(); onSignIn(); }} className="text-xs font-bold text-black px-3 py-1.5 rounded-lg bg-white">{t("profile.signIn")}</button>
              ) : null}
            </div>

            <button onClick={() => { playTap(); setPrivacyOpen(true); }} className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/70">
              <span>🔒 {t("profile.privacy")}</span>
              <span className="text-white/30">›</span>
            </button>
          </div>
        )}

        {!editing && (
          <div className="text-center space-y-2 pt-1">
            {confirmDelete && <p className="text-red-300/80 text-xs leading-relaxed px-4">{t("profile.deleteConfirm")}</p>}
            <div className="flex justify-center gap-3">
              <button onClick={() => void handleDelete()} className={`text-xs font-semibold px-3 py-2 rounded-lg ${confirmDelete ? "bg-red-500 text-white" : "text-red-300/60"}`}>
                {t("profile.deleteAccount")}
              </button>
              {confirmDelete && <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-2 rounded-lg bg-white/[0.06] text-white/60">{t("profile.cancel")}</button>}
            </div>
            <p className="text-white/20 text-[0.6rem]">{t("profile.version")} {APP_VERSION}</p>
          </div>
        )}
      </main>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
