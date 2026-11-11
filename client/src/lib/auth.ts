/**
 * Sign in with Apple / Google.
 *
 * Flow: native sign-in sheet (plugin) → ID token → our game server verifies the
 * token signature with Apple/Google → we store the verified account locally.
 *
 * Which buttons appear:
 *   iOS     → Apple (always) + Google (when VITE_GOOGLE_IOS_CLIENT_ID is set)
 *   Android → Google (when VITE_GOOGLE_WEB_CLIENT_ID is set)
 *   Web     → none (guest play only)
 * A provider that isn't configured is simply not shown, so there is never a dead button.
 */
import { Capacitor } from "@capacitor/core";
import { getServerBaseUrl } from "./socket";
import { getProfile, saveProfile } from "./gameData";

export type AuthProvider = "apple" | "google";

export interface Account {
  id: string;
  provider: AuthProvider;
  name: string;
  email: string | null;
  signedInAt: string;
}

const ACCOUNT_KEY = "cc_account";
const GOOGLE_WEB_CLIENT_ID = (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined)?.trim() || "";
const GOOGLE_IOS_CLIENT_ID = (import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined)?.trim() || "";

export class AuthCancelled extends Error {}

function platform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
}

export function getAvailableProviders(): AuthProvider[] {
  const current = platform();
  if (current === "ios") return GOOGLE_IOS_CLIENT_ID ? ["apple", "google"] : ["apple"];
  if (current === "android") return GOOGLE_WEB_CLIENT_ID ? ["google"] : [];
  // Web (Safari/Chrome, "Add to Home Screen"): Google's own Identity Services button.
  return GOOGLE_WEB_CLIENT_ID ? ["google"] : [];
}

export function isWebPlatform(): boolean {
  return platform() === "web";
}

// ── Web: Google Identity Services ("Sign in with Google" button) ──
interface GoogleIdApi {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: string; auto_select?: boolean; itp_support?: boolean }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}

let gisLoading: Promise<GoogleIdApi> | null = null;
function loadGoogleIdentity(): Promise<GoogleIdApi> {
  const existing = (window as { google?: { accounts?: { id?: GoogleIdApi } } }).google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        const api = (window as { google?: { accounts?: { id?: GoogleIdApi } } }).google?.accounts?.id;
        if (api) resolve(api);
        else reject(new Error("GIS_UNAVAILABLE"));
      };
      script.onerror = () => {
        gisLoading = null;
        reject(new Error("GIS_LOAD_FAILED"));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
}

/** Renders Google's official button into `element`; calls back with the verified account. */
export async function renderGoogleWebButton(
  element: HTMLElement,
  onResult: (result: { account?: Account; error?: unknown }) => void,
  locale = "tr",
): Promise<void> {
  const api = await loadGoogleIdentity();
  api.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    itp_support: true,
    callback: (response) => {
      if (!response.credential) {
        onResult({ error: new AuthCancelled("cancelled") });
        return;
      }
      completeSignIn("google", response.credential, "").then(
        (account) => onResult({ account }),
        (error) => onResult({ error }),
      );
    },
  });
  element.innerHTML = "";
  api.renderButton(element, {
    type: "standard",
    theme: "filled_black",
    size: "large",
    shape: "pill",
    text: "continue_with",
    logo_alignment: "center",
    width: Math.min(360, Math.max(220, Math.round(element.getBoundingClientRect().width) || 320)),
    locale,
  });
}

export function getAccount(): Account | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null") as Account | null;
    return parsed && typeof parsed.id === "string" && (parsed.provider === "apple" || parsed.provider === "google") ? parsed : null;
  } catch {
    return null;
  }
}

let initialized: Promise<typeof import("@capgo/capacitor-social-login").SocialLogin> | null = null;

function plugin() {
  if (!initialized) {
    initialized = (async () => {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      const isIos = platform() === "ios";
      await SocialLogin.initialize({
        ...(isIos ? { apple: { clientId: "com.couplechaos.app" } } : {}),
        ...(GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID
          ? {
              google: {
                webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
                iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined,
                iOSServerClientId: GOOGLE_WEB_CLIENT_ID || undefined,
                mode: "online" as const,
                // We only need the ID token; avoids a known hang on stock BridgeActivity.
                skipAuthOnlyAuthorizationAfterSignIn: true,
              },
            }
          : {}),
      });
      return SocialLogin;
    })().catch((error) => {
      initialized = null;
      throw error;
    });
  }
  return initialized;
}

function looksCancelled(error: unknown): boolean {
  const text = String((error as { message?: string })?.message || error).toLowerCase();
  return /cancel|1001|12501|16:|user closed|dismiss/.test(text);
}

export async function signIn(provider: AuthProvider): Promise<Account> {
  if (isWebPlatform()) throw new Error("USE_WEB_BUTTON");
  const SocialLogin = await plugin();
  let idToken = "";
  let displayName = "";
  try {
    if (provider === "apple") {
      const response = await SocialLogin.login({ provider: "apple", options: { scopes: ["name", "email"] } });
      const result = response.result as { idToken: string | null; profile?: { givenName: string | null; familyName: string | null } };
      idToken = result.idToken || "";
      displayName = [result.profile?.givenName, result.profile?.familyName].filter(Boolean).join(" ");
    } else {
      const response = await SocialLogin.login({ provider: "google", options: {} });
      const result = response.result as { idToken?: string | null; profile?: { name: string | null; givenName: string | null } };
      idToken = result.idToken || "";
      displayName = result.profile?.givenName || result.profile?.name || "";
    }
  } catch (error) {
    if (looksCancelled(error)) throw new AuthCancelled("cancelled");
    throw error;
  }
  if (!idToken) throw new Error("NO_ID_TOKEN");
  return completeSignIn(provider, idToken, displayName);
}

async function completeSignIn(provider: AuthProvider, idToken: string, displayName: string): Promise<Account> {
  const base = getServerBaseUrl() || (isWebPlatform() ? window.location.origin : "");
  if (!base) throw new Error("NO_SERVER");
  const response = await fetch(`${base}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, idToken, name: displayName }),
  });
  if (!response.ok) throw new Error(`VERIFY_${response.status}`);
  const payload = await response.json() as { user?: { id: string; name?: string; email?: string | null } };
  if (!payload.user?.id) throw new Error("VERIFY_FAILED");

  const account: Account = {
    id: payload.user.id,
    provider,
    name: payload.user.name || displayName || "",
    email: payload.user.email || null,
    signedInAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    localStorage.setItem("cc_logged_in", provider);
  } catch {
    /* Signed in for this session only. */
  }
  // Pre-fill the in-game name the first time.
  const profile = getProfile();
  if (!profile.username.trim() && account.name) saveProfile({ ...profile, username: account.name.split(" ")[0].slice(0, 20) });
  return account;
}

export async function signOut(): Promise<void> {
  const account = getAccount();
  try {
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.setItem("cc_logged_in", "guest");
  } catch {
    /* ignore */
  }
  if (account && isWebPlatform()) {
    (window as { google?: { accounts?: { id?: GoogleIdApi } } }).google?.accounts?.id?.disableAutoSelect();
  }
  if (account && platform() !== "web") {
    try {
      const SocialLogin = await plugin();
      await SocialLogin.logout({ provider: account.provider });
    } catch {
      /* Local sign-out already happened. */
    }
  }
}

/**
 * Deletes the account and every piece of data the app keeps.
 * The server stores no account data, so everything lives on this device.
 */
export async function deleteAccountAndData(): Promise<void> {
  const account = getAccount();
  if (account && platform() !== "web") {
    try {
      const SocialLogin = await plugin();
      await SocialLogin.logout({ provider: account.provider, ...(account.provider === "apple" ? { clearCachedUserInfo: true } : {}) } as never);
    } catch {
      /* continue wiping local data */
    }
  }
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith("cc_") || key.startsWith("couple_chaos"))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
