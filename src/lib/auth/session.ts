import "../engine/server-guard";
import { cookies } from "next/headers";
import { MAX_AGE_SECONDS, mintToken, sameSecret, tokenIsValid } from "./token";

/**
 * A passcode gate for the PROTOTYPE, and it is deliberately small.
 *
 * What it is: one shared passcode, checked server-side, exchanged for a signed httpOnly
 * cookie. Enough to keep an unfinished tool off the open internet.
 *
 * What it is NOT, stated so nobody mistakes it for more: no users, no roles, no audit of
 * who looked at what, no revocation beyond rotating the secret. The TENANT is decided by
 * the gateway API key this deployment holds, not by whoever typed the passcode — so every
 * session here sees the same tenant's runs. That is acceptable for a single-firm pilot and
 * is not acceptable for a second customer, and the difference is a real login.
 */

export const SESSION_COOKIE = "placedon_app_session";

function secret(): string {
  const s = process.env.APP_SESSION_SECRET?.trim();
  if (s && s.length >= 16) return s;
  // Falling back to the passcode is worse than failing: it makes the cookie forgeable by
  // anyone who learns the passcode, which is the one secret we hand to people.
  throw new Error(
    "APP_SESSION_SECRET is missing or shorter than 16 characters. It signs the session " +
      "cookie and must not be derived from the passcode.",
  );
}

function passcode(): string | null {
  const p = process.env.APP_PASSCODE?.trim();
  return p ? p : null;
}

/** True when this deployment demands a passcode at all. */
export function gateEnabled(): boolean {
  return passcode() !== null;
}

/**
 * Check a submitted passcode.
 *
 * With no `APP_PASSCODE` configured the gate is OPEN, and that is a deliberate local
 * -development choice rather than an accident — `/app` renders a standing banner saying so,
 * because an unprotected prototype that looks protected is worse than one that admits it.
 */
export function passcodeAccepted(submitted: string): boolean {
  const expected = passcode();
  if (expected === null) return true;
  return sameSecret(submitted, expected);
}

export async function startSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, mintToken(secret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** True when this request may see `/app`. */
export async function hasSession(): Promise<boolean> {
  if (!gateEnabled()) return true;
  const jar = await cookies();
  return tokenIsValid(jar.get(SESSION_COOKIE)?.value, secret());
}
