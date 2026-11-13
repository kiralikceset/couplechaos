import { getLocale, t, type Locale } from "./i18n";
import { findWordEmoji, getDailyWord, getRandomWord, normalizeCategory } from "./wordPool";

type Listener = (data?: any) => void;
export type GameTransport = "online" | "local" | "connecting" | "offline";
type GameMode = "classic" | "co-draw";

interface LocalRoom {
  code: string;
  mode: GameMode;
  category: string;
  word: string;
  timeLimit: number;
}

interface QueuedAction {
  id: string;
  event: string;
  data: Record<string, unknown>;
}

interface ServerEvent {
  id: number;
  event: string;
  data?: unknown;
}

const ENV_SERVER_URL = (import.meta.env.VITE_GAME_SERVER_URL as string | undefined)?.trim() || "";
const STORED_SERVER_URL = typeof window !== "undefined"
  ? localStorage.getItem("cc_game_server_url")?.trim() || ""
  : "";

function toHttpBaseUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "ws:") url.protocol = "http:";
    if (url.protocol === "wss:") url.protocol = "https:";
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.pathname = url.pathname.replace(/\/(game|api)\/?$/, "").replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** Public HTTPS base of the game server, or "" in single-device mode. */
export function getServerBaseUrl(): string {
  return toHttpBaseUrl(STORED_SERVER_URL || ENV_SERVER_URL);
}

function generateLocalCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function normalizeLocale(value: unknown): Locale {
  return (["tr", "en", "de", "es"] as string[]).includes(String(value)) ? value as Locale : getLocale();
}

function selectWord(category: string, locale: Locale): string {
  if (category === "daily_challenge") return getDailyWord(locale).word;
  return getRandomWord(normalizeCategory(category), locale);
}

function detectPlatform(): string {
  const capacitor = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  try {
    return capacitor?.getPlatform?.() || "web";
  } catch {
    return "web";
  }
}

function createActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class GameSocket {
  connected: boolean;
  transport: GameTransport;
  private listeners = new Map<string, Set<Listener>>();
  private localRoom: LocalRoom | null = null;
  private readonly serverUrl: string;
  private sessionId = "";
  private token = "";
  private eventCursor = 0;
  private actionQueue: QueuedAction[] = [];
  private connectPromise: Promise<void> | null = null;
  private flushing = false;
  private polling = false;
  private reconnectTimer: number | null = null;
  private pollTimer: number | null = null;
  private flushTimer: number | null = null;
  private reconnectDelay = 1200;
  private stopped = false;
  private active = true;
  private generation = 0;
  private requests = new Set<AbortController>();

  /** Server base URL ("" in single-device mode). */
  get baseUrl(): string {
    return this.serverUrl;
  }

  constructor(serverUrlOverride?: string) {
    this.serverUrl = toHttpBaseUrl(serverUrlOverride ?? (STORED_SERVER_URL || ENV_SERVER_URL));
    this.connected = !this.serverUrl;
    this.transport = this.serverUrl ? "offline" : "local";
  }

  on(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    if (event === "connect" && this.connected) queueMicrotask(() => listener());
    return this;
  }

  off(event: string, listener?: Listener): this {
    if (!listener) {
      this.listeners.delete(event);
      return this;
    }
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, data: Record<string, unknown> = {}): this {
    if (!this.serverUrl) {
      this.handleLocalEvent(event, data);
      return this;
    }

    const action = { id: createActionId(), event, data };
    if (this.actionQueue.length >= 500) {
      const removable = this.actionQueue.findIndex((queued) => queued.event.endsWith("_stroke"));
      if (removable >= 0) this.actionQueue.splice(removable, 1);
      else {
        this.dispatch("protocol_error", { message: t("net.queueFull") });
        return this;
      }
    }
    this.actionQueue.push(action);
    if (this.transport !== "online") this.connect();
    this.scheduleFlush(event.endsWith("_stroke") ? 55 : 0);
    return this;
  }

  connect(): void {
    if (!this.serverUrl || typeof fetch === "undefined" || this.connectPromise || this.transport === "online") return;
    this.stopped = false;
    const generation = this.generation;
    this.connectPromise = this.establishConnection().finally(() => {
      if (generation === this.generation) this.connectPromise = null;
    });
  }

  disconnect(): void {
    this.stopped = true;
    this.generation += 1;
    this.requests.forEach((controller) => controller.abort());
    this.requests.clear();
    this.connectPromise = null;
    this.polling = false;
    this.flushing = false;
    this.clearTimers();
    this.sessionId = "";
    this.token = "";
    this.eventCursor = 0;
    this.actionQueue = [];
    this.localRoom = null;
    this.connected = !this.serverUrl;
    this.setTransport(this.serverUrl ? "offline" : "local");
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      if (this.pollTimer !== null) window.clearTimeout(this.pollTimer);
      if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
      this.pollTimer = null;
      this.reconnectTimer = null;
    } else if (!this.stopped) {
      if (this.transport === "online") this.schedulePoll(0);
      else this.connect();
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    this.requests.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`${this.serverUrl}${path}`, { ...init, signal: controller.signal, cache: "no-store" });
      const body = await response.arrayBuffer();
      return new Response(body, { status: response.status, headers: response.headers });
    } finally {
      window.clearTimeout(timeout);
      this.requests.delete(controller);
    }
  }

  private setTransport(next: GameTransport): void {
    if (this.transport === next) return;
    this.transport = next;
    this.dispatch("transport_changed", { transport: next });
  }

  private async establishConnection(): Promise<void> {
    const generation = this.generation;
    this.setTransport("connecting");
    try {
      let initialEvents: ServerEvent[] = [];
      let initialServerTime: number | undefined;
      if (this.sessionId && this.token) {
        const response = await this.request(`/api/events?after=${this.eventCursor}`, {
          method: "GET",
          headers: this.authHeaders(),
        });
        if (response.status === 401) {
          this.sessionId = "";
          this.token = "";
          this.eventCursor = 0;
          throw new Error("SESSION_EXPIRED");
        }
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const payload = await response.json() as { events?: ServerEvent[]; cursor?: number; serverTime?: number };
        initialEvents = Array.isArray(payload.events) ? payload.events : [];
        initialServerTime = payload.serverTime;
      } else {
        const response = await this.request("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ client: detectPlatform(), protocol: 2 }),
        });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const payload = await response.json() as { sessionId?: string; token?: string; protocol?: number };
        if (this.stopped || generation !== this.generation) return;
        if (!payload.sessionId || !payload.token || payload.protocol !== 2) throw new Error("PROTOCOL_MISMATCH");
        this.sessionId = payload.sessionId;
        this.token = payload.token;
        this.eventCursor = 0;
      }

      if (this.stopped || generation !== this.generation) return;
      const wasConnected = this.connected;
      this.connected = true;
      this.reconnectDelay = 1200;
      this.setTransport("online");
      if (!wasConnected) this.dispatch("connect");
      this.dispatch("server_ready", { protocol: 2 });
      this.handleServerEvents(initialEvents, initialServerTime);
      this.schedulePoll(0);
      this.scheduleFlush(0);
    } catch (error) {
      if (this.stopped || generation !== this.generation) return;
      if (String(error).includes("SESSION_EXPIRED")) {
        this.dispatch("join_error", { message: t("net.sessionExpired") });
        this.sessionId = "";
        this.token = "";
        this.eventCursor = 0;
      }
      const wasConnected = this.connected;
      this.connected = false;
      this.setTransport("offline");
      if (wasConnected) this.dispatch("disconnect");
      this.dispatch("connect_error", { message: t("net.offline") });
      this.actionQueue = this.actionQueue.filter((action) => action.event !== "create_room" && action.event !== "join_room");
      this.scheduleReconnect();
    }
  }

  private authHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
      "x-session-id": this.sessionId,
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || !this.active || !this.serverUrl || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(15_000, Math.round(this.reconnectDelay * 1.7));
  }

  private schedulePoll(delay: number): void {
    if (this.stopped || !this.active || this.transport !== "online" || this.pollTimer !== null) return;
    this.pollTimer = window.setTimeout(() => {
      this.pollTimer = null;
      void this.poll();
    }, delay);
  }

  private async poll(): Promise<void> {
    if (this.polling || this.transport !== "online" || !this.sessionId) return;
    this.polling = true;
    const generation = this.generation;
    try {
      const response = await this.request(`/api/events?after=${this.eventCursor}`, {
        method: "GET",
        headers: this.authHeaders(),
      });
      if (response.status === 401) {
        this.sessionId = "";
        this.token = "";
        this.eventCursor = 0;
        this.dispatch("join_error", { message: t("net.sessionExpired") });
        throw new Error("SESSION_EXPIRED");
      }
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const payload = await response.json() as { events?: ServerEvent[]; cursor?: number; serverTime?: number; pollAfterMs?: number };
      if (this.stopped || generation !== this.generation) return;
      const events = Array.isArray(payload.events) ? payload.events : [];
      this.handleServerEvents(events, payload.serverTime);
      this.polling = false;
      // Ask again right away: the server holds the request until something happens.
      const after = Number(payload.pollAfterMs);
      this.schedulePoll(Math.max(0, Math.min(3000, Number.isFinite(after) ? after : 250)));
    } catch {
      if (this.stopped || generation !== this.generation) return;
      this.polling = false;
      const wasConnected = this.connected;
      this.connected = false;
      this.setTransport("offline");
      if (wasConnected) this.dispatch("disconnect");
      this.scheduleReconnect();
    }
  }

  private handleServerEvents(events: ServerEvent[], serverTime?: number): void {
    for (const item of events) {
      if (!item || typeof item.event !== "string" || !Number.isSafeInteger(item.id) || item.id <= this.eventCursor) continue;
      // Polls and action responses can arrive in either order. Deliver once.
      this.eventCursor = item.id;
      if (item.event === "select_word") {
        const data = item.data as { code?: string; round?: number; category?: string; locale?: Locale } | undefined;
        const word = selectWord(data?.category || "daily", normalizeLocale(data?.locale));
        this.emit("round_word", { code: data?.code || "", round: data?.round || 1, word });
        continue;
      }
      const data = item.data as Record<string, unknown> | undefined;
      if (data && typeof data.endsAt === "number") {
        const serverNow = typeof serverTime === "number" ? serverTime : Date.now();
        this.dispatch(item.event, { ...data, localEndsAt: Date.now() + Math.max(0, data.endsAt - serverNow) });
      } else {
        this.dispatch(item.event, item.data);
      }
    }
  }

  private scheduleFlush(delay: number): void {
    if (this.stopped || this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      void this.flushActions();
    }, delay);
  }

  private async flushActions(): Promise<void> {
    if (this.flushing || this.transport !== "online" || !this.sessionId || !this.actionQueue.length) return;
    this.flushing = true;
    const generation = this.generation;
    const batch = this.actionQueue.slice(0, 50);
    try {
      const response = await this.request("/api/actions", {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ actions: batch, after: this.eventCursor }),
      });
      if (response.status === 401) {
        this.sessionId = "";
        this.token = "";
        this.eventCursor = 0;
        throw new Error("SESSION_EXPIRED");
      }
      if (!response.ok) {
        // The server answers with codes (RATE_LIMITED…), not sentences: show a translated message.
        const message = response.status === 429 ? t("net.queueFull") : t("connect.error");
        this.dispatch("protocol_error", { message });
        if (response.status >= 400 && response.status < 500) this.actionQueue.splice(0, batch.length);
        throw new Error(`HTTP_${response.status}`);
      }
      const payload = await response.json() as { events?: ServerEvent[]; serverTime?: number };
      if (this.stopped || generation !== this.generation) return;
      const sentIds = new Set(batch.map((action) => action.id));
      this.actionQueue = this.actionQueue.filter((action) => !sentIds.has(action.id));
      this.handleServerEvents(Array.isArray(payload.events) ? payload.events : [], payload.serverTime);
      this.flushing = false;
      if (this.actionQueue.length) this.scheduleFlush(0);
    } catch (error) {
      if (this.stopped || generation !== this.generation) return;
      this.flushing = false;
      const wasConnected = this.connected;
      this.connected = false;
      this.setTransport("offline");
      if (wasConnected) this.dispatch("disconnect");
      if (String(error).includes("SESSION_EXPIRED")) {
        this.dispatch("join_error", { message: t("net.sessionExpired") });
      }
      this.scheduleReconnect();
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    if (this.pollTimer !== null) window.clearTimeout(this.pollTimer);
    if (this.flushTimer !== null) window.clearTimeout(this.flushTimer);
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.flushTimer = null;
  }

  private dispatch(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  private startLocalRound(): void {
    if (!this.localRoom) return;
    this.localRoom.word = selectWord(this.localRoom.category, getLocale());
    const room = this.localRoom;
    if (room.mode === "co-draw") {
      // Single-device test mode: one player draws alone on the "shared" canvas.
      window.setTimeout(() => {
        this.dispatch("game_started", { mode: "co-draw", local: true });
        this.dispatch("your_role", {
          mode: "co-draw",
          role: "artist",
          word: room.word,
          timeLimit: 20,
          seat: 0,
          localEndsAt: Date.now() + 23_000,
          local: true,
        });
        window.setTimeout(() => {
          if (this.localRoom === room) this.dispatch("co_draw_time_up", {});
        }, 23_000);
      }, 350);
      return;
    }

    window.setTimeout(() => {
      this.dispatch("game_started", { mode: room.mode, local: true });
      this.dispatch("your_role", {
        mode: room.mode,
        role: "describer",
        word: room.word,
        timeLimit: room.timeLimit,
        local: true,
      });
    }, 350);
  }

  private completeLocalRound(
    data: Record<string, unknown>,
    comment?: string,
    extras: { outcome?: "win" | "loss" | "draw"; opponentScore?: number; mode?: GameMode } = {},
  ): void {
    if (!this.localRoom) return;
    const score = Math.max(1, Math.min(100, Number(data.score) || 3));
    const imageData = typeof data.imageData === "string" ? data.imageData : "";
    const aiComment = comment || (typeof data.comment === "string" ? data.comment : "");
    this.dispatch("generating_result");
    window.setTimeout(() => {
      this.dispatch("show_result", {
        word: this.localRoom?.word || "",
        wordEmoji: findWordEmoji(this.localRoom?.word || ""),
        imageData,
        aiComment,
        aiScore: score,
        ...extras,
      });
    }, 700);
  }

  private handleLocalEvent(event: string, data: Record<string, unknown>): void {
    if (event === "create_room") {
      this.localRoom = {
        code: generateLocalCode(),
        mode: data.mode === "co-draw" ? "co-draw" : "classic",
        category: typeof data.category === "string" ? data.category : "daily",
        word: "",
        timeLimit: 10,
      };
      this.dispatch("room_created", { code: this.localRoom.code, role: "host", local: true });
      window.setTimeout(() => {
        this.dispatch("player_joined", { partnerName: "Tek cihaz modu", local: true });
        this.startLocalRound();
      }, 450);
      return;
    }

    if (event === "join_room") {
      const requestedCode = typeof data.code === "string" ? data.code.trim().toUpperCase() : "";
      this.localRoom = {
        code: /^[A-Z0-9]{6}$/.test(requestedCode) ? requestedCode : generateLocalCode(),
        mode: "classic",
        category: typeof data.category === "string" ? data.category : "daily",
        word: "",
        timeLimit: 10,
      };
      this.dispatch("room_joined", { code: this.localRoom.code, role: "guest", local: true });
      window.setTimeout(() => {
        this.dispatch("player_joined", { partnerName: "Tek cihaz modu", local: true });
        this.startLocalRound();
      }, 450);
      return;
    }

    if (event === "description_done" && this.localRoom?.mode === "classic") {
      this.dispatch("start_drawing", {
        mode: "classic",
        timeLimit: this.localRoom.timeLimit,
        local: true,
      });
      return;
    }

    if (event === "submit_drawing" || event === "co_draw_submit") {
      this.completeLocalRound(data, undefined, this.localRoom?.mode === "co-draw" ? { mode: "co-draw" } : {});
      return;
    }

    if (event === "co_draw_ready" && this.localRoom?.mode === "co-draw") {
      this.dispatch("co_draw_time_up", {});
      return;
    }

    if (event === "play_again") {
      this.startLocalRound();
      return;
    }

    if (event === "cancel_room") this.localRoom = null;
  }
}

export const socket = new GameSocket();
export default socket;
