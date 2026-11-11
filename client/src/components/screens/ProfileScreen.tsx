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

const APP_VERSION = "1.0.4";
import { ACHIEVEMENTS, getPlayerStats, getStreakData, getUnlockedAchievements } from "@/lib/retention";
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
  const [editData, setEditData] = useState({ username: profile.username, avatar: profile.avatar });
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
  const unlocked = getUnlockedAchievements();
  const bestScore = history.reduce((best, item) => Math.max(best, Number(item.score) || 0), 0);
  const level = computeLevel((profile.gamesPlayed ?? 0) * 10 + correctGuesses * 15 + playerStats.perfectGuesses * 20);
  const stats = [
    { label: t("profile.games"), value: profile.gamesPlayed ?? 0, icon: "🎮" },
    { label: t("profile.streak"), value: streak, icon: "🔥" },
    { label: t("profile.wins"), value: correctGuesses, icon: "🎯" },
    { label: t("profile.bestScore"), value: bestScore || "—", icon: "🏆" },
    { label: t("profile.achievements"), value: `${unlocked.length}`, icon: "🏅" },
    { label: t("profile.partner"), value: partnerName ? "💞" : "—", icon: "💕" },
  ];

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[#050505] overflow-y-auto pb-8">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-[40%] bg-[radial-gradient(circle_at_50%_0%,rgba(255,26,108,0.06)_0%,transparent_60%)] pointer-events-none" />

      {/* Header - clean back arrow only */}
      <header className="relative z-10 pt-12 px-6 flex items-center">
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
      <main className="relative z-10 px-6 pt-8 space-y-6">
        {/* Hero card: avatar with level ring, name, XP */}
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-primary/20 via-[#0d0710] to-secondary/20 p-5">
          <div className="absolute -top-16 -right-16 size-44 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 size-44 rounded-full bg-secondary/25 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="relative size-[88px] flex-shrink-0">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                <motion.circle
                  cx="44" cy="44" r="40" fill="none" stroke="url(#lvl)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - level.progress) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs><linearGradient id="lvl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FBBF24" /><stop offset="1" stopColor="#FF1A6C" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-[9px] rounded-full bg-[#0a0a0a] flex items-center justify-center text-4xl">
                {editing ? editData.avatar : profile.avatar}
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[0.6rem] font-black whitespace-nowrap shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                {t("profile.level")} {level.level}
              </span>
              {!editing && (
                <button
                  onClick={() => { playTap(); setEditing(true); }}
                  aria-label={t("profile.editProfile")}
                  className="absolute -top-1 -right-1 size-7 rounded-full bg-primary border-2 border-[#0d0710] flex items-center justify-center active:scale-90 transition-transform"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white">
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black tracking-tight text-white truncate">{profile.username || t("profile.newPlayer")}</h2>
              {partnerName ? (
                <p className="text-xs text-primary/80 font-medium mt-0.5 truncate">💞 {partnerName} {t("profile.pairedWith")}</p>
              ) : (
                <p className="text-xs text-white/35 mt-0.5">{account ? `${account.provider === "apple" ? "Apple" : "Google"} ${t("profile.signedInWith")}` : t("profile.guest")}</p>
              )}
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary" initial={{ width: 0 }} animate={{ width: `${Math.round(level.progress * 100)}%` }} transition={{ duration: 1.2 }} />
              </div>
              <p className="text-[0.6rem] text-white/35 mt-1 tabular-nums">{level.xpInLevel} / {level.xpForLevel} XP</p>
            </div>
          </div>
          {premium && (
            <span className="relative inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs">👑</span>
              <span className="text-amber-400 text-[0.6rem] font-bold">PREMIUM</span>
            </span>
          )}
        </div>

        {!editing && (
          <>
            {/* Tokens */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-400/[0.07] border border-amber-400/25">
              <span className="inline-flex items-center justify-center size-11 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 text-lg font-black shadow-[0_0_18px_rgba(251,191,36,0.45)]">J</span>
              <div className="flex-1 min-w-0">
                <p className="text-amber-300 text-2xl font-black leading-none tabular-nums">{tokens}</p>
                <p className="text-white/40 text-[0.65rem] mt-1">{t("profile.tokensHow")}</p>
              </div>
            </div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2.5">
              {stats.map(item => (
                <div key={item.label} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1">
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className="text-lg font-black text-white tabular-nums leading-tight">{item.value}</span>
                  <span className="text-[0.5rem] font-bold text-white/30 uppercase tracking-wider text-center leading-tight">{item.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Recent drawings */}
            <div>
              <p className="text-[0.55rem] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">{t("profile.recent")}</p>
              {history.length === 0 ? (
                <p className="text-white/30 text-xs p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center">{t("profile.noHistory")}</p>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {history.map(item => (
                    <div key={item.id} className="flex-shrink-0 w-[104px]">
                      <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0a0a0a]">
                        {item.imageData ? <img src={item.imageData} alt={item.word} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎨</div>}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/75 text-[0.6rem] font-black text-white tabular-nums">{item.score}</span>
                        {item.guessCorrect !== undefined && (
                          <span className="absolute top-1 left-1 text-sm">{item.guessCorrect ? "🎯" : "❌"}</span>
                        )}
                      </div>
                      <p className="text-white/70 text-[0.65rem] font-semibold mt-1 truncate">{item.emoji ? `${item.emoji} ` : ""}{item.word}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements */}
            <div>
              <p className="text-[0.55rem] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">{t("profile.achievements")} · {unlocked.length}/{ACHIEVEMENTS.length}</p>
              <div className="grid grid-cols-5 gap-2">
                {ACHIEVEMENTS.map(achievement => {
                  const has = unlocked.includes(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      title={t(achievement.nameKey)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xl border ${has ? "bg-amber-400/10 border-amber-400/30" : "bg-white/[0.02] border-white/[0.05] grayscale opacity-30"}`}
                    >
                      {achievement.emoji}
                    </div>
                  );
                })}
              </div>
            </div>
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

        {/* Settings section - only show when not editing */}
        {!editing && (
          <div className="space-y-4">
            {/* Language selector */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h3 className="text-[0.55rem] font-bold text-white/25 uppercase tracking-widest mb-3">
                🌍 Language / Dil
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_LOCALES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { playTap(); setLocale(l.code as Locale); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all active:scale-95 ${
                      locale === l.code
                        ? 'bg-primary/15 border border-primary/30 text-white'
                        : 'bg-white/[0.02] border border-white/[0.06] text-white/50'
                    }`}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <span className="text-xs font-medium">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sound toggle */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{soundOn ? "🔊" : "🔇"}</span>
                  <span className="text-sm font-medium text-white/60">{t("profile.sound")}</span>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`w-12 h-7 rounded-full transition-all relative ${soundOn ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <motion.div
                    animate={{ x: soundOn ? 22 : 4 }}
                    className="absolute top-1 size-5 rounded-full bg-white shadow-md"
                  />
                </button>
              </div>
            </div>

            {/* Partner info */}
            {partnerName && (
              <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-4">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl border border-primary/20">💞</div>
                  <div>
                    <p className="text-[0.55rem] font-bold text-primary/60 uppercase tracking-[0.2em] mb-0.5">{t("profile.connection")}</p>
                    <p className="text-base font-bold text-white">{partnerName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Account */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
              <p className="text-[0.55rem] font-bold text-white/30 uppercase tracking-[0.2em]">{t("profile.account")}</p>
              {account ? (
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-white">
                    {account.provider === "apple" ? (
                      <svg width="16" height="19" viewBox="0 0 17 20" fill="currentColor" aria-label="Apple"><path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-2.159-3.816-2.159-1.624 0-2.94.968-3.726.968-.81 0-2.04-.943-3.36-.918C2.612 4.797.877 6.093.877 8.874c0 1.661.645 3.42 1.44 4.56.79 1.14 1.657 2.293 2.84 2.25 1.14-.044 1.57-.737 2.95-.737 1.36 0 1.75.737 2.95.713 1.23-.02 1.98-1.16 2.76-2.3.87-1.32 1.23-2.6 1.25-2.67-.027-.01-2.4-.92-2.42-3.65l-.1-.8z"/><path d="M11.15 3.21c.66-.8 1.1-1.9 .98-3.01-.95.04-2.1.63-2.78 1.43-.6.7-1.13 1.82-.99 2.9 1.06.08 2.14-.54 2.79-1.32z"/></svg>
                    ) : (
                      <span className="font-bold text-base">G</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold truncate">{account.name || account.email || "—"}</p>
                    <p className="text-white/35 text-xs">{account.provider === "apple" ? "Apple" : "Google"} {t("profile.signedInWith")}</p>
                  </div>
                  <button onClick={() => void handleSignOut()} className="px-3 py-2 rounded-xl bg-white/[0.06] text-white/70 text-xs font-semibold">
                    {t("profile.signOut")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white/50 text-sm">{t("profile.guest")}</p>
                  {canSignIn && onSignIn && (
                    <button onClick={() => { playTap(); onSignIn(); }} className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold">
                      {t("profile.signIn")}
                    </button>
                  )}
                </div>
              )}
              <button onClick={() => { playTap(); setPrivacyOpen(true); }} className="w-full text-left text-white/50 text-sm py-1">
                🔒 {t("profile.privacy")}
              </button>
              {confirmDelete && <p className="text-red-300/80 text-xs leading-relaxed">{t("profile.deleteConfirm")}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleDelete()}
                  className={`flex-1 text-sm py-2.5 rounded-xl font-semibold ${confirmDelete ? "bg-red-500 text-white" : "bg-red-500/10 text-red-300/80 border border-red-500/20"}`}
                >
                  {t("profile.deleteAccount")}
                </button>
                {confirmDelete && (
                  <button onClick={() => setConfirmDelete(false)} className="px-4 text-sm py-2.5 rounded-xl bg-white/[0.06] text-white/60">✕</button>
                )}
              </div>
              <p className="text-white/20 text-[0.6rem] text-center">{t("profile.version")} {APP_VERSION}</p>
            </div>
          </div>
        )}
      </main>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
