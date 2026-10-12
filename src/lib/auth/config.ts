/** Explicit deployment policy; safe to test without cookies or framework globals. */
export function demoModeEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.PLACEDON_DEMO_MODE === "true";
}

export function sessionConfigurationIssue(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  if (demoModeEnabled(env)) {
    if (env.GATEWAY_URL?.trim() || env.PLACEDON_GATEWAY_KEY?.trim()) {
      return "Demo mode must not be connected to a live gateway. Disable demo mode to use live data.";
    }
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
