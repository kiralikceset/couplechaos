/**
 * Couple Chaos realtime game server — protocol 2 (HTTP long-polling).
 *
 * This matches client/src/lib/socket.ts exactly:
 *   POST /api/session                 → { sessionId, token, protocol: 2 }
 *   GET  /api/events?after=<cursor>   → { events, cursor, serverTime, pollAfterMs }   (long-poll)
 *   POST /api/actions { actions, after } → { accepted, events, cursor, serverTime }
 *
 * HTTP polling (instead of WebSocket) survives mobile network switches, app
 * backgrounding and corporate proxies much better; a session only "drops" when
 * it stops polling for longer than the grace period.
 *
 * Timers are enforced by the server, so a round always finishes even if one
 * phone freezes or goes to the background.
 */
import express, { type NextFunction, type Request, type Response } from "express";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDailyWord, getDistractors, normalizeCategory, pickWord } from "../client/src/lib/wordPool";
import { foldText, hintRevealsWord } from "../client/src/lib/hintFilter";
import { generateHints, isAiJudgeEnabled, judgeDrawing, type Locale } from "./aiJudge";
import { AuthError, isProviderConfigured, verifyIdToken } from "./auth";

// ── Tunables (env-overridable, mostly for tests) ───────────────────────────
const num = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};
// Hints come first (the describer can skip ahead with "start drawing"); 0 = canvas opens at once.
const DESCRIBE_SECONDS = num("DESCRIBE_SECONDS", 15);
const DRAW_SECONDS = num("DRAW_SECONDS", 30);
const CO_DRAW_SECONDS = num("CO_DRAW_SECONDS", 20);
const CO_COUNTDOWN_SECONDS = num("CO_COUNTDOWN_SECONDS", 3);
const CO_STROKE_LATE_MS = 500; // strokes still in flight when the timer ends
const LONG_POLL_MS = num("LONG_POLL_MS", 8000);
const PLAY_GRACE_MS = num("PLAY_GRACE_MS", 25_000); // partner silent this long during a game → gone
const WAITING_GRACE_MS = num("WAITING_GRACE_MS", 10 * 60_000); // host may go to WhatsApp to share the code
const SESSION_TTL_MS = num("SESSION_TTL_MS", 30 * 60_000);
const START_DELAY_MS = num("START_DELAY_MS", 650);
const PHASE_GRACE_MS = num("PHASE_GRACE_MS", 1500); // latency allowance after a client-side timer
const SUBMIT_GRACE_MS = num("SUBMIT_GRACE_MS", 6000); // wait for the drawing upload after time-up
const RESULT_MIN_MS = num("RESULT_MIN_MS", 700);
const MAX_SESSIONS = num("MAX_SESSIONS", 20_000);
const MAX_ROOMS = num("MAX_ROOMS", 10_000);
const MAX_EVENTS_PER_SESSION = 400;
const MAX_IMAGE_CHARS = 4_000_000;

type RoomState = "waiting" | "describing" | "drawing" | "co_drawing" | "co_collecting" | "judging" | "result" | "closed";
type GameMode = "classic" | "co-draw";

interface ServerEvent {
  id: number;
  event: string;
  data?: Record<string, unknown>;
}

interface Waiter {
  resolve: () => void;
  timer: NodeJS.Timeout;
}

interface Session {
  id: string;
  token: Buffer;
  nextEventId: number;
  events: ServerEvent[];
  waiters: Set<Waiter>;
  lastSeen: number;
  createdAt: number;
  roomCode: string | null;
  username: string;
  avatar: string;
  /** App language of this player (AI comments come in this language). */
  locale: Locale;
  seenActions: Set<string>;
  seenActionOrder: string[];
}

interface HintOption {
  id: string;
  label: string;
  text: string;
  cost: number;
  kind: "letters" | "first" | "last" | "emoji" | "ai";
  used: boolean;
}

interface Room {
  code: string;
  mode: GameMode;
  coReady: Set<string>;
  category: string;
  locale: Locale;
  players: string[]; // session ids, [host, guest]
  state: RoomState;
  round: number;
  word: string;
  wordEmoji: string;
  describerId: string;
  drawerId: string;
  phaseEndsAt: number;
  timers: NodeJS.Timeout[];
  hintsThisRound: number;
  hintOptions: HintOption[];
  guessOptions: string[];
  guess: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();
const rooms = new Map<string, Room>();
const VALID_CATEGORIES = new Set(["mixed", "animals", "food", "objects", "vehicles", "places", "people", "fun", "love", "daily_challenge"]);
const VALID_LOCALES = new Set<Locale>(["tr", "en", "de", "es"]);
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CO_REACTIONS = new Set(["😂", "🔥", "😱", "😍", "🤡", "👏"]);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const MESSAGES: Record<string, Record<Locale, string>> = {
  roomNotFound: {
    tr: "Oda bulunamadı veya süresi doldu.",
    en: "Room not found or it has expired.",
    de: "Raum nicht gefunden oder abgelaufen.",
    es: "Sala no encontrada o caducada.",
  },
  roomFull: {
    tr: "Bu oda dolu veya oyun başlamış.",
    en: "This room is full or the game has started.",
    de: "Dieser Raum ist voll oder das Spiel läuft schon.",
    es: "La sala está llena o la partida ya empezó.",
  },
  ownRoom: {
    tr: "Kendi odana katılamazsın. Kodu partnerine gönder.",
    en: "You can't join your own room. Send the code to your partner.",
    de: "Du kannst deinem eigenen Raum nicht beitreten. Schick den Code deinem Partner.",
    es: "No puedes unirte a tu propia sala. Envía el código a tu pareja.",
  },
  noRoom: {
    tr: "Aktif oda bulunamadı.",
    en: "No active room.",
    de: "Kein aktiver Raum.",
    es: "No hay sala activa.",
  },
  busy: {
    tr: "Sunucu şu an çok yoğun, birazdan tekrar dene.",
    en: "The server is very busy, please try again shortly.",
    de: "Der Server ist gerade ausgelastet, bitte gleich nochmal versuchen.",
    es: "El servidor está muy ocupado, inténtalo de nuevo en un momento.",
  },
  hintBlocked: {
    tr: "Bu ipucu gizli kelimeyi ele veriyor. Kelimeyi (ya da kökünü) yazamazsın!",
    en: "That hint gives the word away. You can't write the word (or its root)!",
    de: "Dieser Tipp verrät das Wort. Du darfst das Wort (oder seinen Stamm) nicht schreiben!",
    es: "Esa pista revela la palabra. ¡No puedes escribir la palabra (ni su raíz)!",
  },
  emptyDrawing: {
    tr: "Tuval bomboş kaldı... Bu çizim değil, meditasyon 🧘",
    en: "The canvas stayed empty... that's not a drawing, that's meditation 🧘",
    de: "Die Leinwand blieb leer... das ist keine Zeichnung, das ist Meditation 🧘",
    es: "El lienzo quedó vacío... eso no es un dibujo, es meditación 🧘",
  },
};

const msg = (key: string, locale: Locale) => MESSAGES[key]?.[locale] || MESSAGES[key]?.tr || key;

// ── Helpers ────────────────────────────────────────────────────────────────
function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned.slice(0, maxLength) || fallback;
}

function cleanScore(value: unknown): number {
  const score = Math.round(Number(value));
  return Number.isFinite(score) ? Math.max(1, Math.min(100, score)) : 3;
}

function cleanImage(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!value.startsWith("data:image/png;base64,") && !value.startsWith("data:image/jpeg;base64,") && !value.startsWith("data:image/webp;base64,")) return "";
  return value.length <= MAX_IMAGE_CHARS ? value : "";
}

function getLocale(value: unknown): Locale {
  return VALID_LOCALES.has(value as Locale) ? (value as Locale) : "tr";
}

function createRoomCode(): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i += 1) code += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
    if (!rooms.has(code)) return code;
  }
  throw new Error("ROOM_CODE_EXHAUSTED");
}

function chooseWord(room: Room): string {
  // Daily challenge: today's word (same for everyone) in round 1, then normal mixed words.
  if (room.category === "daily_challenge" && room.round <= 1) {
    const daily = getDailyWord(room.locale);
    room.wordEmoji = daily.emoji;
    return daily.word;
  }
  const picked = pickWord(room.category === "daily_challenge" ? "mixed" : normalizeCategory(room.category), room.locale);
  room.wordEmoji = picked.emoji;
  return picked.word;
}

// ── Event queue ────────────────────────────────────────────────────────────
function push(sessionId: string, event: string, data: Record<string, unknown> = {}): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.nextEventId += 1;
  session.events.push({ id: session.nextEventId, event, data });
  if (session.events.length > MAX_EVENTS_PER_SESSION) session.events.splice(0, session.events.length - MAX_EVENTS_PER_SESSION);
  session.waiters.forEach((waiter) => waiter.resolve());
}

function pushRoom(room: Room, event: string, data: Record<string, unknown> = {}, exceptId?: string): void {
  room.players.forEach((id) => {
    if (id !== exceptId) push(id, event, data);
  });
}

function acknowledge(session: Session, after: number): void {
  if (!Number.isFinite(after) || after <= 0) return;
  // Events at or below the client's cursor were delivered; drop them so the queue stays small.
  let index = 0;
  while (index < session.events.length && session.events[index].id <= after) index += 1;
  if (index) session.events.splice(0, index);
}

function pending(session: Session, after: number): ServerEvent[] {
  return session.events.filter((item) => item.id > after);
}

// ── Room lifecycle ─────────────────────────────────────────────────────────
function clearRoomTimers(room: Room): void {
  room.timers.forEach((timer) => clearTimeout(timer));
  room.timers = [];
}

function later(room: Room, delay: number, fn: () => void): void {
  const timer = setTimeout(() => {
    room.timers = room.timers.filter((item) => item !== timer);
    if (room.state !== "closed") fn();
  }, Math.max(0, delay));
  room.timers.push(timer);
}

function closeRoom(room: Room, leavingId: string | null): void {
  if (room.state === "closed") return;
  room.state = "closed";
  clearRoomTimers(room);
  const leaver = leavingId ? sessions.get(leavingId) : undefined;
  room.players.forEach((id) => {
    const session = sessions.get(id);
    if (session && session.roomCode === room.code) session.roomCode = null;
    if (id !== leavingId) push(id, "partner_disconnected", { partnerName: leaver?.username || "Partner" });
  });
  rooms.delete(room.code);
}

function leaveCurrentRoom(session: Session): void {
  if (!session.roomCode) return;
  const room = rooms.get(session.roomCode);
  session.roomCode = null;
  if (room) closeRoom(room, session.id);
}

const HINT_LABELS: Record<Locale, { letters: (n: number, w: number) => string; first: string; last: string; emoji: string; ai: string }> = {
  tr: { letters: (n, w) => (w > 1 ? `${w} kelime · ${n} harf` : `${n} harfli`), first: "İlk harf", last: "Son harf", emoji: "Emoji ipucu", ai: "Akıllı ipucu" },
  en: { letters: (n, w) => (w > 1 ? `${w} words · ${n} letters` : `${n} letters`), first: "First letter", last: "Last letter", emoji: "Emoji hint", ai: "Smart hint" },
  de: { letters: (n, w) => (w > 1 ? `${w} Wörter · ${n} Buchstaben` : `${n} Buchstaben`), first: "Erster Buchstabe", last: "Letzter Buchstabe", emoji: "Emoji-Tipp", ai: "Schlauer Tipp" },
  es: { letters: (n, w) => (w > 1 ? `${w} palabras · ${n} letras` : `${n} letras`), first: "Primera letra", last: "Última letra", emoji: "Pista emoji", ai: "Pista inteligente" },
};

/** Ready-made hints the describer can "buy" with tokens. Always available, no AI needed. */
function buildHintOptions(room: Room): HintOption[] {
  const labels = HINT_LABELS[room.locale] || HINT_LABELS.tr;
  const word = room.word.trim();
  const letters = word.replace(/[^A-Za-z\u00C0-\u024F]/g, "");
  const words = word.split(/\s+/).filter(Boolean).length;
  const first = (letters[0] || "?").toLocaleUpperCase(room.locale);
  const options: HintOption[] = [
    { id: "letters", label: labels.letters(letters.length, words), text: `🔤 ${labels.letters(letters.length, words)}`, cost: 1, kind: "letters", used: false },
    { id: "first", label: labels.first, text: `🅰️ ${labels.first}: ${first}`, cost: 2, kind: "first", used: false },
  ];
  if (room.wordEmoji) options.push({ id: "emoji", label: labels.emoji, text: `${labels.emoji}: ${room.wordEmoji}`, cost: 4, kind: "emoji", used: false });
  return options;
}

function publicHintOptions(room: Room) {
  return room.hintOptions.map(({ id, label, cost, kind, used, text }) => ({ id, label: kind === "ai" ? text : label, cost, kind, used }));
}

/** Adds up to 3 AI-written hints a moment after the round starts (never blocks the game). */
function addAiHints(room: Room, round: number): void {
  if (!isAiJudgeEnabled()) return;
  void generateHints(room.word, room.locale).then((hints) => {
    if (room.round !== round || room.state === "closed" || room.mode !== "classic") return;
    const labels = HINT_LABELS[room.locale] || HINT_LABELS.tr;
    hints
      .filter((hint) => !hintRevealsWord(hint, room.word))
      .slice(0, 2)
      .forEach((hint, index) => room.hintOptions.push({ id: `ai${index}`, label: labels.ai, text: hint, cost: 1, kind: "ai", used: false }));
    if (room.hintOptions.some((option) => option.kind === "ai")) push(room.describerId, "hint_options", { options: publicHintOptions(room) });
  });
}

function startRound(room: Room): void {
  if (room.players.length < 2 || room.state === "closed") return;
  if (room.mode === "co-draw") {
    startCoDraw(room);
    return;
  }
  clearRoomTimers(room);
  room.round += 1;
  room.word = chooseWord(room);
  room.state = "describing";
  room.hintsThisRound = 0;
  room.guess = "";
  room.guessOptions = [];
  const describerIndex = (room.round - 1) % 2;
  room.describerId = room.players[describerIndex];
  room.drawerId = room.players[1 - describerIndex];
  room.phaseEndsAt = Date.now() + DESCRIBE_SECONDS * 1000;
  room.hintOptions = buildHintOptions(room);

  pushRoom(room, "game_started", { mode: "classic", round: room.round });
  push(room.describerId, "your_role", {
    mode: "classic",
    role: "describer",
    word: room.word,
    wordEmoji: room.wordEmoji,
    timeLimit: DESCRIBE_SECONDS,
    endsAt: room.phaseEndsAt,
    round: room.round,
    hintOptions: publicHintOptions(room),
  });
  push(room.drawerId, "your_role", {
    mode: "classic",
    role: "drawer",
    word: null,
    timeLimit: DESCRIBE_SECONDS,
    endsAt: room.phaseEndsAt,
    round: room.round,
  });
  const round = room.round;
  addAiHints(room, round);
  if (DESCRIBE_SECONDS <= 0) {
    beginDrawing(room);
    return;
  }
  // If the describer's phone never reports "done", move on anyway.
  later(room, DESCRIBE_SECONDS * 1000 + PHASE_GRACE_MS, () => {
    if (room.round === round && room.state === "describing") beginDrawing(room);
  });
}

function beginDrawing(room: Room): void {
  if (room.state !== "describing") return;
  clearRoomTimers(room);
  room.state = "drawing";
  room.phaseEndsAt = Date.now() + DRAW_SECONDS * 1000;
  const options = [room.word, ...getDistractors(room.word, room.category === "daily_challenge" ? "mixed" : room.category, room.locale, 3)];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  room.guessOptions = options;
  push(room.drawerId, "start_drawing", { mode: "classic", timeLimit: DRAW_SECONDS, endsAt: room.phaseEndsAt, options });
  push(room.describerId, "watch_drawing", { mode: "classic", timeLimit: DRAW_SECONDS, endsAt: room.phaseEndsAt });
  const round = room.round;
  later(room, DRAW_SECONDS * 1000 + PHASE_GRACE_MS, () => {
    if (room.round === round && room.state === "drawing") push(room.drawerId, "drawing_time_up", {});
  });
  // Drawer's phone vanished or never uploaded: finish with an empty canvas so the partner isn't stuck.
  later(room, DRAW_SECONDS * 1000 + PHASE_GRACE_MS + SUBMIT_GRACE_MS, () => {
    if (room.round === round && room.state === "drawing") {
      void finishRound(room, { imageData: "", score: 1, comment: msg("emptyDrawing", room.locale) });
    }
  });
}

// ── Co-draw ("Ortak Tuval"): both draw on one shared canvas at the same time ──
function startCoDraw(room: Room): void {
  clearRoomTimers(room);
  room.round += 1;
  room.word = chooseWord(room);
  room.state = "co_drawing";
  room.coReady = new Set();
  const startsAt = Date.now() + CO_COUNTDOWN_SECONDS * 1000;
  room.phaseEndsAt = startsAt + CO_DRAW_SECONDS * 1000;
  pushRoom(room, "game_started", { mode: "co-draw", round: room.round });
  room.players.forEach((id, index) => {
    const partner = sessions.get(room.players[1 - index] || "");
    push(id, "your_role", {
      mode: "co-draw",
      role: "artist",
      word: room.word,
      wordEmoji: room.wordEmoji,
      timeLimit: CO_DRAW_SECONDS,
      countdown: CO_COUNTDOWN_SECONDS,
      endsAt: room.phaseEndsAt,
      round: room.round,
      seat: index,
      partnerName: partner?.username || "Partner",
      partnerAvatar: partner?.avatar || "😎",
    });
  });
  const round = room.round;
  later(room, room.phaseEndsAt - Date.now() + 150, () => {
    if (room.round === round) coTimeUp(room);
  });
}

function coTimeUp(room: Room): void {
  if (room.state !== "co_drawing") return;
  clearRoomTimers(room);
  room.state = "co_collecting";
  room.phaseEndsAt = Math.min(room.phaseEndsAt, Date.now());
  pushRoom(room, "co_draw_time_up", {});
  const round = room.round;
  // Neither phone uploaded the canvas (both went offline): still show a result.
  later(room, PHASE_GRACE_MS + SUBMIT_GRACE_MS, () => {
    if (room.round === round && room.state === "co_collecting") {
      void finishRound(room, { imageData: "", score: 1, comment: msg("emptyDrawing", room.locale) });
    }
  });
}

function num01(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000 : null;
}

function cleanLiveOp(data: Record<string, unknown>): Record<string, unknown> | null {
  if (data.t === "u" || data.t === "x") return { t: data.t };
  if (data.t !== "s") return null;
  const stroke = cleanStroke(data);
  if (!stroke) return null;
  const aspect = Number(data.a);
  return { t: "s", ...stroke, a: Number.isFinite(aspect) ? Math.max(0.3, Math.min(3, aspect)) : 0.75 };
}

function cleanStroke(data: Record<string, unknown>): Record<string, unknown> | null {
  const points = Array.isArray(data.p) ? data.p.slice(0, 240) : [];
  const clean: number[][] = [];
  for (const point of points) {
    if (!Array.isArray(point)) continue;
    const x = num01(point[0]);
    const y = num01(point[1]);
    if (x !== null && y !== null) clean.push([x, y]);
  }
  if (!clean.length) return null;
  const width = Number(data.w);
  return {
    s: cleanText(data.s, "s", 40),
    c: typeof data.c === "string" && HEX_COLOR.test(data.c) ? data.c : "#FFFFFF",
    w: Number.isFinite(width) ? Math.max(0.002, Math.min(0.08, width)) : 0.01,
    p: clean,
  };
}

async function finishRound(room: Room, submission: { imageData: string; score: number; comment: string }): Promise<void> {
  if (room.state !== "drawing" && room.state !== "co_collecting") return;
  clearRoomTimers(room);
  room.state = "judging";
  const round = room.round;
  const startedAt = Date.now();
  pushRoom(room, "generating_result");

  let score = submission.score;
  let comment = submission.comment;
  let guess: string | undefined;
  let comments: Partial<Record<Locale, string>> = {};
  let guesses: Partial<Record<Locale, string>> = {};
  let judgedBy: "ai" | "offline" = "offline";
  if (submission.imageData) {
    const locales = room.players.map((id) => sessions.get(id)?.locale).filter((value): value is Locale => Boolean(value));
    const verdict = await judgeDrawing({ imageData: submission.imageData, word: room.word, locale: room.locale, locales, mode: room.mode });
    if (verdict) {
      score = verdict.score;
      comment = verdict.comment;
      guess = verdict.guess;
      comments = verdict.comments;
      guesses = verdict.guesses;
      judgedBy = "ai";
    }
  }
  if (room.state !== "judging" || room.round !== round) return; // someone left meanwhile

  const wait = Math.max(0, RESULT_MIN_MS - (Date.now() - startedAt));
  later(room, wait, () => {
    if (room.state !== "judging" || room.round !== round) return;
    room.state = "result";
    room.players.forEach((id) => {
      // Each player reads the comment in their own app language. If there is none in
      // that language, the phone writes its own (offline) comment in that language.
      const playerLocale = sessions.get(id)?.locale || room.locale;
      const sameLanguage = playerLocale === room.locale;
      push(id, "show_result", {
      word: room.word,
      wordEmoji: room.wordEmoji,
      imageData: submission.imageData,
      aiScore: score,
      aiComment: judgedBy === "ai" ? comments[playerLocale] || (sameLanguage ? comment : undefined) : undefined,
      aiGuess: guesses[playerLocale] || (sameLanguage ? guess : undefined),
      judgedBy,
      round,
      mode: room.mode,
      playerGuess: room.mode === "classic" ? room.guess || null : undefined,
      guessCorrect: room.mode === "classic" ? Boolean(room.guess) && foldText(room.guess) === foldText(room.word) : undefined,
      });
    });
  });
}

// ── Action handling ────────────────────────────────────────────────────────
function handleAction(session: Session, event: string, data: Record<string, unknown>): void {
  if (event === "create_room") {
    leaveCurrentRoom(session);
    const locale = getLocale(data.locale);
    if (rooms.size >= MAX_ROOMS) {
      push(session.id, "join_error", { message: msg("busy", locale) });
      return;
    }
    session.username = cleanText(data.username, "Player", 24);
    session.avatar = cleanText(data.avatar, "😎", 8);
    session.locale = locale;
    const room: Room = {
      code: createRoomCode(),
      mode: data.mode === "co-draw" ? "co-draw" : "classic",
      coReady: new Set(),
      category: data.category === "daily_challenge" ? "daily_challenge" : normalizeCategory(data.category),
      locale,
      players: [session.id],
      state: "waiting",
      round: 0,
      word: "",
      wordEmoji: "",
      describerId: "",
      drawerId: "",
      phaseEndsAt: 0,
      timers: [],
      hintsThisRound: 0,
      hintOptions: [],
      guessOptions: [],
      guess: "",
      createdAt: Date.now(),
    };
    rooms.set(room.code, room);
    session.roomCode = room.code;
    push(session.id, "room_created", { code: room.code, role: "host", mode: room.mode, requiredPlayers: 2 });
    return;
  }

  if (event === "join_room") {
    const locale = getLocale(data.locale);
    const code = cleanText(data.code, "", 6).toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      push(session.id, "join_error", { message: msg("roomNotFound", locale) });
      return;
    }
    if (room.players.includes(session.id)) {
      push(session.id, "join_error", { message: msg("ownRoom", locale) });
      return;
    }
    if (room.players.length >= 2 || room.state !== "waiting") {
      push(session.id, "join_error", { message: msg("roomFull", locale) });
      return;
    }
    leaveCurrentRoom(session);
    session.username = cleanText(data.username, "Player", 24);
    session.avatar = cleanText(data.avatar, "😎", 8);
    session.locale = locale;
    room.players.push(session.id);
    session.roomCode = room.code;
    push(session.id, "room_joined", { code: room.code, role: "guest", mode: room.mode });
    room.players.forEach((id) => {
      const partner = sessions.get(room.players.find((other) => other !== id) || "");
      push(id, "player_joined", {
        partnerName: partner?.username || "Partner",
        partnerAvatar: partner?.avatar || "😎",
        playerCount: room.players.length,
        requiredPlayers: 2,
      });
    });
    room.state = "result"; // "between rounds" until the first round starts
    later(room, START_DELAY_MS, () => {
      if (room.round === 0) startRound(room);
    });
    return;
  }

  // Legacy event from older servers that let the phone pick the word. Words are chosen here now.
  if (event === "round_word") return;

  const room = session.roomCode ? rooms.get(session.roomCode) : undefined;
  if (!room) {
    if (event !== "cancel_room") push(session.id, "join_error", { message: msg("noRoom", getLocale(data.locale)) });
    return;
  }

  if (event === "cancel_room") {
    leaveCurrentRoom(session);
    return;
  }

  if (event === "send_hint") {
    if (room.state !== "describing" && room.state !== "drawing") return;
    if (room.hintsThisRound >= 60) return;
    if (room.mode === "classic" && session.id !== room.describerId) return;
    const text = cleanText(data.text, "", 80);
    if (!text) return;
    const id = cleanText(data.id, randomUUID(), 64);
    if (hintRevealsWord(text, room.word)) {
      push(session.id, "hint_rejected", { id, text, message: msg("hintBlocked", room.locale) });
      return;
    }
    room.hintsThisRound += 1;
    pushRoom(room, "hint_received", { text, id }, session.id);
    return;
  }

  if (event === "use_hint_option") {
    if (room.mode !== "classic" || session.id !== room.describerId) return;
    if (room.state !== "describing" && room.state !== "drawing") return;
    const option = room.hintOptions.find((item) => item.id === String(data.optionId || ""));
    if (!option || option.used) return;
    option.used = true;
    const id = `opt-${room.round}-${option.id}`;
    push(room.drawerId, "hint_received", { text: option.text, id, kind: option.kind });
    push(room.describerId, "hint_option_used", { optionId: option.id, id, text: option.text, cost: option.cost, options: publicHintOptions(room) });
    return;
  }

  if (event === "submit_guess") {
    if (room.mode !== "classic" || session.id !== room.drawerId || room.state !== "drawing") return;
    const guess = cleanText(data.guess, "", 60);
    if (!room.guessOptions.includes(guess)) return;
    room.guess = guess;
    push(room.describerId, "partner_guess", { guess });
    return;
  }

  if (event === "description_done") {
    if (session.id === room.describerId && room.state === "describing") beginDrawing(room);
    return;
  }

  if (event === "submit_drawing") {
    if (session.id !== room.drawerId || room.state !== "drawing") return;
    const guess = cleanText(data.guess, "", 60);
    if (guess && room.guessOptions.includes(guess)) room.guess = guess;
    void finishRound(room, {
      imageData: cleanImage(data.imageData),
      score: cleanScore(data.score),
      comment: cleanText(data.comment, "Çizim tamamlandı.", 300),
    });
    return;
  }

  if (event === "live_stroke") {
    // Classic mode: the drawer's strokes are relayed to the describer as they happen.
    if (room.mode !== "classic" || room.state !== "drawing" || session.id !== room.drawerId) return;
    const op = cleanLiveOp(data);
    if (op) push(room.describerId, "live_stroke", op);
    return;
  }

  if (event === "co_draw_stroke") {
    const lateOk = room.state === "co_collecting" && Date.now() - room.phaseEndsAt < CO_STROKE_LATE_MS;
    if (room.mode !== "co-draw" || (room.state !== "co_drawing" && !lateOk)) return;
    const stroke = cleanStroke(data);
    if (stroke) pushRoom(room, "co_draw_stroke", stroke, session.id);
    return;
  }

  if (event === "co_draw_react") {
    if (room.mode !== "co-draw" || room.state !== "co_drawing") return;
    const emoji = String(data.emoji || "");
    if (CO_REACTIONS.has(emoji)) pushRoom(room, "co_draw_react", { emoji, id: cleanText(data.id, randomUUID(), 64) }, session.id);
    return;
  }

  if (event === "co_draw_ready") {
    if (room.mode !== "co-draw" || room.state !== "co_drawing") return;
    room.coReady.add(session.id);
    pushRoom(room, "co_draw_partner_ready", { ready: true }, session.id);
    if (room.players.every((id) => room.coReady.has(id))) coTimeUp(room);
    return;
  }

  if (event === "co_draw_submit") {
    if (room.mode !== "co-draw" || room.state !== "co_collecting") return;
    void finishRound(room, {
      imageData: cleanImage(data.imageData),
      score: cleanScore(data.score),
      comment: cleanText(data.comment, "Ortak eser tamamlandı.", 300),
    });
    return;
  }

  if (event === "play_again") {
    if (room.players.length === 2 && room.state === "result" && room.round > 0) startRound(room);
  }
}

// ── HTTP layer ─────────────────────────────────────────────────────────────
function authenticate(request: Request): Session | null {
  const sessionId = String(request.header("x-session-id") || "");
  const auth = String(request.header("authorization") || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const session = sessions.get(sessionId);
  if (!session || !token) return null;
  const given = Buffer.from(token);
  if (given.length !== session.token.length || !timingSafeEqual(given, session.token)) return null;
  session.lastSeen = Date.now();
  return session;
}

const sessionRate = new Map<string, { windowStart: number; count: number }>();
function allowSessionCreate(ip: string): boolean {
  const now = Date.now();
  const entry = sessionRate.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    sessionRate.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 40;
}

function sweep(): void {
  const now = Date.now();
  rooms.forEach((room) => {
    const grace = room.state === "waiting" ? WAITING_GRACE_MS : PLAY_GRACE_MS;
    for (const id of room.players) {
      const session = sessions.get(id);
      const silent = !session || (session.waiters.size === 0 && now - session.lastSeen > grace);
      if (silent) {
        if (session) session.roomCode = null;
        closeRoom(room, id);
        break;
      }
    }
  });
  sessions.forEach((session, id) => {
    if (!session.roomCode && session.waiters.size === 0 && now - session.lastSeen > SESSION_TTL_MS) sessions.delete(id);
  });
  sessionRate.forEach((entry, ip) => {
    if (now - entry.windowStart > 120_000) sessionRate.delete(ip);
  });
}

function createGameServer() {
  const app = express();
  const server = createServer(app);
  server.keepAliveTimeout = LONG_POLL_MS + 5000;
  server.headersTimeout = LONG_POLL_MS + 6000;
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  // The app runs from https://localhost (Android) and capacitor://localhost (iOS),
  // so every API call is cross-origin. Auth is a bearer token, not a cookie, so "*" is safe.
  app.use("/api", (request: Request, response: Response, next: NextFunction) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-session-id");
    response.setHeader("Access-Control-Max-Age", "86400");
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    next();
  });
  app.use("/api", express.json({ limit: "6mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      protocol: 2,
      release: "v11",
      rooms: rooms.size,
      sessions: sessions.size,
      ai: isAiJudgeEnabled(),
      auth: { apple: isProviderConfigured("apple"), google: isProviderConfigured("google") },
    });
  });

  app.post("/api/auth/verify", async (request, response) => {
    if (!allowSessionCreate(`auth:${request.ip || "unknown"}`)) {
      response.status(429).json({ error: "RATE_LIMITED" });
      return;
    }
    const body = (request.body || {}) as { provider?: unknown; idToken?: unknown; name?: unknown };
    const provider = body.provider === "apple" || body.provider === "google" ? body.provider : null;
    if (!provider) {
      response.status(400).json({ error: "BAD_PROVIDER" });
      return;
    }
    try {
      const user = await verifyIdToken(provider, String(body.idToken || ""), typeof body.name === "string" ? body.name : "");
      response.json({ user });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 500;
      response.status(status).json({ error: error instanceof Error ? error.message : "AUTH_FAILED" });
    }
  });

  app.post("/api/session", (request, response) => {
    if (!allowSessionCreate(request.ip || "unknown")) {
      response.status(429).json({ error: msg("busy", "tr") });
      return;
    }
    if (sessions.size >= MAX_SESSIONS) sweep();
    if (sessions.size >= MAX_SESSIONS) {
      response.status(503).json({ error: msg("busy", "tr") });
      return;
    }
    const id = randomUUID();
    const token = randomBytes(24).toString("base64url");
    const now = Date.now();
    sessions.set(id, {
      id,
      token: Buffer.from(token),
      nextEventId: 0,
      events: [],
      waiters: new Set(),
      lastSeen: now,
      createdAt: now,
      roomCode: null,
      username: "Player",
      avatar: "😎",
      seenActions: new Set(),
      seenActionOrder: [],
      locale: "tr",
    });
    response.status(201).json({ sessionId: id, token, protocol: 2 });
  });

  app.get("/api/events", (request, response) => {
    const session = authenticate(request);
    if (!session) {
      response.status(401).json({ error: "SESSION_EXPIRED" });
      return;
    }
    const after = Number(request.query.after) || 0;
    acknowledge(session, after);
    const reply = () => {
      if (response.writableEnded) return;
      session.lastSeen = Date.now();
      response.json({ events: pending(session, after), cursor: session.nextEventId, serverTime: Date.now(), pollAfterMs: 150 });
    };
    if (pending(session, after).length || LONG_POLL_MS === 0) {
      reply();
      return;
    }
    // Long-poll: answer as soon as something happens, or after LONG_POLL_MS with an empty list.
    const waiter: Waiter = {
      resolve: () => {
        clearTimeout(waiter.timer);
        session.waiters.delete(waiter);
        // Let a burst of events (e.g. game_started + your_role) land in one reply.
        setTimeout(reply, 15);
      },
      timer: setTimeout(() => {
        session.waiters.delete(waiter);
        reply();
      }, LONG_POLL_MS),
    };
    session.waiters.add(waiter);
    request.on("close", () => {
      if (session.waiters.delete(waiter)) clearTimeout(waiter.timer);
      session.lastSeen = Date.now();
    });
  });

  app.post("/api/actions", (request, response) => {
    const session = authenticate(request);
    if (!session) {
      response.status(401).json({ error: "SESSION_EXPIRED" });
      return;
    }
    const body = (request.body || {}) as { actions?: unknown; after?: unknown };
    const actions = Array.isArray(body.actions) ? body.actions.slice(0, 50) : [];
    for (const raw of actions) {
      if (!raw || typeof raw !== "object") continue;
      const action = raw as { id?: unknown; event?: unknown; data?: unknown };
      if (typeof action.event !== "string") continue;
      const actionId = typeof action.id === "string" ? action.id.slice(0, 80) : "";
      // The phone retries a batch after a network error; never apply the same action twice.
      if (actionId) {
        if (session.seenActions.has(actionId)) continue;
        session.seenActions.add(actionId);
        session.seenActionOrder.push(actionId);
        if (session.seenActionOrder.length > 600) session.seenActions.delete(session.seenActionOrder.shift()!);
      }
      const data = action.data && typeof action.data === "object" ? (action.data as Record<string, unknown>) : {};
      try {
        handleAction(session, action.event, data);
      } catch (error) {
        console.error("[action]", action.event, error);
        push(session.id, "protocol_error", { message: msg("busy", getLocale(data.locale)) });
      }
    }
    const after = Number(body.after) || 0;
    acknowledge(session, after);
    response.json({ accepted: true, events: pending(session, after), cursor: session.nextEventId, serverTime: Date.now() });
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "NOT_FOUND" });
  });

  // JSON errors (e.g. body too large) instead of HTML pages.
  app.use((error: Error & { status?: number; type?: string }, _request: Request, response: Response, next: NextFunction) => {
    if (response.headersSent) return next(error);
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    response.status(status).json({ error: status === 413 ? "Çizim çok büyük." : "Sunucu hatası." });
  });

  // Optional: serve the web build too (handy for testing in a browser).
  const staticPath = process.env.NODE_ENV === "production"
    ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public")
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "public");
  app.use(express.static(staticPath));
  app.get("*", (_request, response) => response.sendFile(path.join(staticPath, "index.html"), (error) => {
    if (error && !response.headersSent) response.status(404).end();
  }));

  const sweeper = setInterval(sweep, 2000);
  sweeper.unref();
  server.on("close", () => {
    clearInterval(sweeper);
    rooms.forEach((room) => clearRoomTimers(room));
    sessions.forEach((session) => session.waiters.forEach((waiter) => clearTimeout(waiter.timer)));
  });

  return { app, server };
}

export async function startServer(requestedPort = Number(process.env.PORT) || 3000) {
  const gameServer = createGameServer();
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    gameServer.server.once("error", onError);
    gameServer.server.listen(requestedPort, "0.0.0.0", () => {
      gameServer.server.off("error", onError);
      keepAwake();
      resolve();
    });
  });
  const address = gameServer.server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  return { ...gameServer, port };
}

export const __internals = { sessions, rooms };

const isMainModule = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMainModule) {
  startServer()
    .then(({ port }) => {
      console.log(`Couple Chaos server (protocol 2) on port ${port} — AI judge ${isAiJudgeEnabled() ? "ON" : "OFF (offline comments)"}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

/**
 * Render's free plan puts the server to sleep after 15 idle minutes, and the first
 * visitor then waits ~50 s. A light ping through the public URL keeps it awake.
 * Render sets RENDER_EXTERNAL_URL itself; KEEP_AWAKE=0 turns this off.
 */
function keepAwake(): void {
  const base = process.env.KEEP_AWAKE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.KEEP_AWAKE === "0") return;
  const url = `${base.replace(/\/$/, "")}/api/health`;
  const timer = setInterval(() => {
    void fetch(url, { signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
  }, 10 * 60_000);
  timer.unref();
}
