import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { MockGateway } from "../src/lib/gateway/mock";
import { isRefusal } from "../src/lib/gateway/types";
import { retryVaultDocumentAction } from "../src/app/app/vault/actions";

const ID = "11111111-1111-4111-8111-111111111111";

test("vaultRetry posts the document id to /v2/vault/retry and reads the requeue", async () => {
  const original = globalThis.fetch;
  let seen: { url: string; body: unknown } | null = null;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(String(init?.body)) };
    return Response.json({ document_id: ID, name: "nda.pdf", state: "PENDING", retried: true, note: "Queued." });
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").vaultRetry({ documentId: ID });
    assert.deepEqual(seen, { url: "http://localhost:8021/v2/vault/retry", body: { document_id: ID } });
    assert.equal(result.ok, true);
    if (!result.ok || isRefusal(result.data)) throw new Error("a requeue is not a refusal");
    assert.equal(result.data.state, "PENDING");
  } finally { globalThis.fetch = original; }
});

test("a backend refusal (409 CONFLICT, not FAILED) arrives as a refusal, never as a requeue", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json(
    { status: "REFUSED", code: "CONFLICT", detail: "Only a FAILED document can be retried; this one is PENDING." },
    { status: 409 });
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").vaultRetry({ documentId: ID });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("a refusal is a product state, not a transport failure");
    assert.ok(isRefusal(result.data));
    assert.equal(result.data.code, "CONFLICT");
  } finally { globalThis.fetch = original; }
});

test("the mock moves only a FAILED document, so a second retry is refused", async () => {
  const mock = new MockGateway();
  const vault = (mock as unknown as { vault: Map<string, { state: string }> }).vault;
  const id = [...vault.keys()][0];
  vault.get(id)!.state = "FAILED";
  const first = await mock.vaultRetry({ documentId: id });
  assert.ok(first.ok && !isRefusal(first.data) && first.data.state === "PENDING");
  const second = await mock.vaultRetry({ documentId: id });
  assert.ok(second.ok && isRefusal(second.data) && second.data.code === "CONFLICT");
});

test("the retry action requires a session before contacting the gateway", async () => {
  const env = process.env;
  const saved = { APP_PASSCODE: env.APP_PASSCODE, APP_SESSION_SECRET: env.APP_SESSION_SECRET,
    PLACEDON_DEMO_MODE: env.PLACEDON_DEMO_MODE, GATEWAY_URL: env.GATEWAY_URL,
    PLACEDON_GATEWAY_KEY: env.PLACEDON_GATEWAY_KEY };
  const original = globalThis.fetch;
  let calls = 0;
  try {
    delete env.APP_PASSCODE;
    delete env.APP_SESSION_SECRET;
    delete env.PLACEDON_DEMO_MODE;
    env.GATEWAY_URL = "http://gateway.invalid";
    env.PLACEDON_GATEWAY_KEY = "test-key-that-is-not-a-secret";
    globalThis.fetch = async () => { calls += 1; return new Response("no", { status: 500 }); };
    const result = await retryVaultDocumentAction({ documentId: ID });
    assert.equal(result.ok, false);
    assert.match(result.message, /session has ended/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
});
