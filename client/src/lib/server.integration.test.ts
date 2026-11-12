/**
 * End-to-end: the real game server + two real GameSocket clients (the exact
 * transport code shipped in the app), talking over HTTP on localhost.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.DESCRIBE_SECONDS = "1";
process.env.DRAW_SECONDS = "1";
process.env.START_DELAY_MS = "40";
process.env.LONG_POLL_MS = "1500";
process.env.RESULT_MIN_MS = "40";
process.env.PHASE_GRACE_MS = "200";
process.env.SUBMIT_GRACE_MS = "400";
process.env.PLAY_GRACE_MS = "1500";
process.env.CO_DRAW_SECONDS = "2";
process.env.CO_COUNTDOWN_SECONDS = "0";
process.env.RANDOM_MATCH = "1";
process.env.SOLO_DESCRIBE_SECONDS = "1";
process.env.DATA_DIR = `${process.env.TMPDIR || "/tmp"}/cc-test-${process.pid}`;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GROQ_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});
vi.stubGlobal("navigator", { language: "tr" });
vi.stubGlobal("window", globalThis);

type Logged = { event: string; data: any };
const EVENTS = [
  "connect", "room_created", "room_joined", "player_joined", "game_started", "your_role", "start_drawing",
  "watch_drawing", "live_stroke", "hint_received", "drawing_time_up", "generating_result", "show_result",
  "partner_disconnected", "join_error", "protocol_error",
  "co_draw_stroke", "co_draw_react", "co_draw_partner_ready", "co_draw_time_up",
  "hint_rejected", "hint_options", "hint_option_used", "partner_guess",
  "match_waiting", "match_cancelled", "report_received",
];

let baseUrl = "";
let stop: () => Promise<void> = async () => {};
let GameSocketClass: typeof import("./socket").GameSocket;

beforeAll(async () => {
  const { startServer } = await import("../../../server/index");
  const started = await startServer(0);
  baseUrl = `http://127.0.0.1:${started.port}`;
  stop = () => new Promise((resolve) => {
    started.server.closeAllConnections?.();
    started.server.close(() => resolve());
  });
  GameSocketClass = (await import("./socket")).GameSocket;
});

afterAll(async () => {
  await stop();
});

function client() {
  const socket = new GameSocketClass(baseUrl);
  const log: Logged[] = [];
  EVENTS.forEach((event) => socket.on(event, (data) => log.push({ event, data })));
  return { socket, log };
}

async function waitFor(log: Logged[], event: string, count = 1, timeout = 6000): Promise<Logged> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const matches = log.filter((entry) => entry.event === event);
    if (matches.length >= count) return matches[count - 1];
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timeout waiting for ${event} x${count}; got ${log.map((entry) => entry.event).join(",")}`);
}

const TINY_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

async function startedRoom() {
  const host = client();
  const guest = client();
  host.socket.emit("create_room", { username: "Yusuf", avatar: "😎", mode: "classic", category: "funny", locale: "tr" });
  const created = await waitFor(host.log, "room_created");
  const code = created.data.code as string;
  guest.socket.emit("join_room", { code: code.toLowerCase(), username: "Elif", avatar: "🦄", locale: "tr" });
  await waitFor(guest.log, "room_joined");
  await waitFor(host.log, "your_role");
  await waitFor(guest.log, "your_role");
  return { host, guest, code };
}

describe("protocol 2 server with the real app transport", () => {
  it("plays a full classic round: hints, drawing, shared result, then swaps roles", async () => {
    const { host, guest, code } = await startedRoom();
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect((await waitFor(host.log, "player_joined")).data.partnerName).toBe("Elif");
    expect((await waitFor(guest.log, "player_joined")).data.partnerName).toBe("Yusuf");

    const hostRole = (await waitFor(host.log, "your_role")).data;
    const guestRole = (await waitFor(guest.log, "your_role")).data;
    expect(hostRole.role).toBe("describer");
    expect(typeof hostRole.word).toBe("string");
    expect(hostRole.word.length).toBeGreaterThan(0);
    expect(guestRole.role).toBe("drawer");
    expect(guestRole.word).toBeNull(); // the drawer must never receive the secret word
    expect(hostRole.localEndsAt).toBeGreaterThan(Date.now() - 50);

    host.socket.emit("send_hint", { code, text: "qqq zzz ipucu", id: "h1" });
    const hint = await waitFor(guest.log, "hint_received");
    expect(hint.data.text).toBe("qqq zzz ipucu");
    expect(host.log.some((entry) => entry.event === "hint_received")).toBe(false);

    host.socket.emit("description_done", { code });
    const drawing = await waitFor(guest.log, "start_drawing");
    expect(drawing.data.word).toBeUndefined();
    expect(drawing.data.localEndsAt).toBeGreaterThan(Date.now());
    expect((await waitFor(host.log, "watch_drawing")).data.timeLimit).toBe(1);

    guest.socket.emit("submit_drawing", { code, imageData: TINY_JPEG, score: 64, comment: "Fena değil" });
    const hostResult = (await waitFor(host.log, "show_result")).data;
    const guestResult = (await waitFor(guest.log, "show_result")).data;
    expect(hostResult.word).toBe(hostRole.word);
    expect(typeof hostResult.wordEmoji).toBe("string");
    expect(hostResult.wordEmoji.length).toBeGreaterThan(0);
    expect(hostRole.wordEmoji).toBe(hostResult.wordEmoji); // describer sees the picture too
    expect(guestRole.wordEmoji).toBeUndefined(); // the drawer must not
    expect(guestResult.word).toBe(hostRole.word);
    expect(hostResult.imageData).toBe(TINY_JPEG);
    expect(hostResult.aiScore).toBe(64);
    expect(hostResult.judgedBy).toBe("offline");
    expect(host.log.filter((entry) => entry.event === "generating_result")).toHaveLength(1);

    guest.socket.emit("play_again", { code });
    host.socket.emit("play_again", { code }); // both tapping must not skip a round
    const hostRole2 = (await waitFor(host.log, "your_role", 2)).data;
    const guestRole2 = (await waitFor(guest.log, "your_role", 2)).data;
    expect(hostRole2.role).toBe("drawer");
    expect(guestRole2.role).toBe("describer");
    expect(guestRole2.round).toBe(2);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(host.log.filter((entry) => entry.event === "game_started")).toHaveLength(2);

    host.socket.disconnect();
    guest.socket.disconnect();
  }, 20_000);

  it("finishes the round on the server even if nobody presses anything", async () => {
    const { host, guest } = await startedRoom();
    // Nobody sends description_done or a drawing: server timers must carry the round to a result.
    await waitFor(guest.log, "start_drawing", 1, 5000);
    await waitFor(guest.log, "drawing_time_up", 1, 5000);
    const result = (await waitFor(host.log, "show_result", 1, 6000)).data;
    expect(result.imageData).toBe("");
    expect(result.aiScore).toBe(1);
    expect(String(result.aiComment).length).toBeGreaterThan(5);
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 20_000);

  it("rejects bad codes and your own room with a clear message", async () => {
    const a = client();
    a.socket.emit("join_room", { code: "ZZZZZ9", locale: "tr" });
    expect((await waitFor(a.log, "join_error")).data.message).toMatch(/bulunamadı/);
    a.socket.emit("create_room", { locale: "en" });
    const code = (await waitFor(a.log, "room_created")).data.code;
    a.socket.emit("join_room", { code, locale: "en" });
    expect((await waitFor(a.log, "join_error", 2)).data.message).toMatch(/own room/);
    a.socket.disconnect();
  }, 10_000);

  it("tells the partner when someone leaves", async () => {
    const { host, guest, code } = await startedRoom();
    guest.socket.emit("cancel_room", { code });
    await waitFor(host.log, "partner_disconnected");
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 10_000);

  it("drops a partner whose phone stopped polling, after the grace period", async () => {
    const { host, guest } = await startedRoom();
    guest.socket.setActive(false); // app went to background and never came back
    await waitFor(host.log, "partner_disconnected", 1, 6000);
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 12_000);

  it("applies a retried action only once and answers CORS preflight", async () => {
    const preflight = await fetch(`${baseUrl}/api/actions`, { method: "OPTIONS", headers: { origin: "capacitor://localhost" } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");

    const session = await (await fetch(`${baseUrl}/api/session`, { method: "POST" })).json() as { sessionId: string; token: string };
    const headers = { authorization: `Bearer ${session.token}`, "x-session-id": session.sessionId, "content-type": "application/json" };
    const body = JSON.stringify({ actions: [{ id: "same", event: "create_room", data: {} }], after: 0 });
    const first = await (await fetch(`${baseUrl}/api/actions`, { method: "POST", headers, body })).json() as { events: Logged[] };
    const second = await (await fetch(`${baseUrl}/api/actions`, { method: "POST", headers, body })).json() as { events: Logged[] };
    expect(first.events.filter((entry) => entry.event === "room_created")).toHaveLength(1);
    expect(second.events.filter((entry) => entry.event === "room_created")).toHaveLength(1); // same event, not a 2nd room

    const bad = await fetch(`${baseUrl}/api/events?after=0`, { headers: { ...headers, authorization: "Bearer wrong" } });
    expect(bad.status).toBe(401);
  }, 10_000);
});

describe("hints, tokens and guesses (classic)", () => {
  it("blocks hints that contain the word, sells ready hints, and scores the drawer's guess", async () => {
    const { host, guest, code } = await startedRoom();
    const role = (await waitFor(host.log, "your_role")).data;
    const word: string = role.word;
    expect(role.hintOptions.map((option: { id: string }) => option.id)).toEqual(expect.arrayContaining(["letters", "first"]));
    expect(JSON.stringify(role.hintOptions)).not.toContain(word); // only labels, never the answer

    // 1) the word inside a hint is refused and never reaches the drawer
    host.socket.emit("send_hint", { code, text: `bu bir ${word.toLowerCase()}`, id: "bad" });
    const rejected = (await waitFor(host.log, "hint_rejected")).data;
    expect(rejected.id).toBe("bad");
    host.socket.emit("send_hint", { code, text: "qqq zzz", id: "ok" });
    await waitFor(guest.log, "hint_received");
    expect(guest.log.filter((entry) => entry.event === "hint_received").map((entry) => entry.data.id)).toEqual(["ok"]);

    // 2) a ready hint goes to the drawer once
    host.socket.emit("use_hint_option", { code, optionId: "first" });
    host.socket.emit("use_hint_option", { code, optionId: "first" });
    const used = (await waitFor(host.log, "hint_option_used")).data;
    expect(used.options.find((option: { id: string }) => option.id === "first").used).toBe(true);
    const firstLetter = (await waitFor(guest.log, "hint_received", 2)).data.text as string;
    expect(firstLetter.endsWith(word.replace(/[^A-Za-z\u00C0-\u024F]/g, "")[0].toLocaleUpperCase("tr"))).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(guest.log.filter((entry) => entry.event === "hint_received")).toHaveLength(2);

    // 3) drawing starts with 4 options containing the word; the guess is live for the describer
    host.socket.emit("description_done", { code });
    const drawing = (await waitFor(guest.log, "start_drawing")).data;
    expect(drawing.options).toHaveLength(4);
    expect(drawing.options).toContain(word);
    guest.socket.emit("submit_guess", { code, guess: "not-an-option" });
    guest.socket.emit("submit_guess", { code, guess: word });
    expect((await waitFor(host.log, "partner_guess")).data.guess).toBe(word);

    // the drawing is relayed live to the describer (and only to the describer)
    guest.socket.emit("live_stroke", { t: "s", s: "a1", c: "#FFFFFF", w: 0.01, a: 0.75, p: [[0.1, 0.1], [0.5, 0.5]] });
    guest.socket.emit("live_stroke", { t: "u" });
    host.socket.emit("live_stroke", { t: "x" }); // describer can't draw
    const live = (await waitFor(host.log, "live_stroke")).data;
    expect(live).toMatchObject({ t: "s", s: "a1", p: [[0.1, 0.1], [0.5, 0.5]] });
    expect((await waitFor(host.log, "live_stroke", 2)).data).toEqual({ t: "u" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(host.log.filter((entry) => entry.event === "live_stroke")).toHaveLength(2);
    expect(guest.log.filter((entry) => entry.event === "live_stroke")).toHaveLength(0);

    // hints still flow while the partner draws
    host.socket.emit("send_hint", { code, text: "qqq yine", id: "during" });
    expect((await waitFor(guest.log, "hint_received", 3)).data.id).toBe("during");

    guest.socket.emit("submit_drawing", { code, imageData: TINY_JPEG, score: 40, comment: "x" });
    const result = (await waitFor(host.log, "show_result")).data;
    expect(result.playerGuess).toBe(word);
    expect(result.guessCorrect).toBe(true);
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 20_000);

  it("marks a wrong guess as wrong", async () => {
    const { host, guest, code } = await startedRoom();
    const word = (await waitFor(host.log, "your_role")).data.word;
    host.socket.emit("description_done", { code });
    const drawing = (await waitFor(guest.log, "start_drawing")).data;
    const wrong = drawing.options.find((option: string) => option !== word);
    guest.socket.emit("submit_drawing", { code, imageData: TINY_JPEG, score: 40, comment: "x", guess: wrong });
    const result = (await waitFor(guest.log, "show_result")).data;
    expect(result.playerGuess).toBe(wrong);
    expect(result.guessCorrect).toBe(false);
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 20_000);
});

describe("Ortak Tuval (co-draw) mode", () => {
  async function coRoom() {
    const host = client();
    const guest = client();
    host.socket.emit("create_room", { username: "Yusuf", mode: "co-draw", category: "daily", locale: "tr" });
    const created = await waitFor(host.log, "room_created");
    expect(created.data.mode).toBe("co-draw");
    // The guest picked "classic" on their phone, but must follow the room's mode.
    guest.socket.emit("join_room", { code: created.data.code, username: "Elif", mode: "classic", locale: "tr" });
    expect((await waitFor(guest.log, "room_joined")).data.mode).toBe("co-draw");
    return { host, guest };
  }

  it("shares the word, relays live strokes and reactions, ends when both are done", async () => {
    const { host, guest } = await coRoom();
    const hostRole = (await waitFor(host.log, "your_role")).data;
    const guestRole = (await waitFor(guest.log, "your_role")).data;
    expect(hostRole.mode).toBe("co-draw");
    expect(hostRole.role).toBe("artist");
    expect(guestRole.word).toBe(hostRole.word); // both know the word
    expect(hostRole.seat).toBe(0);
    expect(guestRole.seat).toBe(1);
    expect(guestRole.partnerName).toBe("Yusuf");

    host.socket.emit("co_draw_stroke", { s: "a1", c: "#FF1A6C", w: 0.01, p: [[0.1, 0.1], [0.5, 2], ["x", 0]] });
    const stroke = (await waitFor(guest.log, "co_draw_stroke")).data;
    expect(stroke.p).toEqual([[0.1, 0.1], [0.5, 1]]); // clamped, junk point dropped
    expect(stroke.c).toBe("#FF1A6C");
    expect(host.log.some((entry) => entry.event === "co_draw_stroke")).toBe(false);

    guest.socket.emit("co_draw_react", { emoji: "😂", id: "r1" });
    guest.socket.emit("co_draw_react", { emoji: "<script>", id: "r2" });
    expect((await waitFor(host.log, "co_draw_react")).data.emoji).toBe("😂");

    host.socket.emit("co_draw_ready", {});
    await waitFor(guest.log, "co_draw_partner_ready");
    guest.socket.emit("co_draw_ready", {});
    await waitFor(host.log, "co_draw_time_up", 1, 1500); // before the 2s timer: both said done

    guest.socket.emit("co_draw_submit", { imageData: TINY_JPEG, score: 55, comment: "Uyumlu kaos" });
    host.socket.emit("co_draw_submit", { imageData: TINY_JPEG, score: 99, comment: "ikinci" });
    const result = (await waitFor(host.log, "show_result")).data;
    expect(result.mode).toBe("co-draw");
    expect(result.word).toBe(hostRole.word);
    expect(result.aiScore).toBe(55); // first upload wins, the second is ignored
    expect((await waitFor(guest.log, "show_result")).data.aiScore).toBe(55);

    host.socket.emit("play_again", {});
    const round2 = (await waitFor(guest.log, "your_role", 2)).data;
    expect(round2.mode).toBe("co-draw");
    expect(round2.round).toBe(2);
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 20_000);

  it("ends on the server timer and still shows a result if nobody uploads", async () => {
    const { host, guest } = await coRoom();
    await waitFor(host.log, "co_draw_time_up", 1, 4000);
    const result = (await waitFor(guest.log, "show_result", 1, 6000)).data;
    expect(result.mode).toBe("co-draw");
    expect(result.imageData).toBe("");
    host.socket.disconnect();
    guest.socket.disconnect();
  }, 15_000);
});

describe("random match", () => {
  const player = (name: string, gender: "f" | "m") => ({ username: name, avatar: "😎", mode: "classic", category: "animals", locale: "tr", gender, adult: true });

  it("needs gender + 18+, never pairs same gender, pairs a woman with a man", async () => {
    const a = client(); const b = client(); const c = client();
    a.socket.emit("find_match", { ...player("A", "m"), adult: false });
    expect((await waitFor(a.log, "join_error")).data.message).toContain("18");

    a.socket.emit("find_match", player("A", "m"));
    await waitFor(a.log, "match_waiting");
    b.socket.emit("find_match", player("B", "m"));
    await waitFor(b.log, "match_waiting"); // two men: both keep waiting
    expect(a.log.some((entry) => entry.event === "room_created")).toBe(false);

    c.socket.emit("find_match", player("C", "f"));
    const created = await waitFor(a.log, "room_created"); // A waited longest → host
    expect(created.data).toMatchObject({ role: "host", random: true });
    expect((await waitFor(c.log, "room_joined")).data).toMatchObject({ role: "guest", random: true, code: created.data.code });
    expect((await waitFor(c.log, "player_joined")).data.partnerName).toBe("A");
    await waitFor(a.log, "your_role");
    expect(b.log.some((entry) => entry.event === "room_created" || entry.event === "room_joined")).toBe(false);

    // strangers can't swap contacts through hints
    const describer = (await waitFor(a.log, "your_role")).data.role === "describer" ? a : c;
    describer.socket.emit("send_hint", { text: "insta: yusuf_123", id: "h1" });
    describer.socket.emit("send_hint", { text: "0532 123 45 67", id: "h2" });
    expect((await waitFor(describer.log, "hint_rejected")).data.message).toContain("sosyal medya");
    await waitFor(describer.log, "hint_rejected", 2);

    // a random room can't be joined by code
    const d = client();
    d.socket.emit("join_room", { code: created.data.code, username: "D", avatar: "😎", locale: "tr" });
    await waitFor(d.log, "join_error");

    // report → game ends for both; they are never matched again
    c.socket.emit("report_partner", { reason: "rude" });
    await waitFor(c.log, "report_received");
    await waitFor(a.log, "partner_disconnected");
    b.socket.emit("cancel_match", {});
    await waitFor(b.log, "match_cancelled");
    a.socket.emit("find_match", player("A", "m"));
    await waitFor(a.log, "match_waiting", 2);
    c.socket.emit("find_match", player("C", "f"));
    await waitFor(c.log, "match_waiting");
    expect(a.log.filter((entry) => entry.event === "room_created")).toHaveLength(1);
    [a, b, c, d].forEach((item) => item.socket.disconnect());
  }, 15_000);
});

describe("invite links and replay strokes", () => {
  it("shows who invites, sends strokes with the result, serves assetlinks", async () => {
    const host = client(); const guest = client();
    host.socket.emit("create_room", { username: "Yusuf", avatar: "🔥", mode: "classic", category: "animals", locale: "tr" });
    const code = (await waitFor(host.log, "room_created")).data.code;
    expect(await (await fetch(`${baseUrl}/api/room/${code}`)).json()).toEqual({ open: true, mode: "classic", hostName: "Yusuf", hostAvatar: "🔥" });
    expect(await (await fetch(`${baseUrl}/api/room/ZZZZZZ`)).json()).toEqual({ open: false });
    const links = await (await fetch(`${baseUrl}/.well-known/assetlinks.json`)).json();
    expect(links[0].target.package_name).toBe("com.couplechaos.app");

    guest.socket.emit("join_room", { code, username: "Elif", avatar: "🦄", locale: "tr" });
    await waitFor(guest.log, "room_joined");
    expect(await (await fetch(`${baseUrl}/api/room/${code}`)).json()).toEqual({ open: false }); // full now
    const drawer = (await Promise.race([waitFor(host.log, "start_drawing", 1, 8000).then(() => host), waitFor(guest.log, "start_drawing", 1, 8000).then(() => guest)]));
    drawer.socket.emit("submit_drawing", {
      code, imageData: TINY_JPEG, score: 40, comment: "x", aspect: 0.6,
      strokes: [{ c: "#FF1A6C", w: 0.02, p: [[0.1, 0.2], [0.5, 0.55555], [9, -3]] }, { c: "javascript:", w: 99, p: [["a", 1]] }],
    });
    const result = (await waitFor(host.log, "show_result", 1, 8000)).data;
    expect(result.strokes).toEqual([{ c: "#FF1A6C", w: 0.02, p: [[0.1, 0.2], [0.5, 0.556], [1, 0]] }]);
    expect(result.strokeAspect).toBe(0.6);
    [host, guest].forEach((item) => item.socket.disconnect());
  }, 15_000);
});

describe("solo vs AI", () => {
  it("the AI gives hints, the player draws and guesses, rounds keep coming", async () => {
    const me = client();
    me.socket.emit("start_solo", { username: "Yusuf", avatar: "😎", category: "animals", locale: "tr" });
    expect((await waitFor(me.log, "room_joined")).data).toMatchObject({ role: "guest", solo: true });
    expect((await waitFor(me.log, "player_joined")).data).toMatchObject({ partnerName: "Yapay Zekâ", partnerAvatar: "🤖" });
    expect((await waitFor(me.log, "your_role")).data.role).toBe("drawer");
    const firstHint = (await waitFor(me.log, "hint_received")).data;
    expect(firstHint.text).toContain("Hayvanlar"); // offline bot starts with the category
    const options = (await waitFor(me.log, "start_drawing")).data.options as string[];
    expect(options).toHaveLength(4);
    me.socket.emit("submit_drawing", { imageData: TINY_JPEG, score: 50, comment: "x", guess: options[0] });
    const result = (await waitFor(me.log, "show_result")).data;
    expect(result.solo).toBe(true);
    expect(typeof result.guessCorrect).toBe("boolean");
    // Round 2: roles swap — the player gives hints, the AI draws live and guesses.
    me.socket.emit("play_again", {});
    const role2 = (await waitFor(me.log, "your_role", 2)).data;
    expect(role2.role).toBe("describer");
    expect(role2.word).toBeTruthy();
    me.socket.emit("send_hint", { text: "evde yaşar", id: "s1" });
    me.socket.emit("description_done", {});
    await waitFor(me.log, "watch_drawing");
    const guess = (await waitFor(me.log, "partner_guess")).data.guess;
    expect(typeof guess).toBe("string");
    expect((await waitFor(me.log, "live_stroke")).data).toEqual({ t: "x" });
    expect((await waitFor(me.log, "live_stroke", 2)).data).toMatchObject({ t: "s", a: 0.75 });
    const result2 = (await waitFor(me.log, "show_result", 2)).data;
    expect(result2.imageData).toMatch(/^data:image\/png;base64,iVBORw0KGgo/);
    expect(result2.playerGuess).toBe(guess);
    expect(result2.guessCorrect).toBe(guess === role2.word);

    // Round 3: back to the AI giving hints
    me.socket.emit("play_again", {});
    expect((await waitFor(me.log, "your_role", 3)).data.role).toBe("drawer");
    me.socket.disconnect();
  }, 20_000);
});

describe("daily challenge leaderboard", () => {
  it("ranks AI-judged daily results and never reveals the word", async () => {
    // Fake AI provider for this test only
    process.env.GROQ_API_KEY = "test";
    process.env.AI_PROVIDER = "groq";
    const realFetch = globalThis.fetch;
    let nextScore = 77;
    vi.stubGlobal("fetch", async (input: any, init?: any) => {
      const url = String(input?.url || input);
      if (!url.includes("groq.com")) return realFetch(input, init);
      const content = JSON.stringify({ score: nextScore, guess: "erimiş müfettiş", comment: "Jüri istifa etti 🎭" });
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    try {
      const host = client(); const guest = client();
      host.socket.emit("create_room", { username: "Ada", avatar: "🦊", mode: "classic", category: "daily_challenge", locale: "tr" });
      const code = (await waitFor(host.log, "room_created")).data.code;
      guest.socket.emit("join_room", { code, username: "Can", avatar: "🐺", locale: "tr" });
      await waitFor(guest.log, "start_drawing", 1, 8000);
      guest.socket.emit("submit_drawing", { code, imageData: TINY_JPEG, score: 5, comment: "x" });
      const result = (await waitFor(guest.log, "show_result", 1, 8000)).data;
      expect(result.aiScore).toBe(77);
      expect(result.dailyRank).toBe(1);

      nextScore = 90;
      const solo = client();
      solo.socket.emit("start_solo", { username: "Zeynep", avatar: "🌸", category: "daily_challenge", locale: "tr" });
      await waitFor(solo.log, "start_drawing", 1, 8000);
      solo.socket.emit("submit_drawing", { imageData: TINY_JPEG, score: 5, comment: "x" });
      expect((await waitFor(solo.log, "show_result", 1, 8000)).data.dailyRank).toBe(1);

      const board = await (await realFetch(`${baseUrl}/api/leaderboard`)).json();
      expect(board.entries.slice(0, 2)).toMatchObject([
        { rank: 1, names: "Zeynep", score: 90, solo: true },
        { rank: 2, names: "Ada & Can", avatars: "🦊🐺", score: 77, solo: false },
      ]);
      expect(JSON.stringify(board)).not.toContain(result.word);
      [host, guest, solo].forEach((item) => item.socket.disconnect());
    } finally {
      vi.stubGlobal("fetch", realFetch);
      delete process.env.GROQ_API_KEY;
      delete process.env.AI_PROVIDER;
    }
  }, 20_000);
});

describe("AI judge parsing", () => {
  it("accepts JSON with chatter around it and clamps the score", async () => {
    const { __test } = await import("../../../server/aiJudge");
    const parsed = __test.parseJudgeJson('Sure! {"score": 140, "guess": "uçan patates", "comment": "Bu bir uçak değil 🥔"} ok');
    expect(parsed).toMatchObject({ score: 100, guess: "uçan patates", comment: "Bu bir uçak değil 🥔", comments: { tr: "Bu bir uçak değil 🥔" }, source: "ai" });
    expect(__test.parseJudgeJson("no json")).toBeNull();
    expect(__test.buildPrompt("Kedi", "tr")).toContain("Turkish");
  });

  it("asks for, and reads, one comment per player language", async () => {
    const { __test } = await import("../../../server/aiJudge");
    const prompt = __test.buildPrompt("Kedi", "tr", "classic", ["tr", "en"]);
    expect(prompt).toContain("tr = Turkish");
    expect(prompt).toContain("en = English");
    expect(__test.buildPrompt("Cat", "en", "classic", ["en", "en"])).not.toContain("different app languages");
    const parsed = __test.parseJudgeJson(
      '{"score": 30, "guess": {"tr": "erimiş vergi müfettişi", "en": "a melted tax inspector"}, "comment": {"tr": "Jüri istifa etti 🎭", "en": "The jury resigned 🎭"}}',
      ["tr", "en"],
    );
    expect(parsed?.comments).toEqual({ tr: "Jüri istifa etti 🎭", en: "The jury resigned 🎭" });
    expect(parsed?.guesses.en).toBe("a melted tax inspector");
    expect(parsed?.comment).toBe("Jüri istifa etti 🎭");
  });
});
