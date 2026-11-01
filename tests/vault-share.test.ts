import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { MockGateway } from "../src/lib/gateway/mock";
import { isRefusal, vaultShareSchema } from "../src/lib/gateway/types";
import { shareVaultDocumentAction } from "../src/app/app/vault/actions";

const ID = "11111111-1111-4111-8111-111111111111";
const REASON = "Template for every NDA review";
const gw = () => new HttpGateway("http://localhost:8021", "fixture-key");

test("vaultShare posts id, reason and shared to /v2/vault/share", async () => {
  const original = globalThis.fetch;
  let seen: { url: string; body: unknown } | null = null;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(String(init?.body)) };
    return Response.json({ status: "SHARED", document_id: ID, shared_with_firm_at: "2026-11-01T10:00:00+00:00" });
  };
  try {
    const result = await gw().vaultShare({ documentId: ID, reason: REASON, shared: true });
    assert.deepEqual(seen, { url: "http://localhost:8021/v2/vault/share", body: { document_id: ID, reason: REASON, shared: true } });
    assert.ok(result.ok && !isRefusal(result.data) && result.data.status === "SHARED");
  } finally { globalThis.fetch = original; }
});

test("an answer without SHARED/UNSHARED cannot pass as a change", () => {
  assert.equal(vaultShareSchema.safeParse({ document_id: ID }).success, false);
});

test("the mock shares, lists the file as shared, then stops; a filed file is FORBIDDEN", async () => {
  const mock = new MockGateway();
  const id = "a".repeat(64);
  const shared = await mock.vaultShare({ documentId: id, reason: REASON, shared: true });
  assert.ok(shared.ok && !isRefusal(shared.data) && shared.data.status === "SHARED");
  const list = await mock.vaultList({ matterId: null });
  assert.ok(list.ok && !isRefusal(list.data) && list.data.documents.find((d) => d.document_id === id)?.shared_with_firm_at);
  const stopped = await mock.vaultShare({ documentId: id, reason: REASON, shared: false });
  assert.ok(stopped.ok && !isRefusal(stopped.data) && stopped.data.status === "UNSHARED" && stopped.data.shared_with_firm_at === null);
  const up = await mock.vaultUpload({ name: "filed.txt", text: "x", matterId: ID });
  assert.ok(up.ok && !isRefusal(up.data));
  const filed = await mock.vaultShare({ documentId: up.data.document_id, reason: REASON, shared: true });
  assert.ok(filed.ok && isRefusal(filed.data) && filed.data.code === "FORBIDDEN");
});

async function withEnv<T>(set: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const keys = ["APP_PASSCODE", "APP_SESSION_SECRET", "PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"];
  const saved = keys.map((k) => process.env[k]);
  try {
    for (const k of keys) delete process.env[k];
    Object.assign(process.env, set);
    return await fn();
  } finally {
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
}

test("the share action requires a session before contacting the gateway", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("no", { status: 500 }); };
  try {
    const result = await withEnv({ GATEWAY_URL: "http://gateway.invalid", PLACEDON_GATEWAY_KEY: "test-key-that-is-not-a-secret" },
      () => shareVaultDocumentAction({ documentId: ID, name: "nda.pdf", reason: REASON, shared: true }));
    assert.ok(!result.ok && /session has ended/.test(result.message));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test("the share action names the file, checks the reason, and says refusals in words", async () => {
  const original = MockGateway.prototype.vaultShare;
  try {
    await withEnv({ PLACEDON_DEMO_MODE: "true" }, async () => {
      const ok = await shareVaultDocumentAction({ documentId: "a".repeat(64), name: "mutual-nda.txt", reason: REASON, shared: true });
      assert.ok(ok.ok && ok.message === "mutual-nda.txt is now shared with everyone in the firm.");
      const short = await shareVaultDocumentAction({ documentId: ID, name: "x", reason: "because", shared: true });
      assert.ok(!short.ok && /at least 10 characters/.test(short.message));
      const bad = await shareVaultDocumentAction({ documentId: "../etc", name: "x", reason: REASON, shared: true });
      assert.deepEqual(bad, { ok: false, message: "That is not a document id." });
      MockGateway.prototype.vaultShare = async () => ({ ok: true, data: { status: "REFUSED", code: "FORBIDDEN", detail: "x" } });
      const forbidden = await shareVaultDocumentAction({ documentId: ID, name: "nda.pdf", reason: REASON, shared: true });
      assert.ok(!forbidden.ok && /Only the person who uploaded/.test(forbidden.message));
      MockGateway.prototype.vaultShare = async () => ({ ok: false, error: { kind: "bad_request", route: "/v2/vault/share", status: 403, message: "403" } });
      const role = await shareVaultDocumentAction({ documentId: ID, name: "nda.pdf", reason: REASON, shared: true });
      assert.ok(!role.ok && /role cannot/.test(role.message));
    });
  } finally { MockGateway.prototype.vaultShare = original; }
});
