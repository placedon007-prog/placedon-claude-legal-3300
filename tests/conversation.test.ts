import assert from "node:assert/strict";
import test from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { conversationGetOkSchema, conversationSendOkSchema, sourcesListSchema, vaultUploadSchema, vaultDocumentSchema } from "../src/lib/gateway/types";
import { chosenOrDefault, defaultSourceIds, toggleSource } from "../src/lib/sources";
import { conversationTurns, conversationPollDelay, executionCostLabel, modelCalls } from "../src/lib/conversation";
import PICKER from "../src/lib/gateway/fixtures/main-sources.json" with { type: "json" };
import RECORDED from "../src/lib/gateway/fixtures/conversation.json" with { type: "json" };

const bodies = sourcesListSchema.parse(PICKER).bodies;
const report = { picked: ["held", "vault"], searched: ["held"], report: [
  { id: "held", tier: "HELD", status: "available", outcome: "SEARCHED_HITS", hits: 2, reason: "" },
  { id: "vault", tier: "PUBLIC", status: "available", outcome: "NOT_SEARCHED", hits: 0, reason: "Document retrieval unavailable." },
] };
const metadata = { schema: "conversation_turn.v1", request_id: "request-12345678", sources: report,
  artifacts: [{ type: "draft", id: "draft-123", version: 2 }, { type: "review_table", id: "table-123" }] };

test("main source picker uses provider IDs and never submits law-body IDs", () => {
  assert.deepEqual(defaultSourceIds(bodies), ["held", "vault"]);
  assert.deepEqual(chosenOrDefault(bodies, ["CA2013"]), ["held", "vault"]);
  assert.deepEqual(toggleSource(["held"], "held", bodies), ["held"], "zero means defaults at gateway, so keep the last selection on");
  const unavailable = bodies.find((body) => !body.selectable)!;
  assert.deepEqual(toggleSource(["held"], unavailable.id, bodies), ["held"]);
  const lexis = bodies.find((body) => body.id === "lexisnexis_india");
  assert.ok(lexis, "LexisNexis is discoverable in the picker");
  assert.equal(lexis.selectable, false, "no source pick can search without configured rights");
  assert.match(lexis.reason ?? "", /agreement.*AI use.*citation.*retention/i);
  const listed = sourcesListSchema.parse(PICKER);
  assert.equal(listed.integrations.find((item) => item.id === "imanage")?.can_connect, false);
  assert.match(listed.integrations.find((item) => item.id === "imanage")?.message ?? "", /firm administrator/i);
  assert.equal(sourcesListSchema.safeParse({ bodies: [] }).success, false, "unmerged body contract cannot silently masquerade as main");
});

test("reload preserves outcome, per-turn source report, document IDs, and work products", () => {
  const payload = conversationGetOkSchema.parse({ conversation: { conversation_id: "thread", title: "Question", matter_id: "matter" }, messages: [
    { message_id: "user", ordinal: 1, role: "user", text: "Question about a meeting", file_ids: ["doc"] },
    { message_id: "assistant", ordinal: 2, role: "assistant", text: "", envelope: { ...RECORDED.send_answered.envelope, status: "PARTIAL" }, metadata },
  ] });
  const [turn] = conversationTurns("thread", payload.messages);
  assert.equal(turn.key, "request-12345678");
  assert.equal(turn.state?.phase, "answered");
  if (turn.state?.phase !== "answered") throw new Error("missing answer");
  assert.equal(turn.state.envelope.status, "PARTIAL");
  assert.equal(turn.state.draftId, "draft-123");
  assert.deepEqual(turn.state.artifacts, metadata.artifacts);
  assert.deepEqual(turn.state.sources?.report, report.report);
});

test("an accepted reservation with no run yet remains queued and can reconcile by request ID", () => {
  const result = conversationSendOkSchema.parse({ conversation_id: "thread", message_id: "assistant", envelope: null, run_id: null, metadata });
  const [turn] = conversationTurns(result.conversation_id, [
    { message_id: "user", ordinal: 0, role: "user", text: "Question" },
    { message_id: result.message_id, ordinal: 1, role: "assistant", text: "", envelope: null, run_id: null, metadata: result.metadata },
  ]);
  assert.equal(turn.state?.phase, "queued");
  assert.equal(turn.key, metadata.request_id);
  assert.equal(conversationPollDelay(0), 1500);
  assert.equal(conversationPollDelay(20), 30000);
});

test("run provenance lists only recorded model calls and never treats an unknown price as free", () => {
  const steps = [
    { capability: "intake", status: "ANSWERED", model: null, provider: null, region: null, cost_inr: null, cost_note: "No model call." },
    { capability: "research", status: "ANSWERED", model: "azure/llama-3-3-70b", provider: "azure", region: "UAE North", cost_inr: null, cost_note: "Provider usage was not priced." },
    { capability: "research.retry", status: "FAILED", model: "azure/gpt-5-mini", provider: "azure", region: "UAE North", cost_inr: null, cost_note: "The provider did not report usage." },
  ] as const;
  const calls = modelCalls(steps);
  assert.equal(calls.length, 2, "failed attempts remain visible in the trace");
  assert.equal(calls[0].provider, "azure");
  assert.equal(calls[0].region, "UAE North");
  assert.equal(calls[1].status, "FAILED", "the UI can label an unsuccessful attempt truthfully");
  assert.equal(executionCostLabel(null, "Provider usage was not priced."), "Not priced — Provider usage was not priced.");
  assert.equal(executionCostLabel(0, null), "₹0.00", "a recorded zero remains distinct from null/unknown");
  assert.equal(executionCostLabel(0.001, null), "< ₹0.01", "positive sub-paise amounts never round down to free");
});

test("send serializes stable request ID, all selected documents, matter and 8000-character text", async () => {
  const original = globalThis.fetch;
  let sent: Record<string, unknown> = {};
  globalThis.fetch = async (_input, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ conversation_id: "thread", message_id: "assistant", envelope: null, run_id: "run" }), { status: 200 });
  };
  try {
    const result = await new HttpGateway("http://127.0.0.1:8021", "test-key").conversationSend({
      requestId: "request-12345678", text: "q".repeat(8000), fileIds: ["doc1", "doc2"], sources: ["held"], matterId: "matter",
    });
    assert.equal(result.ok, true);
    assert.equal(sent.request_id, "request-12345678");
    assert.deepEqual(sent.file_ids, ["doc1", "doc2"]);
    assert.deepEqual(sent.sources, ["held"]);
    assert.equal(String(sent.text).length, 8000);
    assert.equal(sent.matter_id, "matter");
  } finally { globalThis.fetch = original; }
});

test("busy gateway stays a transport state and preserves bounded Retry-After", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: "BUSY" }), { status: 429, headers: { "retry-after": "4" } });
  try {
    const result = await new HttpGateway("http://127.0.0.1:8021", "test-key").conversationSend({ text: "Question", requestId: "request-12345678" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("busy is not an answer");
    assert.equal(result.error.status, 429);
    assert.equal(result.error.retryAfterSeconds, 4);
  } finally { globalThis.fetch = original; }
});

test("vault upload and individual readiness parse actual main shapes without aggregate counts", () => {
  assert.equal(vaultUploadSchema.safeParse({ document_id: "doc", sha256: "hash", state: "PENDING", note: "Queued" }).success, true);
  assert.equal(vaultDocumentSchema.safeParse({ document_id: "doc", name: "Minutes.pdf", state: "INGESTED" }).success, true);
});

import { analyticsAllowed } from "../src/lib/analytics-policy";
test("private workspace and sign-in routes never participate in marketing analytics", () => {
  for (const path of ["/app", "/app/drafts/123", "/login", "/login/reset", null]) assert.equal(analyticsAllowed(path), false);
  assert.equal(analyticsAllowed("/product"), true);
});

test("matter history calls the scoped server verb and parses saved thread identities", async () => {
  const original = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /\/v2\/conversation\/list$/);
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ matter_id: "matter-1", conversations: [{ conversation_id: "thread-1", title: "Saved meeting research", matter_id: "matter-1" }] }));
  };
  try {
    const result = await new HttpGateway("http://127.0.0.1:8021", "test-key").conversationList("matter-1");
    assert.equal(result.ok, true);
    assert.deepEqual(sent, { matter_id: "matter-1", limit: "50" });
    if (result.ok && "conversations" in result.data) assert.equal(result.data.conversations[0].conversation_id, "thread-1");
    else throw new Error("saved matter history is unavailable");
  } finally { globalThis.fetch = original; }
});

test("reload keeps the excerpts from attached documents that the backend served", () => {
  const document_evidence = {
    schema: "document_evidence.v1", mode: "question", status: "EXCERPTS_FOUND", query: "resolutions",
    searched_document_ids: ["doc"], documents: [{ document_id: "doc", name: "route_agm_2025.pdf", sha256: "a".repeat(64), status: "SEARCHED", reason: null, total_chars: 100 }],
    passages: [{ id: "doc-1-10-40", document_id: "doc", name: "route_agm_2025.pdf", sha256: "a".repeat(64),
      start: 10, end: 10 + Array.from("Resolution(s) passed by Members").length, text: "Resolution(s) passed by Members" }],
    limitations: ["These excerpts have not been checked against law."],
  };
  const payload = conversationGetOkSchema.parse({ conversation: { conversation_id: "thread", title: "Q" }, messages: [
    { message_id: "user", ordinal: 1, role: "user", text: "What resolutions?", file_ids: ["doc"] },
    { message_id: "assistant", ordinal: 2, role: "assistant", text: "", envelope: { ...RECORDED.send_answered.envelope, status: "PARTIAL" },
      metadata: { ...metadata, document_evidence } },
  ] });
  const [turn] = conversationTurns("thread", payload.messages);
  if (turn.state?.phase !== "answered") throw new Error("missing answer");
  assert.equal(turn.state.documentEvidence?.passages[0].text, "Resolution(s) passed by Members");
  assert.deepEqual(turn.state.documentEvidence?.limitations, document_evidence.limitations);
});
