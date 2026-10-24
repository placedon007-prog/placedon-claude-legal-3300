import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { isRefusal, vaultFindSchema, vaultListSchema } from "../src/lib/gateway/types";

const page = { documents: [{ document_id: "doc-a", name: "Order.pdf", state: "INGESTED", matter_id: null, byte_count: 42, doc_class: null }], next_offset: null, truncated: false, scope: "unfiled", matter_id: null, note: "Unfiled workspace files" };
test("vault catalogue sends scoped POST input and parses metadata without leaking document contents", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://localhost:8021/v2/vault/list");
    assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(String(options?.body)), { query: "Order", limit: "30", offset: "0" });
    return new Response(JSON.stringify({ ...page, documents: [{ ...page.documents[0], text: "private document text", storage_key: "private path" }] }));
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "test-key").vaultList({ matterId: null, query: "Order" });
    assert.deepEqual(result, { ok: true, data: page });
  } finally { globalThis.fetch = original; }
});
test("vault catalogue keeps outages distinct from empty results and preserves refusal", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("busy", { status: 503 });
    assert.equal((await new HttpGateway("http://localhost:8021", "test-key").vaultList({ matterId: null })).ok, false);
    globalThis.fetch = async () => new Response(JSON.stringify({ status: "REFUSED", code: "NOT_FOUND", detail: "Matter unavailable." }));
    const result = await new HttpGateway("http://localhost:8021", "test-key").vaultList({ matterId: "11111111-1111-1111-1111-111111111111" });
    assert.equal(result.ok, true);
    if (result.ok) assert.ok("code" in result.data);
    assert.equal(vaultListSchema.safeParse({ ...page, documents: [{ ...page.documents[0], state: undefined }] }).success, false);
  } finally { globalThis.fetch = original; }
});

test("vault search preserves the passage text returned by the backend", () => {
  const result = vaultFindSchema.parse({
    hits: [{ document_id: "doc-a", ordinal: 2, score: 1.42,
      text: "The fictional meeting is on 12 October.", name: "Test notice.txt", doc_class: "notice" }],
    searched_documents: 1, searched_chunks: 3, unsearchable: 0,
    note: "1 passage found", scope: "tenant", scope_note: "Searched workspace files.",
  });
  assert.equal(result.hits[0].text, "The fictional meeting is on 12 October.");
  assert.equal(result.hits[0].ordinal, 2);
});

test("a 409 vault CONFLICT is a refusal the composer can name, not a transport failure", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ status: "REFUSED", code: "CONFLICT", detail: "These bytes are already in this workspace's vault." }), { status: 409 });
    const result = await new HttpGateway("http://localhost:8021", "test-key").vaultUpload({ name: "minutes.docx", text: "Minutes of the meeting." });
    assert.equal(result.ok, true);
    assert.ok(result.ok && isRefusal(result.data) && result.data.code === "CONFLICT");
  } finally { globalThis.fetch = original; }
});
