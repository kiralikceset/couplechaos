import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

let jwksServer: ReturnType<typeof createServer>;
let privateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey as CryptoKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  jwksServer = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => jwksServer.listen(0, "127.0.0.1", () => resolve()));
  const address = jwksServer.address() as { port: number };
  process.env.GOOGLE_JWKS_URL = `http://127.0.0.1:${address.port}/google`;
  process.env.APPLE_JWKS_URL = `http://127.0.0.1:${address.port}/apple`;
  process.env.GOOGLE_CLIENT_IDS = "web-client.apps.googleusercontent.com,ios-client.apps.googleusercontent.com";
  delete process.env.APPLE_BUNDLE_IDS;
});

afterAll(() => new Promise<void>((resolve) => jwksServer.close(() => resolve())));

function token(claims: Record<string, unknown>, issuer: string, audience: string, key = privateKey) {
  return new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(issuer).setAudience(audience)
    .setSubject("user-123").setIssuedAt().setExpirationTime("10m").sign(key);
}

describe("ID token verification", () => {
  it("accepts a valid Google token and reads name and email", async () => {
    const { verifyIdToken } = await import("../../../server/auth");
    const idToken = await token({ email: "a@b.com", name: "Yusuf B" }, "https://accounts.google.com", "web-client.apps.googleusercontent.com");
    expect(await verifyIdToken("google", idToken)).toEqual({ id: "google:user-123", provider: "google", email: "a@b.com", name: "Yusuf B" });
  });

  it("accepts Apple tokens for the app bundle and uses the name the app supplied", async () => {
    const { verifyIdToken } = await import("../../../server/auth");
    const idToken = await token({ email: "x@privaterelay.appleid.com" }, "https://appleid.apple.com", "com.couplechaos.app");
    const user = await verifyIdToken("apple", idToken, "Elif");
    expect(user.id).toBe("apple:user-123");
    expect(user.name).toBe("Elif");
  });

  it("rejects wrong audience, wrong issuer and forged signatures", async () => {
    const { verifyIdToken } = await import("../../../server/auth");
    const otherApp = await token({}, "https://accounts.google.com", "someone-else");
    await expect(verifyIdToken("google", otherApp)).rejects.toMatchObject({ status: 401 });
    const wrongIssuer = await token({}, "https://evil.example", "com.couplechaos.app");
    await expect(verifyIdToken("apple", wrongIssuer)).rejects.toMatchObject({ status: 401 });
    const forger = await generateKeyPair("RS256");
    const forged = await token({}, "https://appleid.apple.com", "com.couplechaos.app", forger.privateKey as CryptoKey);
    await expect(verifyIdToken("apple", forged)).rejects.toMatchObject({ status: 401 });
  });

  it("reports 503 when Google is not configured on the server", async () => {
    const saved = process.env.GOOGLE_CLIENT_IDS;
    delete process.env.GOOGLE_CLIENT_IDS;
    const { verifyIdToken } = await import("../../../server/auth");
    await expect(verifyIdToken("google", "x.y.z")).rejects.toMatchObject({ status: 503 });
    process.env.GOOGLE_CLIENT_IDS = saved;
  });
});
