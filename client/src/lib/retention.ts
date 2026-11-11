/**
 * Retention System - Streaks, Achievements, Daily Challenges, Couple Score
 * Keeps users coming back every day
 * Tracks progress and rewards engagement
 */

import { t } from "./i18n";

// ═══════════════════════════════════════════
// STREAK SYSTEM
// ═══════════════════════════════════════════

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string; // YYYY-MM-DD
  totalGames: number;
  totalDaysPlayed: number;
}

const STREAK_KEY = "couple_chaos_streak";

const EMPTY_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastPlayDate: "",
  totalGames: 0,
  totalDaysPlayed: 0,
};

const nonNegativeInteger = (value: unknown): number => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousLocalDateKey(date = new Date()): string {
  const previous = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
  return localDateKey(previous);
}

function readJson(key: string): unknown {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Progress storage is best-effort; gameplay must remain available if storage is full.
  }
}

export function getStreakData(now = new Date()): StreakData {
  const parsed = readJson(STREAK_KEY) as Partial<StreakData> | null;
  if (!parsed || typeof parsed !== "object") return { ...EMPTY_STREAK };
  const lastPlayDate = typeof parsed.lastPlayDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastPlayDate)
    ? parsed.lastPlayDate
    : "";
  const data: StreakData = {
    currentStreak: nonNegativeInteger(parsed.currentStreak),
    longestStreak: nonNegativeInteger(parsed.longestStreak),
    lastPlayDate,
    totalGames: nonNegativeInteger(parsed.totalGames),
    totalDaysPlayed: nonNegativeInteger(parsed.totalDaysPlayed),
  };
  if (lastPlayDate && lastPlayDate !== localDateKey(now) && lastPlayDate !== previousLocalDateKey(now)) {
    data.currentStreak = 0;
  }
  data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
  return data;
}

export function recordGamePlayed(now = new Date()): StreakData {
  const data = getStreakData(now);
  const today = localDateKey(now);
  
  data.totalGames++;
  
  if (data.lastPlayDate === today) {
    // Already played today, just increment games
    writeJson(STREAK_KEY, data);
    return data;
  }
  
  // Check if yesterday was played
  const yesterdayStr = previousLocalDateKey(now);
  
  if (data.lastPlayDate === yesterdayStr) {
    // Streak continues!
    data.currentStreak++;
  } else if (data.lastPlayDate === "") {
    // First time playing
    data.currentStreak = 1;
  } else {
    // Streak broken
    data.currentStreak = 1;
  }
  
  data.lastPlayDate = today;
  data.totalDaysPlayed++;
  data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
  
  writeJson(STREAK_KEY, data);
  return data;
}

export function isStreakAtRisk(now = new Date()): boolean {
  const data = getStreakData(now);
  if (data.currentStreak === 0) return false;
  return data.lastPlayDate === previousLocalDateKey(now);
}

// ═══════════════════════════════════════════
// ACHIEVEMENT SYSTEM
// ═══════════════════════════════════════════

export interface Achievement {
  id: string;
  emoji: string;
  nameKey: string;
  descKey: string;
  condition: (stats: PlayerStats) => boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface PlayerStats {
  totalGames: number;
  currentStreak: number;
  longestStreak: number;
  totalDaysPlayed: number;
  gamesWon: number;
  perfectGuesses: number;
  categoriesPlayed: Set<string>;
  sharedResults: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Common
  { id: "first_game", emoji: "🎮", nameKey: "ach.firstGame", descKey: "ach.firstGame.desc", condition: (s) => s.totalGames >= 1, rarity: "common" },
  { id: "five_games", emoji: "⭐", nameKey: "ach.fiveGames", descKey: "ach.fiveGames.desc", condition: (s) => s.totalGames >= 5, rarity: "common" },
  { id: "ten_games", emoji: "🔥", nameKey: "ach.tenGames", descKey: "ach.tenGames.desc", condition: (s) => s.totalGames >= 10, rarity: "common" },
  { id: "first_share", emoji: "📤", nameKey: "ach.firstShare", descKey: "ach.firstShare.desc", condition: (s) => s.sharedResults >= 1, rarity: "common" },
  
  // Rare
  { id: "streak_3", emoji: "🔥", nameKey: "ach.streak3", descKey: "ach.streak3.desc", condition: (s) => s.currentStreak >= 3, rarity: "rare" },
  { id: "streak_7", emoji: "💎", nameKey: "ach.streak7", descKey: "ach.streak7.desc", condition: (s) => s.currentStreak >= 7, rarity: "rare" },
  { id: "twenty_games", emoji: "🏆", nameKey: "ach.twentyGames", descKey: "ach.twentyGames.desc", condition: (s) => s.totalGames >= 20, rarity: "rare" },
  { id: "five_shares", emoji: "🌟", nameKey: "ach.fiveShares", descKey: "ach.fiveShares.desc", condition: (s) => s.sharedResults >= 5, rarity: "rare" },
  
  // Epic
  { id: "streak_14", emoji: "👑", nameKey: "ach.streak14", descKey: "ach.streak14.desc", condition: (s) => s.longestStreak >= 14, rarity: "epic" },
  { id: "fifty_games", emoji: "💫", nameKey: "ach.fiftyGames", descKey: "ach.fiftyGames.desc", condition: (s) => s.totalGames >= 50, rarity: "epic" },
  { id: "all_categories", emoji: "🌈", nameKey: "ach.allCats", descKey: "ach.allCats.desc", condition: (s) => s.categoriesPlayed.size >= 5, rarity: "epic" },
  
  // Legendary
  { id: "streak_30", emoji: "🏅", nameKey: "ach.streak30", descKey: "ach.streak30.desc", condition: (s) => s.longestStreak >= 30, rarity: "legendary" },
  { id: "hundred_games", emoji: "🎯", nameKey: "ach.hundredGames", descKey: "ach.hundredGames.desc", condition: (s) => s.totalGames >= 100, rarity: "legendary" },
  { id: "master_sharer", emoji: "📱", nameKey: "ach.masterSharer", descKey: "ach.masterSharer.desc", condition: (s) => s.sharedResults >= 20, rarity: "legendary" },
];

const UNLOCKED_KEY = "couple_chaos_achievements";
const STATS_KEY = "couple_chaos_stats";

export function getPlayerStats(): PlayerStats {
  const parsed = readJson(STATS_KEY) as Partial<Omit<PlayerStats, "categoriesPlayed">> & { categoriesPlayed?: unknown } | null;
  if (!parsed || typeof parsed !== "object") return {
    totalGames: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalDaysPlayed: 0,
    gamesWon: 0,
    perfectGuesses: 0,
    categoriesPlayed: new Set(),
    sharedResults: 0,
  };
  const categories = Array.isArray(parsed.categoriesPlayed)
    ? parsed.categoriesPlayed.filter((category): category is string => typeof category === "string")
    : [];
  return {
    totalGames: nonNegativeInteger(parsed.totalGames),
    currentStreak: nonNegativeInteger(parsed.currentStreak),
    longestStreak: nonNegativeInteger(parsed.longestStreak),
    totalDaysPlayed: nonNegativeInteger(parsed.totalDaysPlayed),
    gamesWon: nonNegativeInteger(parsed.gamesWon),
    perfectGuesses: nonNegativeInteger(parsed.perfectGuesses),
    categoriesPlayed: new Set(categories),
    sharedResults: nonNegativeInteger(parsed.sharedResults),
  };
}

export function updatePlayerStats(update: Partial<PlayerStats>): PlayerStats {
  const current = getPlayerStats();
  const updated = { ...current, ...update };
  updated.categoriesPlayed = update.categoriesPlayed instanceof Set
    ? new Set(update.categoriesPlayed)
    : new Set(current.categoriesPlayed);
  // Serialize Set
  const toStore = { ...updated, categoriesPlayed: Array.from(updated.categoriesPlayed) };
  writeJson(STATS_KEY, toStore);
  return updated;
}

export function incrementStat(key: "totalGames" | "gamesWon" | "perfectGuesses" | "sharedResults"): void {
  const stats = getPlayerStats();
  stats[key] = nonNegativeInteger(stats[key]) + 1;
  updatePlayerStats(stats);
}

export function addCategoryPlayed(category: string): void {
  const stats = getPlayerStats();
  stats.categoriesPlayed.add(category);
  updatePlayerStats(stats);
}

export function getUnlockedAchievements(): string[] {
  const parsed = readJson(UNLOCKED_KEY);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
}

export function checkNewAchievements(): Achievement[] {
  const stats = getPlayerStats();
  const streak = getStreakData();
  
  // Merge streak data into stats
  stats.currentStreak = streak.currentStreak;
  stats.longestStreak = streak.longestStreak;
  stats.totalDaysPlayed = streak.totalDaysPlayed;
  stats.totalGames = Math.max(stats.totalGames, streak.totalGames);
  
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];
  
  for (const ach of ACHIEVEMENTS) {
    if (!unlocked.includes(ach.id) && ach.condition(stats)) {
      newlyUnlocked.push(ach);
      unlocked.push(ach.id);
    }
  }
  
  if (newlyUnlocked.length > 0) {
    writeJson(UNLOCKED_KEY, unlocked);
  }
  
  return newlyUnlocked;
}

// ═══════════════════════════════════════════
// DAILY CHALLENGE
// ═══════════════════════════════════════════

interface DailyChallenge {
  word: string;
  category: string;
  date: string;
  completed: boolean;
  bonus: string;
}

const DAILY_CHALLENGE_KEY = "couple_chaos_daily";

export function getDailyChallenge(now = new Date()): DailyChallenge | null {
  const challenge = readJson(DAILY_CHALLENGE_KEY) as Partial<DailyChallenge> | null;
  if (!challenge || typeof challenge !== "object") return null;
  const today = localDateKey(now);
  if (challenge.date !== today) return null; // Expired
  if (typeof challenge.word !== "string" || typeof challenge.category !== "string") return null;
  return {
    word: challenge.word,
    category: challenge.category,
    date: today,
    completed: Boolean(challenge.completed),
    bonus: typeof challenge.bonus === "string" ? challenge.bonus : "daily",
  };
}

export function setDailyChallenge(word: string, category: string, now = new Date()): void {
  const today = localDateKey(now);
  const challenge: DailyChallenge = {
    word,
    category,
    date: today,
    completed: false,
    bonus: "daily",
  };
  writeJson(DAILY_CHALLENGE_KEY, challenge);
}

export function completeDailyChallenge(): void {
  const challenge = getDailyChallenge();
  if (challenge) {
    challenge.completed = true;
    writeJson(DAILY_CHALLENGE_KEY, challenge);
  }
}

// ═══════════════════════════════════════════
// COUPLE COMPATIBILITY SCORE
// ═══════════════════════════════════════════

interface CompatibilityData {
  totalRounds: number;
  successfulGuesses: number;
  averageTime: number;
  funnyMoments: number;
  score: number;
}

const COMPAT_KEY = "couple_chaos_compatibility";

export function getCompatibilityScore(): CompatibilityData {
  const parsed = readJson(COMPAT_KEY) as Partial<CompatibilityData> | null;
  if (!parsed || typeof parsed !== "object") return { totalRounds: 0, successfulGuesses: 0, averageTime: 0, funnyMoments: 0, score: 0 };
  const totalRounds = nonNegativeInteger(parsed.totalRounds);
  const successfulGuesses = Math.min(totalRounds, nonNegativeInteger(parsed.successfulGuesses));
  const averageTime = Number.isFinite(Number(parsed.averageTime)) ? Math.max(0, Number(parsed.averageTime)) : 0;
  const funnyMoments = nonNegativeInteger(parsed.funnyMoments);
  const score = Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Number(parsed.score))) : 0;
  return { totalRounds, successfulGuesses, averageTime, funnyMoments, score };
}

export function updateCompatibility(guessedCorrectly: boolean, timeSpent: number, funnyMoment = false): CompatibilityData {
  const data = getCompatibilityScore();
  data.totalRounds++;
  if (guessedCorrectly) data.successfulGuesses++;
  if (funnyMoment) data.funnyMoments++;
  const safeTime = Number.isFinite(timeSpent) ? Math.max(0, Math.min(300, timeSpent)) : 60;
  data.averageTime = (data.averageTime * (data.totalRounds - 1) + safeTime) / data.totalRounds;
  
  // Calculate score (0-100)
  const successRate = data.totalRounds > 0 ? (data.successfulGuesses / data.totalRounds) : 0;
  const timeBonus = Math.max(0, 1 - (data.averageTime / 60)); // Faster = better
  data.score = Math.round((successRate * 70 + timeBonus * 30) * 100) / 100;
  
  writeJson(COMPAT_KEY, data);
  return data;
}

export function getCompatibilityLevel(score: number): { level: string; emoji: string; color: string } {
  if (score >= 90) return { level: "Soulmates", emoji: "💫", color: "#FBBF24" };
  if (score >= 75) return { level: "Perfect Match", emoji: "💕", color: "#FF1A6C" };
  if (score >= 60) return { level: "Great Duo", emoji: "🔥", color: "#8B5CF6" };
  if (score >= 40) return { level: "Getting There", emoji: "⚡", color: "#60A5FA" };
  if (score >= 20) return { level: "Work in Progress", emoji: "🌱", color: "#4ADE80" };
  return { level: "Just Started", emoji: "🎮", color: "#94A3B8" };
}

// ═══════════════════════════════════════════
// MOOD SYSTEM - Dynamic app personality
// ═══════════════════════════════════════════

type Mood = "excited" | "playful" | "chaotic" | "romantic" | "competitive";

export function getCurrentMood(): Mood {
  const hour = new Date().getHours();
  const streak = getStreakData();
  
  // Time-based mood
  if (hour >= 22 || hour < 2) return "romantic"; // Late night
  if (hour >= 18 && hour < 22) return "playful"; // Evening
  if (hour >= 12 && hour < 18) return "competitive"; // Afternoon
  
  // Streak-based override
  if (streak.currentStreak >= 7) return "excited";
  if (streak.currentStreak >= 3) return "chaotic";
  
  return "playful";
}

export function getMoodEmoji(mood: Mood): string {
  switch (mood) {
    case "excited": return "🤩";
    case "playful": return "😜";
    case "chaotic": return "🌪️";
    case "romantic": return "💕";
    case "competitive": return "⚔️";
  }
}

export function getMoodColor(mood: Mood): string {
  switch (mood) {
    case "excited": return "#FBBF24";
    case "playful": return "#FF1A6C";
    case "chaotic": return "#8B5CF6";
    case "romantic": return "#F472B6";
    case "competitive": return "#60A5FA";
  }
}
