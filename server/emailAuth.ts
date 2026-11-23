/**
 * Sign in with an email address and a 6-digit code (no password).
 *
 * Like Apple/Google sign-in, nothing is stored for long: a code lives in memory for
 * 10 minutes, and the account id is derived from the address, so the same email
 * always gets the same account.
 *
 * Environment:
 *   BREVO_API_KEY    key for Brevo's transactional email API (free plan: 300 emails/day)
 *   MAIL_FROM        sender address verified in Brevo
 *   MAIL_FROM_NAME   sender name (default "Couple Chaos")
 * Without a key, codes are printed to the server log outside production (for testing),
 * and sign-in answers EMAIL_NOT_CONFIGURED in production.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { AuthError, type VerifiedUser } from "./auth";

export type MailSender = (to: string, subject: string, text: string, html: string) => Promise<void>;

const CODE_TTL_MS = 10 * 60_000;
const RESEND_AFTER_MS = 45_000;
const MAX_ATTEMPTS = 5;
const MAX_PENDING = 5000;
const HOUR_MS = 60 * 60_000;
// Caps that hold even if an attacker rotates IPs: codes per address, and emails per hour overall
// (protects the Brevo quota and stops the endpoint being used to spam strangers).
const MAX_SENDS_PER_EMAIL_PER_HOUR = 5;
const DEFAULT_GLOBAL_SENDS_PER_HOUR = 150;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

interface Pending {
  hash: Buffer;
  expires: number;
  sentAt: number;
  attempts: number;
}

const COPY: Record<string, { subject: string; line: string; ignore: string }> = {
  tr: { subject: "Couple Chaos giriş kodun: {code}", line: "Giriş kodun:", ignore: "Bu kodu sen istemediysen bu e-postayı yok sayabilirsin. Kod 10 dakika geçerli." },
  en: { subject: "Your Couple Chaos code: {code}", line: "Your sign-in code:", ignore: "If you didn't ask for this code, you can ignore this email. It expires in 10 minutes." },
  de: { subject: "Dein Couple Chaos Code: {code}", line: "Dein Anmeldecode:", ignore: "Wenn du diesen Code nicht angefordert hast, ignoriere diese E-Mail. Er ist 10 Minuten gültig." },
  es: { subject: "Tu código de Couple Chaos: {code}", line: "Tu código de acceso:", ignore: "Si no pediste este código, ignora este correo. Caduca en 10 minutos." },
};

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

const hashCode = (email: string, code: string) => createHash("sha256").update(`${email}\n${code}`).digest();

export function emailUserId(email: string): string {
  return `email:${createHash("sha256").update(`couple-chaos:${email}`).digest("hex").slice(0, 32)}`;
}

function brevoSender(): MailSender | null {
  const key = process.env.BREVO_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) return null;
  const name = process.env.MAIL_FROM_NAME?.trim() || "Couple Chaos";
  return async (to, subject, text, html) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: from, name }, to: [{ email: to }], subject, textContent: text, htmlContent: html }),
    });
    if (!response.ok) throw new Error(`MAIL_${response.status}`);
  };
}

export function createEmailAuth(options: { sender?: MailSender | null; now?: () => number; production?: boolean; globalHourlyCap?: number } = {}) {
  const pending = new Map<string, Pending>();
  const sendsByEmail = new Map<string, number[]>();
  let globalSends: number[] = [];
  const now = options.now ?? Date.now;
  const production = options.production ?? process.env.NODE_ENV === "production";
  const sender = options.sender !== undefined ? options.sender : brevoSender();
  const globalCap = options.globalHourlyCap ?? (Number(process.env.EMAIL_HOURLY_CAP) || DEFAULT_GLOBAL_SENDS_PER_HOUR);

  function sweep() {
    const time = now();
    pending.forEach((entry, email) => { if (entry.expires < time) pending.delete(email); });
    sendsByEmail.forEach((times, email) => {
      const recent = times.filter((t) => time - t < HOUR_MS);
      if (recent.length) sendsByEmail.set(email, recent); else sendsByEmail.delete(email);
    });
  }

  async function start(rawEmail: unknown, locale: unknown): Promise<void> {
    const email = normalizeEmail(rawEmail);
    if (!email) throw new AuthError(400, "BAD_EMAIL");
    if (!sender && production) throw new AuthError(503, "EMAIL_NOT_CONFIGURED");
    const existing = pending.get(email);
    if (existing && now() - existing.sentAt < RESEND_AFTER_MS) throw new AuthError(429, "WAIT_BEFORE_RESEND");
    if (pending.size >= MAX_PENDING) sweep();
    if (pending.size >= MAX_PENDING) throw new AuthError(503, "BUSY");
    const time = now();
    const lastSends = (sendsByEmail.get(email) || []).filter((t) => time - t < HOUR_MS);
    if (lastSends.length && time - lastSends[lastSends.length - 1] < RESEND_AFTER_MS) throw new AuthError(429, "WAIT_BEFORE_RESEND");
    if (lastSends.length >= MAX_SENDS_PER_EMAIL_PER_HOUR) throw new AuthError(429, "WAIT_BEFORE_RESEND");
    globalSends = globalSends.filter((t) => time - t < HOUR_MS);
    if (globalSends.length >= globalCap) throw new AuthError(503, "BUSY");
    lastSends.push(time);
    sendsByEmail.set(email, lastSends);
    globalSends.push(time);
    if (sendsByEmail.size > MAX_PENDING) sweep();

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    pending.set(email, { hash: hashCode(email, code), expires: now() + CODE_TTL_MS, sentAt: now(), attempts: 0 });

    const copy = COPY[typeof locale === "string" && COPY[locale] ? locale : "en"];
    const subject = copy.subject.replace("{code}", code);
    const text = `${copy.line} ${code}\n\n${copy.ignore}`;
    const html = `<div style="font-family:Arial,sans-serif;color:#07060A;max-width:420px">
<p style="font-size:16px">${copy.line}</p>
<p style="font-size:36px;font-weight:700;letter-spacing:8px;margin:8px 0 18px;color:#FF1A6C">${code}</p>
<p style="font-size:13px;color:#6b6578">${copy.ignore}</p></div>`;

    if (!sender) {
      console.log(`[email-auth] code for ${email}: ${code} (no BREVO_API_KEY, test mode)`);
      return;
    }
    try {
      await sender(email, subject, text, html);
    } catch (error) {
      pending.delete(email);
      console.warn("[email-auth] send failed", error);
      throw new AuthError(502, "EMAIL_SEND_FAILED");
    }
  }

  function verify(rawEmail: unknown, rawCode: unknown): VerifiedUser {
    const email = normalizeEmail(rawEmail);
    const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : "";
    if (!email || code.length !== 6) throw new AuthError(400, "BAD_CODE");
    const entry = pending.get(email);
    if (!entry || entry.expires < now()) {
      pending.delete(email);
      throw new AuthError(410, "CODE_EXPIRED");
    }
    entry.attempts += 1;
    if (!timingSafeEqual(entry.hash, hashCode(email, code))) {
      if (entry.attempts >= MAX_ATTEMPTS) pending.delete(email);
      throw new AuthError(401, entry.attempts >= MAX_ATTEMPTS ? "CODE_EXPIRED" : "WRONG_CODE");
    }
    pending.delete(email);
    return { id: emailUserId(email), provider: "email", email, name: "" };
  }

  return { start, verify };
}
