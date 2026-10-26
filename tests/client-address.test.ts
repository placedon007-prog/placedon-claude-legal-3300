import { test } from "node:test";
import assert from "node:assert/strict";
import { trustedClientAddress } from "../src/lib/auth/login-limiter";
import { HttpGateway } from "../src/lib/gateway/http";

const h = (entries: Record<string, string>) => new Headers(entries);

test("a client address is read only from the configured header, and only as one IP", () => {
  assert.equal(trustedClientAddress(h({ "cf-connecting-ip": "198.51.100.7" }), "cf-connecting-ip"), "198.51.100.7");
  assert.equal(trustedClientAddress(h({ "cf-connecting-ip": "198.51.100.7" })), null, "no header configured: trust nothing");
  assert.equal(trustedClientAddress(h({ "x-forwarded-for": "198.51.100.7" }), "cf-connecting-ip"), null);
  for (const bad of ["198.51.100.7, 10.0.0.1", "198.51.100.7:443", "evil", ""]) {
    assert.equal(trustedClientAddress(h({ "cf-connecting-ip": bad }), "cf-connecting-ip"), null, bad);
  }
});

test("sign-in forwards the client address to the gateway, and sends no header without one", async () => {
  const original = globalThis.fetch;
  const seen: (string | null)[] = [];
  globalThis.fetch = async (_url, options) => {
    seen.push(new Headers(options?.headers).get("x-placedon-client-address"));
    return new Response(JSON.stringify({ status: "REFUSED", code: "INVALID_CREDENTIALS", detail: "x" }));
  };
  try {
    const gateway = new HttpGateway("http://localhost:8021", "test-key");
    await gateway.authLogin({ email: "a@example.test", password: "p", clientAddress: "198.51.100.7" });
    await gateway.authLogin({ email: "a@example.test", password: "p", clientAddress: null });
    assert.deepEqual(seen, ["198.51.100.7", null]);
  } finally { globalThis.fetch = original; }
});

// Recorded from the live gateway (HTTP 200 both): gateway/accounts.py generic_failure and
// check_lockout. The app expected 401/429 and showed "Couldn't reach sign-in" for both.
test("a wrong password and a lockout arrive as HTTP 200 refusals and are shown as such", async () => {
  const { accountLoginOutcome, CREDENTIALS_MESSAGE } = await import("../src/lib/auth/account-login");
  const original = globalThis.fetch;
  const bodies = [
    { status: "REFUSED", code: "INVALID_CREDENTIALS", detail: "incorrect email or password." },
    { status: "REFUSED", code: "LOCKED_OUT", detail: "too many failed sign-in attempts. Try again shortly.", retry_after: 900 },
    { status: "REFUSED", code: "SOMETHING_ELSE", detail: "internal detail that must not be shown" },
  ];
  let i = 0;
  globalThis.fetch = async () => new Response(JSON.stringify(bodies[i++]));
  try {
    const gateway = new HttpGateway("http://localhost:8021", "test-key");
    const out = [];
    for (let n = 0; n < bodies.length; n++) out.push(accountLoginOutcome(await gateway.authLogin({ email: "a@example.test", password: "p" })));
    assert.deepEqual(out[0], { kind: "error", message: CREDENTIALS_MESSAGE });
    assert.deepEqual(out[1], { kind: "error", message: "Too many failed sign-in attempts. Try again in about 15 minutes." });
    assert.deepEqual(out[2], { kind: "error", message: CREDENTIALS_MESSAGE }, "an unknown refusal reveals nothing");
  } finally { globalThis.fetch = original; }
});

test("invite acceptance forwards the trusted address only as a header", async () => {
  const original = globalThis.fetch;
  const seen: { address: string | null; body: unknown }[] = [];
  globalThis.fetch = async (_url, options) => {
    seen.push({ address: new Headers(options?.headers).get("x-placedon-client-address"),
      body: JSON.parse(String(options?.body)) });
    return new Response(JSON.stringify({ status: "REFUSED", code: "INVALID_INVITE", detail: "Invalid invite" }));
  };
  try {
    const gateway = new HttpGateway("http://localhost:8021", "test-key");
    await gateway.invitesAccept({ token: "synthetic", password: "synthetic password", clientAddress: "198.51.100.8" });
    await gateway.invitesAccept({ token: "synthetic", password: "synthetic password" });
    assert.deepEqual(seen.map(x => x.address), ["198.51.100.8", null]);
    for (const call of seen) assert.deepEqual(call.body, { token: "synthetic", password: "synthetic password" });
  } finally { globalThis.fetch = original; }
});
