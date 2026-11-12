import { test } from "node:test";
import assert from "node:assert/strict";
import { createLoginLimiter, trustedLoginClientKey } from "../src/lib/auth/login-limiter";

test("one exhausted client cannot lock other visitors out, and recovers without restart", () => {
  let time = 0;
  const consume = createLoginLimiter({ now: () => time, perClientMaximum: 3, globalMaximum: 20 });
  assert.deepEqual(Array.from({ length: 6 }, () => consume("client-a").allowed), [true, true, true, false, false, false]);
  for (let i = 0; i < 100; i++) assert.equal(consume("client-a").allowed, false);
  assert.equal(consume("client-b").allowed, true, "blocked client attempts do not consume global capacity");
  time = 59_001;
  assert.deepEqual(consume("client-a"), { allowed: false, retryAfterSeconds: 1 });
  time = 60_000;
  assert.equal(consume("client-a").allowed, true);
});

test("untrusted anonymous attempts share only the larger cap, which has a retry window", () => {
  let time = 0;
  const consume = createLoginLimiter({ now: () => time, perClientMaximum: 2, globalMaximum: 12 });
  for (let i = 0; i < 12; i++) assert.equal(consume(null).allowed, true);
  assert.deepEqual(consume(null), { allowed: false, retryAfterSeconds: 60 });
  assert.equal(consume("new-client").allowed, false, "new keys cannot bypass the global ceiling");
  time = 60_000;
  assert.equal(consume(null).allowed, true);
});

test("forwarded headers are ignored unless explicitly configured as a trusted ingress header", () => {
  const h = new Headers({ "x-forwarded-for": "203.0.113.1", "x-real-ip": "203.0.113.2" });
  assert.equal(trustedLoginClientKey(h), null);
  assert.equal(trustedLoginClientKey(h, "missing-header"), null);
  const key = trustedLoginClientKey(h, "x-real-ip");
  assert.ok(key && !key.includes("203.0.113.2"), "limiter stores a digest rather than the raw IP");
  assert.equal(key, trustedLoginClientKey(h, "X-Real-IP"));
  for (const value of ["203.0.113.1, 203.0.113.2", "attacker-key", "203.0.113.1:5000"]) {
    assert.equal(trustedLoginClientKey(new Headers({ "x-real-ip": value }), "x-real-ip"), null);
  }
});

test("trusted client buckets remain separate for canonical IPv4 and IPv6 addresses", () => {
  const first = trustedLoginClientKey(new Headers({ "x-proxy-ip": "203.0.113.4" }), "x-proxy-ip");
  const second = trustedLoginClientKey(new Headers({ "x-proxy-ip": "2001:db8::5" }), "x-proxy-ip");
  assert.notEqual(first, second);
  const consume = createLoginLimiter({ perClientMaximum: 1 });
  assert.equal(consume(first).allowed, true);
  assert.equal(consume(first).allowed, false);
  assert.equal(consume(second).allowed, true);
});
