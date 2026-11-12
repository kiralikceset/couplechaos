// Anti-boredom system: Dynamic personality messages
export const PLAYFUL_MESSAGES = {
  waiting: [
    "Partnerini bekliyoruz... Acaba kaçtı mı? 🏃‍♂️",
    "Birazdan kaos başlıyor... Hazır mısın? 😈",
    "Eşleşme yükleniyor... %99... %99.5... 🔄",
    "Partnerini arıyoruz... GPS açık mı? 📡",
    "Bekle bekle... Neredesin be? 👀",
  ],
  describing: [
    "Kelimeyi söyleme sakın! 🤫",
    "Yaratıcı ol, ama çok da değil 😏",
    "Bu ipucu yeterli mi acaba... 🤔",
    "Hadi hadi, daha iyi yapabilirsin! 💪",
    "Partner çizerken sen açıkla... Kolay mı? 😂",
  ],
  drawing: [
    "Picasso mısın yoksa... 🎨",
    "Bu ne böyle?! 😭",
    "Sanat eseri mi yoksa... 🤨",
    "Elinden geleni yap! (Düşük beklenti) 😅",
    "Çiz çiz bitmiyor... ⏰",
  ],
  result: [
    "Vay be... Bu ne böyle 😂",
    "Beklentiler vs Gerçeklik 💀",
    "Bir dahakine daha iyi olur... Belki 🤷",
    "Bu masterpiece mi yoksa... 🖼️",
    "Puanlayıcı bile şaşırdı buna 🤖",
  ],
  encourageReplay: [
    "Bir tur daha? Hadi be! 🔥",
    "Bu sefer daha iyi olacak... Belki 😏",
    "Tekrar oyna, intikamını al! ⚡",
    "Bir daha! Bir daha! Bir daha! 🎮",
    "Bırakamıyorsun değil mi? 😈",
  ],
};

export const SURPRISE_MESSAGES = [
  "Wait… what is THAT drawing 😭",
  "This is going to be bad 😏",
  "Oha bu ne 💀",
  "Bunu mu çizdin cidden? 😂",
  "Puanlayıcı bunu görünce ağladı 🤖😢",
  "Sanat budur işte! ...değil mi? 🎨",
  "Partner şu an ne düşünüyor acaba 🤔",
  "Bu oyun ilişkinizi test ediyor 💕",
  "Yetenek mi? Şans mı? Kaos mu? 🌪️",
];

export const AVATARS = ["😎", "🦋", "🔥", "👾", "🌙", "⚡", "🎯", "🦊", "🐺", "🌊", "💀", "🎭", "🦁", "🐉", "🌸"];

export const MAX_HINT_LENGTH = 80;

// Get random item from array
export function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get random playful message for a phase
export function getPlayfulMessage(phase: string): string {
  const messages = PLAYFUL_MESSAGES[phase as keyof typeof PLAYFUL_MESSAGES];
  if (!messages) return "";
  return getRandomItem(messages);
}

// Get random surprise message
export function getSurpriseMessage(): string {
  return getRandomItem(SURPRISE_MESSAGES);
}

// Profile storage
export interface UserProfile {
  username: string;
  avatar: string;
  gamesPlayed: number;
  streak: number;
  /** Asked when the profile is created; used only for random match (woman ↔ man). */
  gender?: "f" | "m";
}

const PROFILE_KEY = "couple_chaos_profile";

export function getProfile(): UserProfile {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserProfile>;
      const gamesPlayed = Math.floor(Number(parsed.gamesPlayed));
      const streak = Math.floor(Number(parsed.streak));
      return {
        username: typeof parsed.username === "string" ? parsed.username.trim().slice(0, 16) : "",
        avatar: typeof parsed.avatar === "string" && parsed.avatar ? parsed.avatar.slice(0, 8) : "😎",
        gamesPlayed: Number.isFinite(gamesPlayed) ? Math.max(0, gamesPlayed) : 0,
        streak: Number.isFinite(streak) ? Math.max(0, streak) : 0,
        gender: parsed.gender === "f" || parsed.gender === "m" ? parsed.gender : undefined,
      };
    }
  } catch {}
  return { username: "", avatar: "😎", gamesPlayed: 0, streak: 0 };
}

export function saveProfile(profile: UserProfile): void {
  const safeProfile: UserProfile = {
    username: String(profile.username || "").trim().slice(0, 16),
    avatar: String(profile.avatar || "😎").slice(0, 8),
    gamesPlayed: Math.max(0, Math.floor(Number(profile.gamesPlayed) || 0)),
    streak: Math.max(0, Math.floor(Number(profile.streak) || 0)),
    gender: profile.gender === "f" || profile.gender === "m" ? profile.gender : undefined,
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(safeProfile));
  } catch {
    // Profile persistence must not interrupt the game when storage is unavailable.
  }
}

export function incrementGamesPlayed(): void {
  const profile = getProfile();
  profile.gamesPlayed += 1;
  saveProfile(profile);
}
