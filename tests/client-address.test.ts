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
