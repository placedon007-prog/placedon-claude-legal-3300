import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The pure half of the session: minting and checking a signed token, and comparing a
 * passcode. No `next/headers`, no cookies, no request — so it is testable on its own and
 * the cookie plumbing in `session.ts` has nothing to prove.
 */

export const MAX_AGE_SECONDS = 60 * 60 * 8; // one working day

/** Constant-time compare that does not leak length through an early return. */
export function sameSecret(a: string, b: string): boolean {
  const ha = createHmac("sha256", "compare").update(a).digest();
  const hb = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** `<issued>.<nonce>.<mac>` — the mac covers both, so neither can be edited. */
export function mintToken(secret: string, now = Date.now()): string {
  const payload = `${now}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function tokenIsValid(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issued, nonce, mac] = parts;
  const expected = sign(`${issued}.${nonce}`, secret);
  if (mac.length !== expected.length || !sameSecret(mac, expected)) return false;
  const at = Number(issued);
  if (!Number.isFinite(at)) return false;
  return now - at < MAX_AGE_SECONDS * 1000 && now - at >= 0;
}
