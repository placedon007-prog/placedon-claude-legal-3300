import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { MockGateway } from "../src/lib/gateway/mock";
import { isRefusal, vaultDeleteSchema } from "../src/lib/gateway/types";
import { deleteVaultDocumentAction } from "../src/app/app/vault/actions";

const ID = "11111111-1111-4111-8111-111111111111";
const gw = () => new HttpGateway("http://localhost:8021", "fixture-key");

async function withFetch<T>(reply: () => Response, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = async () => reply();
  try { return await run(); } finally { globalThis.fetch = original; }
}

test("vaultDelete posts the document id to /v2/vault/delete and reads the deletion", async () => {
  const original = globalThis.fetch;
  let seen: { url: string; body: unknown } | null = null;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(String(init?.body)) };
    return Response.json({ document_id: ID, deleted: true, bytes_destroyed: false, note: "Deleted." });
  };
  try {
    const result = await gw().vaultDelete({ documentId: ID });
    assert.deepEqual(seen, { url: "http://localhost:8021/v2/vault/delete", body: { document_id: ID } });
    assert.ok(result.ok && !isRefusal(result.data) && result.data.deleted);
  } finally { globalThis.fetch = original; }
});

test("FORBIDDEN on HTTP 200 and NOT_FOUND on 404 both arrive as refusals, never as deletions", async () => {
  const forbidden = await withFetch(() => Response.json({ status: "REFUSED", code: "FORBIDDEN", detail: "You can read this document but not delete it." }),
    () => gw().vaultDelete({ documentId: ID }));
  assert.ok(forbidden.ok && isRefusal(forbidden.data) && forbidden.data.code === "FORBIDDEN");
  const missing = await withFetch(() => Response.json({ status: "REFUSED", code: "NOT_FOUND", detail: "no vault document" }, { status: 404 }),
    () => gw().vaultDelete({ documentId: ID }));
  assert.ok(missing.ok && isRefusal(missing.data) && missing.data.code === "NOT_FOUND");
});

test("the schema refuses an answer without `deleted`, so it cannot pass as success", () => {
  assert.equal(vaultDeleteSchema.safeParse({ document_id: ID }).success, false);
});

test("the mock removes the file from the list, and a second delete is NOT_FOUND", async () => {
  const mock = new MockGateway();
  const id = "a".repeat(64);
  const first = await mock.vaultDelete({ documentId: id });
  assert.ok(first.ok && !isRefusal(first.data) && first.data.deleted);
  const list = await mock.vaultList({ matterId: null });
  assert.ok(list.ok && !isRefusal(list.data) && !list.data.documents.some((d) => d.document_id === id));
  const second = await mock.vaultDelete({ documentId: id });
  assert.ok(second.ok && isRefusal(second.data) && second.data.code === "NOT_FOUND");
});

/** Runs `fn` with only the given env keys set (others among them removed), then restores. */
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

test("the delete action requires a session before contacting the gateway", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("no", { status: 500 }); };
  try {
    const result = await withEnv({ GATEWAY_URL: "http://gateway.invalid", PLACEDON_GATEWAY_KEY: "test-key-that-is-not-a-secret" },
      () => deleteVaultDocumentAction({ documentId: ID, name: "nda.pdf" }));
    assert.equal(result.ok, false);
    assert.match(result.message, /session has ended/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test("the delete action names the file on success and says a refusal in words", async () => {
  await withEnv({ PLACEDON_DEMO_MODE: "true" }, async () => {
    const ok = await deleteVaultDocumentAction({ documentId: "a".repeat(64), name: "mutual-nda.txt" });
    assert.deepEqual(ok, { ok: true, message: "mutual-nda.txt was deleted. Its searchable text is removed from this workspace." });
    const refused = await deleteVaultDocumentAction({ documentId: ID, name: "nda.pdf" });
    assert.equal(refused.ok, false);
    assert.match(refused.message, /not available to you/);
    const invalid = await deleteVaultDocumentAction({ documentId: "../etc", name: "x" });
    assert.deepEqual(invalid, { ok: false, message: "That is not a document id." });
  });
});

test("the delete action maps FORBIDDEN and deleted:false, never reporting success", async () => {
  const original = MockGateway.prototype.vaultDelete;
  try {
    await withEnv({ PLACEDON_DEMO_MODE: "true" }, async () => {
      MockGateway.prototype.vaultDelete = async () => ({ ok: true, data: { status: "REFUSED", code: "FORBIDDEN", detail: "x" } });
      const forbidden = await deleteVaultDocumentAction({ documentId: ID, name: "nda.pdf" });
      assert.ok(!forbidden.ok && /not delete it/.test(forbidden.message));
      MockGateway.prototype.vaultDelete = async () => ({ ok: true, data: { document_id: ID, deleted: false, bytes_destroyed: false } });
      const nothing = await deleteVaultDocumentAction({ documentId: ID, name: "nda.pdf" });
      assert.ok(!nothing.ok && /Nothing was deleted/.test(nothing.message));
      MockGateway.prototype.vaultDelete = async () => ({ ok: false, error: { kind: "bad_request", route: "/v2/vault/delete", status: 403, message: "403" } });
      const role = await deleteVaultDocumentAction({ documentId: ID, name: "nda.pdf" });
      assert.ok(!role.ok && /role cannot delete/.test(role.message));
    });
  } finally { MockGateway.prototype.vaultDelete = original; }
});
