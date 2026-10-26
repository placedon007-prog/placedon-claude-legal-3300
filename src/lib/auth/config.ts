/** Explicit deployment policy; safe to test without cookies or framework globals. */
export function demoModeEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.PLACEDON_DEMO_MODE === "true";
}

/**
 * How people sign in. `passcode` is the prototype gate that works today. `accounts` shows
 * email + password, which signs nobody in until the backend serves `auth.login`: until
 * then it says so, and never accepts a credential it cannot check.
 */
export type AuthMode = "passcode" | "accounts";
export function authMode(env: Readonly<Record<string, string | undefined>> = process.env): AuthMode {
  return env.APP_AUTH_MODE === "accounts" ? "accounts" : "passcode";
}

export function sessionConfigurationIssue(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  if (demoModeEnabled(env)) {
    if (env.GATEWAY_URL?.trim() || env.PLACEDON_GATEWAY_KEY?.trim()) {
      return "Demo mode must not be connected to a live gateway. Disable demo mode to use live data.";
    }
    return null;
  }
  if (authMode(env) === "accounts") {
    // Accounts mode signs people in through the gateway's `auth.login`, so what it needs is
    // a configured gateway — not a shared passcode or a cookie-signing secret (the backend
    // session token is opaque and backend-validated, not signed here).
    const origin = env.GATEWAY_URL?.trim();
    const key = env.PLACEDON_GATEWAY_KEY?.trim();
    if (!origin || !key) return "Accounts sign-in is not configured. Configure GATEWAY_URL and PLACEDON_GATEWAY_KEY.";
    return null;
  }
  if (!env.APP_PASSCODE?.trim()) return "Console access is not configured. Ask the operator to configure sign-in.";
  if ((env.APP_SESSION_SECRET?.trim().length ?? 0) < 16) return "Console sessions are not configured. Ask the operator to configure sign-in.";
  if (env.APP_SESSION_SECRET?.trim() === env.APP_PASSCODE?.trim()) return "Session signing must use an independent secret. Ask the operator to configure sign-in.";
  return null;
}

export function gatewayConfiguration(env: Readonly<Record<string, string | undefined>> = process.env):
  | { mode: "demo" }
  | { mode: "live"; origin: string; key: string } {
  if (demoModeEnabled(env)) {
    const issue = sessionConfigurationIssue(env);
    if (issue) throw new Error(issue);
    return { mode: "demo" };
  }
  const origin = env.GATEWAY_URL?.trim();
  const key = env.PLACEDON_GATEWAY_KEY?.trim();
  if (!origin || !key) {
    throw new Error("The console gateway is not configured. Configure GATEWAY_URL and PLACEDON_GATEWAY_KEY, or explicitly enable PLACEDON_DEMO_MODE for fixture data.");
  }
  return { mode: "live", origin, key };
}

/**
 * The bearer the gateway sees, and so WHO the backend believes is calling.
 *
 * Accounts mode: the signed-in person's own backend session token. The deployment key
 * maps to one actor, and every per-matter grant, owner check and job identity on the
 * backend is decided by that actor, so sending the key for everyone would make every
 * lawyer the same person. No session means no credential, never a fallback to the key.
 *
 * Passcode mode has no per-person identity at all (see session.ts) and keeps the key.
 */
export function gatewayCredential(
  env: Readonly<Record<string, string | undefined>>,
  accountSessionToken: string | undefined,
): string | null {
  if (authMode(env) === "accounts") return accountSessionToken?.trim() || null;
  return env.PLACEDON_GATEWAY_KEY?.trim() || null;
}

/** What kind of session the console is serving, so it never describes one as another. */
export function sessionKind(env: Readonly<Record<string, string | undefined>> = process.env): "demo" | "passcode" | "account" {
  if (demoModeEnabled(env)) return "demo";
  return authMode(env) === "accounts" ? "account" : "passcode";
}
