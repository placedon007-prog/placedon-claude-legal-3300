import { createHash } from "node:crypto";
import { isIP } from "node:net";

export interface LoginLimit {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

/**
 * Trust no forwarding header by default. Configure a header only behind an ingress that
 * strips the incoming value, sets one client IP, and prevents direct access to this app.
 */
export function trustedClientAddress(requestHeaders: Pick<Headers, "get">, configuredHeader?: string): string | null {
  const header = configuredHeader?.trim().toLowerCase();
  if (!header || !/^[a-z0-9-]+$/.test(header)) return null;
  const value = requestHeaders.get(header)?.trim();
  // Lists, ports, opaque strings and missing headers do not create attacker-chosen buckets.
  if (!value || !isIP(value)) return null;
  return value.toLowerCase();
}

export function trustedLoginClientKey(requestHeaders: Pick<Headers, "get">, configuredHeader?: string): string | null {
  const address = trustedClientAddress(requestHeaders, configuredHeader);
  return address === null ? null : createHash("sha256").update(address).digest("hex");
}

/** Per-process pilot defense. Replicas still require one distributed ingress limiter. */
export function createLoginLimiter({
  now = Date.now,
  perClientMaximum = 10,
  globalMaximum = 120,
  intervalMs = 60_000,
}: {
  now?: () => number;
  perClientMaximum?: number;
  globalMaximum?: number;
  intervalMs?: number;
} = {}) {
  type Bucket = { start: number; used: number };
  const clients = new Map<string, Bucket>();
  let global: Bucket = { start: now(), used: 0 };
  const retry = (bucket: Bucket, current: number): LoginLimit => ({
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.start + intervalMs - current) / 1000)),
  });
  return (clientKey: string | null = null): LoginLimit => {
    const current = now();
    if (current - global.start >= intervalMs) global = { start: current, used: 0 };
    for (const [key, bucket] of clients) {
      if (current - bucket.start >= intervalMs) clients.delete(key);
    }
    const client = clientKey ? clients.get(clientKey) ?? { start: current, used: 0 } : null;
    // One blocked client cannot exhaust everybody else's global allowance by retrying.
    if (client && client.used >= perClientMaximum) return retry(client, current);
    if (global.used >= globalMaximum) return retry(global, current);
    global.used += 1;
    if (client && clientKey) {
      client.used += 1;
      clients.set(clientKey, client);
    }
    // With no trusted identity, only the larger global fallback applies. Arbitrary
    // x-forwarded-for values cannot reset it. The global cap also bounds the map size.
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

export const consumeLoginAttempt = createLoginLimiter();
