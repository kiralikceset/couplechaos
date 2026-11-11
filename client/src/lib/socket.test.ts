import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

beforeAll(() => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
  vi.stubGlobal("navigator", { language: "tr" });
  vi.stubGlobal("window", globalThis);
});

beforeEach(() => {
  storage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function createStartedRoom() {
  const { GameSocket } = await import("./socket");
  const socket = new GameSocket();
  const events: Array<{ event: string; data: any }> = [];
  ["room_created", "player_joined", "game_started", "your_role", "start_drawing", "generating_result", "show_result"].forEach((event) => {
    socket.on(event, (data) => events.push({ event, data }));
  });

  socket.emit("create_room", { mode: "classic", category: "daily", locale: "tr" });
  await vi.advanceTimersByTimeAsync(900);
  return { socket, events };
}

describe("single-device game transport", () => {
  it("completes a classic describe and draw round", async () => {
    const { socket, events } = await createStartedRoom();
    const room = events.find((entry) => entry.event === "room_created")?.data;
    const role = events.find((entry) => entry.event === "your_role")?.data;
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(role.role).toBe("describer");
    expect(role.word).toBeTruthy();

    socket.emit("description_done", { code: room.code });
    expect(events.some((entry) => entry.event === "start_drawing")).toBe(true);
    socket.emit("submit_drawing", { code: room.code, imageData: "data:image/png;base64,AA==", score: 71, comment: "Test" });
    await vi.advanceTimersByTimeAsync(700);
    expect(events.find((entry) => entry.event === "show_result")?.data.aiScore).toBe(71);
  });

  it("accepts a room code as a local join simulation", async () => {
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket();
    const events: Array<{ event: string; data: any }> = [];
    ["room_joined", "game_started", "your_role"].forEach((event) => {
      socket.on(event, (data) => events.push({ event, data }));
    });
    socket.emit("join_room", { code: "ABC234", mode: "classic", category: "funny" });
    await vi.advanceTimersByTimeAsync(900);
    expect(events.find((entry) => entry.event === "room_joined")?.data.code).toBe("ABC234");
    expect(events.find((entry) => entry.event === "game_started")?.data.mode).toBe("classic");
    expect(events.find((entry) => entry.event === "your_role")?.data.word).toBeTruthy();
  });
});

describe("online game transport", () => {
  it("delivers inline action events once even when an older poll arrives later", async () => {
    let finishPoll: (response: Response) => void = () => {};
    const event = { id: 1, event: "room_created", data: { code: "ABC234" } };
    vi.stubGlobal("fetch", vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/api/session")) return Promise.resolve(new Response(JSON.stringify({ sessionId: "s", token: "t", protocol: 2 })));
      if (url.endsWith("/api/actions")) return Promise.resolve(new Response(JSON.stringify({ accepted: true, events: [event], cursor: 1 })));
      return new Promise<Response>((resolve) => { finishPoll = resolve; });
    }));
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");
    const created = vi.fn();
    socket.on("room_created", created);
    socket.connect();
    await vi.advanceTimersByTimeAsync(1);
    socket.emit("create_room");
    await vi.advanceTimersByTimeAsync(1);
    expect(created).toHaveBeenCalledOnce();
    finishPoll(new Response(JSON.stringify({ events: [event], cursor: 1 })));
    await vi.advanceTimersByTimeAsync(1);
    expect(created).toHaveBeenCalledOnce();
    socket.disconnect();
  });

  it("aborts an unresponsive poll and recovers using the existing session", async () => {
    let stalled = true;
    let aborted = false;
    const fetchMock = vi.fn((input: string | URL, init?: RequestInit) => {
      if (String(input).endsWith("/api/session")) return Promise.resolve(new Response(JSON.stringify({ sessionId: "s", token: "t", protocol: 2 })));
      if (!stalled) return Promise.resolve(new Response(JSON.stringify({ events: [], cursor: 0, pollAfterMs: 2500 })));
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          stalled = false;
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");
    socket.connect();
    await vi.advanceTimersByTimeAsync(12010);
    expect(aborted).toBe(true);
    expect(socket.transport).toBe("offline");
    await vi.advanceTimersByTimeAsync(1210);
    expect(socket.transport).toBe("online");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/session"))).toHaveLength(1);
    socket.disconnect();
  });

  it("pauses polling in the background and resumes immediately", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => new Response(JSON.stringify(
      String(input).endsWith("/api/session") ? { sessionId: "s", token: "t", protocol: 2 } : { events: [], cursor: 0, pollAfterMs: 2500 }
    )));
    vi.stubGlobal("fetch", fetchMock);
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");
    socket.connect();
    await vi.advanceTimersByTimeAsync(10);
    socket.setActive(false);
    const count = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetchMock).toHaveBeenCalledTimes(count);
    socket.setActive(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMock).toHaveBeenCalledTimes(count + 1);
    socket.disconnect();
  });

  it("ignores a session response that arrives after disconnect", async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");
    const connected = vi.fn();
    socket.on("connect", connected);
    socket.connect();
    socket.disconnect();
    finish(new Response(JSON.stringify({ sessionId: "old", token: "old", protocol: 2 })));
    await vi.advanceTimersByTimeAsync(10);
    expect(socket.transport).toBe("offline");
    expect(connected).not.toHaveBeenCalled();
  });

  it("waits to contact the public server until the game connection is opened", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(socket.transport).toBe("offline");
    socket.disconnect();
  });

  it("does not create a fake room when the public server is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");
    const created = vi.fn();
    const failed = vi.fn();
    socket.on("room_created", created);
    socket.on("connect_error", failed);
    socket.emit("create_room", { mode: "classic", category: "daily" });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalled();
    expect(created).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledOnce();
    expect(socket.transport).toBe("offline");
    socket.disconnect();
  });

  it("answers a private word-selection event through the authenticated action queue", async () => {
    const actionBodies: Array<{ actions?: Array<{ event?: string; data?: Record<string, unknown> }> }> = [];
    let eventsServed = false;
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/session")) {
        return new Response(JSON.stringify({ sessionId: "s1", token: "t1", protocol: 2 }), { status: 201 });
      }
      if (url.includes("/api/events")) {
        if (!eventsServed) {
          eventsServed = true;
          return new Response(JSON.stringify({
            events: [{ id: 1, event: "select_word", data: { code: "ABC234", round: 1, category: "daily", locale: "tr" } }],
            cursor: 1,
            pollAfterMs: 1000,
          }));
        }
        return new Response(JSON.stringify({ events: [], cursor: 1, pollAfterMs: 1000 }));
      }
      if (url.endsWith("/api/actions")) {
        actionBodies.push(JSON.parse(String(init?.body || "{}")));
        return new Response(JSON.stringify({ accepted: true }));
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { GameSocket } = await import("./socket");
    const socket = new GameSocket("https://game.example");
    socket.connect();

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    const roundWord = actionBodies.flatMap((body) => body.actions || []).find((action) => action.event === "round_word");
    expect(roundWord?.data?.code).toBe("ABC234");
    expect(typeof roundWord?.data?.word).toBe("string");
    expect(String(roundWord?.data?.word).length).toBeGreaterThan(0);
    // Returning from profile/category must reuse the healthy connection.
    const callsBeforeReturn = fetchMock.mock.calls.length;
    socket.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.transport).toBe("online");
    expect(fetchMock.mock.calls.length).toBe(callsBeforeReturn);
    socket.disconnect();
  });
});
