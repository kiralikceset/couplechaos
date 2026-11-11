import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function setup(enabled = true) {
  const nodes: any[] = [];
  const node = () => {
    const param = {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    const n = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: param,
      gain: param,
      onended: null as any,
    };
    nodes.push(n);
    return n;
  };
  const ctx = {
    state: "running",
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    createOscillator: node,
    createGain: node,
    createBufferSource: node,
    createBiquadFilter: node,
    createBuffer: vi.fn((_channels, length) => ({
      getChannelData: () => new Float32Array(length),
    })),
  };
  const constructor = vi.fn(function () {
    return ctx;
  });
  const doc = new EventTarget();
  vi.stubGlobal("localStorage", {
    getItem: () => (enabled ? "true" : "false"),
  });
  vi.stubGlobal("window", { AudioContext: constructor });
  vi.stubGlobal("document", doc);
  return { nodes, ctx, constructor, doc };
}

describe("audio lifecycle", () => {
  it("reuses tap noise and disconnects every finished audio node", async () => {
    const { ctx, nodes } = setup();
    const { playTap, playSlide } = await import("./sounds");
    playTap();
    playTap();
    playSlide();
    expect(ctx.createBuffer).toHaveBeenCalledTimes(1);
    nodes.filter(n => n.onended).forEach(n => n.onended());
    expect(nodes.every(n => n.disconnect.mock.calls.length === 1)).toBe(true);
  });
  it("does not initialize audio when sound is disabled", async () => {
    const { constructor, doc } = setup(false);
    const { initAudio } = await import("./sounds");
    const cleanup = initAudio();
    doc.dispatchEvent(new Event("pointerdown"));
    cleanup();
    expect(constructor).not.toHaveBeenCalled();
  });
  it("removes input listeners on cleanup and initializes once on a new mount", async () => {
    const { constructor, doc } = setup();
    const { initAudio } = await import("./sounds");
    initAudio()();
    doc.dispatchEvent(new Event("pointerdown"));
    expect(constructor).not.toHaveBeenCalled();
    const cleanup = initAudio();
    doc.dispatchEvent(new Event("pointerdown"));
    doc.dispatchEvent(new Event("keydown"));
    expect(constructor).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
