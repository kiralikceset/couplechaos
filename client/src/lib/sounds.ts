/**
 * Sound Effects System - Enhanced Professional Version
 * Uses Web Audio API with richer, more satisfying synthesized sounds
 * Designed for game feel: punchy, fun, satisfying, not annoying
 * Each sound has character and personality matching the Electric Pulse theme
 */

const SOUND_ENABLED_KEY = "couple_chaos_sound";
let audioCtx: AudioContext | null = null;
let soundEnabled = true;
try {
  soundEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
} catch {
  // Some WebViews can temporarily deny storage access; sound still works.
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
  } catch {
    // Keep the in-memory preference when persistent storage is unavailable.
  }
  return soundEnabled;
}

// ═══════════════════════════════════════════
// HELPER: Create richer sounds with harmonics
// ═══════════════════════════════════════════

function createNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine"
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.type = type;
  osc.start(startTime);
  osc.stop(startTime + duration);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

const noiseBuffers = new Map<number, AudioBuffer>();

function createNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  volume: number
): void {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  let buffer = noiseBuffers.get(bufferSize);
  if (!buffer) {
    buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(bufferSize, buffer);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(3000, startTime);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  source.start(startTime);
  source.stop(startTime + duration);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

// ═══════════════════════════════════════════
// SOUND EFFECTS
// ═══════════════════════════════════════════

/** Tap/Click - Punchy pop with sub-bass */
export function playTap(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Main pop
    createNote(ctx, 880, t, 0.08, 0.12, "sine");
    // Sub-bass thud
    createNote(ctx, 150, t, 0.06, 0.08, "sine");
    // Click transient
    createNoise(ctx, t, 0.02, 0.04);
  } catch {}
}

/** Send message - Swoosh with rising pitch */
export function playSend(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.type = "sine";
    osc.start(t);
    osc.stop(t + 0.15);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    // Sparkle
    createNote(ctx, 2400, t + 0.08, 0.06, 0.04, "sine");
  } catch {}
}

/** Word Reveal - Dramatic slam with reverb feel */
export function playWordReveal(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Impact
    createNote(ctx, 120, t, 0.3, 0.15, "sine");
    // Shimmer
    createNote(ctx, 1200, t + 0.02, 0.2, 0.06, "sine");
    createNote(ctx, 1800, t + 0.04, 0.15, 0.04, "sine");
    // Noise burst
    createNoise(ctx, t, 0.04, 0.08);
  } catch {}
}

/** Countdown Tick - Sharp, urgent */
export function playTick(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createNote(ctx, 1000, t, 0.04, 0.08, "square");
  } catch {}
}

/** Countdown Warning (last 5 seconds) - More urgent tick */
export function playTickUrgent(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createNote(ctx, 1400, t, 0.05, 0.12, "square");
    createNote(ctx, 700, t + 0.05, 0.04, 0.06, "square");
  } catch {}
}

/** Success - Triumphant ascending arpeggio */
export function playSuccess(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      createNote(ctx, freq, t + i * 0.08, 0.3 - i * 0.05, 0.1, "sine");
      // Harmonic
      createNote(ctx, freq * 2, t + i * 0.08, 0.2, 0.03, "sine");
    });
  } catch {}
}

/** Partner Joined - Happy welcoming chime */
export function playPartnerJoined(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const notes = [659, 784, 988, 1319]; // E5, G5, B5, E6
    notes.forEach((freq, i) => {
      createNote(ctx, freq, t + i * 0.1, 0.35, 0.08, "sine");
    });
    // Sparkle
    createNote(ctx, 2637, t + 0.4, 0.2, 0.04, "sine");
  } catch {}
}

/** Drawing Stroke - Subtle pen scratch */
export function playStroke(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createNoise(ctx, t, 0.015, 0.015);
  } catch {}
}

/** Copy Code - Quick confirmation */
export function playCopy(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createNote(ctx, 1047, t, 0.06, 0.1, "sine");
    createNote(ctx, 1319, t + 0.06, 0.08, 0.08, "sine");
  } catch {}
}

/** Error - Low descending buzz */
export function playError(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.type = "sawtooth";
    osc.start(t);
    osc.stop(t + 0.25);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {}
}

/** Confetti/Celebration - Sparkle cascade */
export function playConfetti(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const freq = 1500 + Math.random() * 2000;
      createNote(ctx, freq, t + i * 0.04, 0.12, 0.04, "sine");
    }
    // Bass drop
    createNote(ctx, 80, t, 0.4, 0.08, "sine");
  } catch {}
}

/** Surprise message popup - Quirky boing */
export function playSurprise(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.18);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.type = "sine";
    osc.start(t);
    osc.stop(t + 0.22);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {}
}

/** Achievement Unlocked - Majestic fanfare */
export function playAchievement(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Fanfare
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      createNote(ctx, freq, t + i * 0.12, 0.5 - i * 0.08, 0.08, "sine");
      createNote(ctx, freq * 1.5, t + i * 0.12, 0.3, 0.03, "triangle");
    });
    // Shimmer
    for (let i = 0; i < 5; i++) {
      createNote(
        ctx,
        2000 + Math.random() * 2000,
        t + 0.5 + i * 0.05,
        0.15,
        0.03,
        "sine"
      );
    }
  } catch {}
}

/** Streak Fire - Intense rising power */
export function playStreakFire(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Rising whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.type = "sawtooth";
    osc.start(t);
    osc.stop(t + 0.35);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    // Crackle
    createNoise(ctx, t + 0.1, 0.2, 0.04);
  } catch {}
}

/** Slide transition - Smooth whoosh */
export function playSlide(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.type = "sine";
    osc.start(t);
    osc.stop(t + 0.15);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  } catch {}
}

/** Premium unlock - Magical reveal */
export function playPremiumUnlock(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Magic shimmer
    const notes = [880, 1108, 1320, 1760, 2217];
    notes.forEach((freq, i) => {
      createNote(ctx, freq, t + i * 0.06, 0.4 - i * 0.06, 0.06, "sine");
    });
    // Sparkle dust
    for (let i = 0; i < 6; i++) {
      createNote(
        ctx,
        2500 + Math.random() * 1500,
        t + 0.3 + i * 0.04,
        0.1,
        0.03,
        "sine"
      );
    }
  } catch {}
}

/** Daily challenge notification */
export function playDailyChallenge(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createNote(ctx, 523, t, 0.15, 0.08, "sine");
    createNote(ctx, 784, t + 0.15, 0.15, 0.08, "sine");
    createNote(ctx, 1047, t + 0.3, 0.2, 0.1, "sine");
  } catch {}
}

// Passive pointer listener avoids a scroll-blocking touchstart handler.
// Key interaction still unlocks audio for keyboard users. Safe to clean up/re-init.
export function initAudio(): () => void {
  const cleanup = () => {
    document.removeEventListener("pointerdown", handler);
    document.removeEventListener("keydown", handler);
  };
  const handler = () => {
    if (soundEnabled) {
      try {
        getAudioContext();
      } catch {
        /* Audio is optional. */
      }
    }
    cleanup();
  };
  document.addEventListener("pointerdown", handler, {
    once: true,
    passive: true,
  });
  document.addEventListener("keydown", handler, { once: true });
  return cleanup;
}
