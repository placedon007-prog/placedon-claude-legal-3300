import "../engine/server-guard";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authMode, demoModeEnabled, sessionConfigurationIssue } from "./config";
import { consumeLoginAttempt, trustedLoginClientKey } from "./login-limiter";
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

/**
 * Accounts mode stores the BACKEND's session token here — opaque to this app and validated
 * by the gateway via `auth_resolve_session`. Unlike the passcode cookie it is not signed
 * here (the backend is the authority on whether it is live) and it carries the backend's
 * own expiry.
 */
export const ACCOUNT_SESSION_COOKIE = "placedon_account_session";

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

/** Live deployments require sign-in; only explicit isolated demos can open without it. */
export function gateEnabled(): boolean {
  return !demoModeEnabled();
}

/**
 * Check a submitted passcode.
 *
 * Missing live credentials fail closed. Explicit demo mode serves fixtures only and cannot
 * be combined with a live gateway URL or deployment key.
 */
export async function authenticatePasscode(submitted: string): Promise<{
  accepted: boolean;
  retryAfterSeconds?: number;
  configurationIssue?: boolean;
}> {
  const configuredHeader = process.env.APP_TRUSTED_CLIENT_IP_HEADER;
  const clientKey = configuredHeader ? trustedLoginClientKey(await headers(), configuredHeader) : null;
  const limit = consumeLoginAttempt(clientKey);
  if (!limit.allowed) return { accepted: false, retryAfterSeconds: limit.retryAfterSeconds };
  if (submitted.length > 4096) return { accepted: false };
  const expected = passcode();
  if (sessionConfigurationIssue()) return { accepted: false, configurationIssue: true };
  if (expected === null) return { accepted: demoModeEnabled() };
  return { accepted: sameSecret(submitted, expected) };
}

export async function startSession(): Promise<void> {
  if (demoModeEnabled()) return;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, mintToken(secret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Store a backend session token from `auth.login`: httpOnly, Secure in production,
 * SameSite=Lax, with the backend's expiry verbatim. The token is a credential — never
 * logged, never sent to the client bundle (this is server-only).
 */
export async function startAccountSession(token: string, expiresAt: string): Promise<void> {
  const jar = await cookies();
  const expires = new Date(expiresAt);
  jar.set(ACCOUNT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // The backend owns the lifetime; fall back to a bounded Max-Age only if it sent an
    // unparseable date, so a bad timestamp can never mint a non-expiring cookie.
    ...(Number.isFinite(expires.getTime()) ? { expires } : { maxAge: MAX_AGE_SECONDS }),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ACCOUNT_SESSION_COOKIE);
}

/** True when this request may see `/app`. */
export async function hasSession(): Promise<boolean> {
  if (sessionConfigurationIssue()) return false;
  if (demoModeEnabled()) return true;
  const jar = await cookies();
  if (authMode() === "accounts") {
    // The cookie carries the backend's expiry, so its presence means "not yet expired".
    // Server-side REVOCATION is caught when the token is used against the gateway (401),
    // not here — this gate only decides whether /app may render.
    return Boolean(jar.get(ACCOUNT_SESSION_COOKIE)?.value);
  }
  return tokenIsValid(jar.get(SESSION_COOKIE)?.value, secret());
}

/** Enforced at the data boundary, including direct Server Action requests. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}
