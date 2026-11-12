/**
 * Invite links: https://<server>/join/ABC123
 * - On the web the link opens the game and joins the room after one tap.
 * - On Android (App Links) the same link opens the installed app.
 */
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export const INVITE_EVENT = "cc-invite";

/** Room code from /join/CODE or ?join=CODE (null if none). */
export function codeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url, "https://x.invalid");
    const fromPath = /\/join\/([A-Za-z0-9]{6})\/?$/.exec(parsed.pathname)?.[1];
    const code = (fromPath || parsed.searchParams.get("join") || "").toUpperCase();
    return CODE.test(code) ? code : null;
  } catch {
    return null;
  }
}

let pending: string | null = typeof window !== "undefined" ? codeFromUrl(window.location.href) : null;

/** Public link for a room (always the hosted web address, also from the app). */
export function inviteUrl(code: string, serverUrl = ""): string {
  const base = serverUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/join/${code}`;
}

export function peekPendingInvite(): string | null {
  return pending;
}

/** Hands the code over once and cleans the address bar. */
export function takePendingInvite(): string | null {
  const code = pending;
  pending = null;
  if (code && typeof window !== "undefined" && codeFromUrl(window.location.href)) {
    window.history.replaceState(window.history.state, "", "/");
  }
  return code;
}

function announce(code: string) {
  pending = code;
  window.dispatchEvent(new CustomEvent(INVITE_EVENT, { detail: code }));
}

/** Native app: links that launched or reopened the app. */
export async function initInviteLinks(): Promise<void> {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return;
  try {
    const { App } = await import("@capacitor/app");
    const launch = await App.getLaunchUrl();
    const code = launch?.url ? codeFromUrl(launch.url) : null;
    if (code) announce(code);
    await App.addListener("appUrlOpen", (event) => {
      const next = codeFromUrl(event.url);
      if (next) announce(next);
    });
  } catch {
    // Plugin missing in an old build: links still open the web version.
  }
}
