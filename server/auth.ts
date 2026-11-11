/**
 * Verifies Apple / Google ID tokens (JWT signature, issuer, audience, expiry).
 * Nothing is stored: the server only confirms who the user is.
 *
 * Environment:
 *   GOOGLE_CLIENT_IDS  comma-separated OAuth client IDs that may appear as token audience
 *                      (the Web client ID used on Android, and the iOS client ID)
 *   APPLE_BUNDLE_IDS   comma-separated (default: com.couplechaos.app)
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type Provider = "apple" | "google";

export interface VerifiedUser {
  id: string;
  provider: Provider;
  email: string | null;
  name: string;
}

const list = (value: string | undefined, fallback: string[] = []) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback;

const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function keySet(url: string) {
  if (!jwks.has(url)) jwks.set(url, createRemoteJWKSet(new URL(url), { cooldownDuration: 30_000, cacheMaxAge: 6 * 3600_000 }));
  return jwks.get(url)!;
}

function config(provider: Provider) {
  if (provider === "google") {
    return {
      audience: list(process.env.GOOGLE_CLIENT_IDS),
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      jwksUrl: process.env.GOOGLE_JWKS_URL || "https://www.googleapis.com/oauth2/v3/certs",
    };
  }
  return {
    audience: list(process.env.APPLE_BUNDLE_IDS, ["com.couplechaos.app"]),
    issuer: ["https://appleid.apple.com"],
    jwksUrl: process.env.APPLE_JWKS_URL || "https://appleid.apple.com/auth/keys",
  };
}

export function isProviderConfigured(provider: Provider): boolean {
  return config(provider).audience.length > 0;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function verifyIdToken(provider: Provider, idToken: string, suppliedName = ""): Promise<VerifiedUser> {
  const settings = config(provider);
  if (!settings.audience.length) throw new AuthError(503, "AUTH_NOT_CONFIGURED");
  if (!idToken || idToken.length > 8192) throw new AuthError(400, "BAD_TOKEN");
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(idToken, keySet(settings.jwksUrl), {
      issuer: settings.issuer,
      audience: settings.audience,
      clockTolerance: 60,
    }));
  } catch {
    throw new AuthError(401, "INVALID_TOKEN");
  }
  if (!payload.sub) throw new AuthError(401, "INVALID_TOKEN");
  const email = typeof payload.email === "string" ? payload.email : null;
  const tokenName = typeof payload.name === "string" ? payload.name : typeof payload.given_name === "string" ? payload.given_name : "";
  // Apple puts no name in the token; it only gives it to the app on first sign-in.
  const name = (tokenName || suppliedName || "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 40);
  return { id: `${provider}:${payload.sub}`, provider, email, name };
}
