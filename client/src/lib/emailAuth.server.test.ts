import { describe, expect, it } from "vitest";
import { createEmailAuth, emailUserId, normalizeEmail } from "../../../server/emailAuth";

function setup() {
  const sent: { to: string; text: string }[] = [];
  let time = 1_000_000;
  const auth = createEmailAuth({ sender: async (to, _s, text) => { sent.push({ to, text }); }, now: () => time, production: true });
  const code = () => sent[sent.length - 1].text.match(/\d{6}/)![0];
  return { auth, sent, code, tick: (ms: number) => { time += ms; } };
}

describe("email sign-in", () => {
  it("normalizes addresses and rejects junk", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });

  it("signs in with the emailed code, once", async () => {
    const { auth, sent, code } = setup();
    await auth.start("Ada@example.com", "tr");
    expect(sent[0].to).toBe("ada@example.com");
    const user = auth.verify("ada@example.com", code());
    expect(user).toMatchObject({ provider: "email", email: "ada@example.com", id: emailUserId("ada@example.com") });
    expect(() => auth.verify("ada@example.com", code())).toThrow("CODE_EXPIRED");
  });

  it("gives the same account id for the same address", () => {
    expect(emailUserId("a@b.co")).toBe(emailUserId("a@b.co"));
    expect(emailUserId("a@b.co")).not.toBe(emailUserId("c@b.co"));
  });

  it("locks the code after 5 wrong tries", async () => {
    const { auth, code } = setup();
    await auth.start("a@b.co", "en");
    const right = code();
    const wrong = right === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) expect(() => auth.verify("a@b.co", wrong)).toThrow("WRONG_CODE");
    expect(() => auth.verify("a@b.co", wrong)).toThrow("CODE_EXPIRED");
    expect(() => auth.verify("a@b.co", right)).toThrow("CODE_EXPIRED");
  });

  it("expires codes after 10 minutes and limits resends", async () => {
    const { auth, code, tick } = setup();
    await auth.start("a@b.co", "en");
    await expect(auth.start("a@b.co", "en")).rejects.toThrow("WAIT_BEFORE_RESEND");
    const first = code();
    tick(10 * 60_000 + 1);
    expect(() => auth.verify("a@b.co", first)).toThrow("CODE_EXPIRED");
  });

  it("refuses in production without a mail provider", async () => {
    const auth = createEmailAuth({ sender: null, production: true });
    await expect(auth.start("a@b.co", "en")).rejects.toThrow("EMAIL_NOT_CONFIGURED");
  });

  it("caps codes per address even after a lockout", async () => {
    const { auth, tick } = setup();
    for (let i = 0; i < 5; i++) {
      await auth.start("a@b.co", "en");
      for (let j = 0; j < 5; j++) { try { auth.verify("a@b.co", "999999"); } catch { /* wrong */ } }
      tick(46_000);
    }
    await expect(auth.start("a@b.co", "en")).rejects.toThrow("WAIT_BEFORE_RESEND");
    tick(60 * 60_000);
    await expect(auth.start("a@b.co", "en")).resolves.toBeUndefined();
  });

  it("caps emails per hour overall", async () => {
    const auth = createEmailAuth({ sender: async () => {}, now: () => 5_000_000, production: true, globalHourlyCap: 3 });
    for (let i = 0; i < 3; i++) await auth.start(`u${i}@b.co`, "en");
    await expect(auth.start("u9@b.co", "en")).rejects.toThrow("BUSY");
  });

  it("lets the store reviewer in with a fixed code", async () => {
    process.env.REVIEW_EMAIL = "review@couplechaos.app"; process.env.REVIEW_CODE = "246810";
    const sent: string[] = [];
    const auth = createEmailAuth({ sender: async (to) => { sent.push(to); }, production: true });
    await auth.start("Review@CoupleChaos.app", "en");
    expect(sent).toHaveLength(0);
    expect(() => auth.verify("review@couplechaos.app", "000000")).toThrow("WRONG_CODE");
    expect(auth.verify("review@couplechaos.app", "246810").provider).toBe("email");
    delete process.env.REVIEW_EMAIL; delete process.env.REVIEW_CODE;
  });
});
