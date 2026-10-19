import assert from "node:assert/strict";
import test from "node:test";
import { conversationGetOkSchema, conversationSendOkSchema, documentEvidenceSchema } from "../src/lib/gateway/types";
import { conversationTurns } from "../src/lib/conversation";
import { HttpGateway } from "../src/lib/gateway/http";
import RECORDED from "../src/lib/gateway/fixtures/conversation.json" with { type: "json" };

const quote = "Payment is due in 30 days. 📄";
const evidence = {
  schema: "document_evidence.v1", mode: "question", status: "EXCERPTS_FOUND", query: "When is payment due?",
  searched_document_ids: ["doc-1"],
  documents: [{ document_id: "doc-1", name: "Terms.txt", sha256: "a".repeat(64), status: "SEARCHED", reason: null, total_chars: 100 }],
  passages: [{ id: "passage-1", document_id: "doc-1", name: "Terms.txt", sha256: "a".repeat(64), start: 10, end: 10 + [...quote].length, text: quote }],
  limitations: ["Exact excerpts from uploaded text, not legal authority."],
};
const envelope = { ...RECORDED.send_answered.envelope, status: "PARTIAL", citations: [], text_blocks: [] };

test("document evidence survives both immediate response and reopening without becoming statute citations", () => {
  const sent = conversationSendOkSchema.parse({ conversation_id: "thread", message_id: "reply", envelope, document_evidence: evidence });
  assert.deepEqual(sent.document_evidence, evidence);
  const saved = conversationGetOkSchema.parse({ conversation: { conversation_id: "thread", title: "Payment" }, messages: [
    { message_id: "user", role: "user", ordinal: 0, text: evidence.query },
    { message_id: "reply", role: "assistant", ordinal: 1, text: "", envelope, metadata: { schema: "conversation_turn.v1", document_evidence: evidence } },
  ] });
  const state = conversationTurns("thread", saved.messages)[0].state;
  assert.equal(state?.phase, "answered");
  if (state?.phase !== "answered") throw new Error("missing answer");
  assert.deepEqual(state.documentEvidence, evidence);
  assert.equal(state.envelope.citations.length, 0);
});

test("document evidence rejects malformed anchors and unbounded or inconsistent payloads", () => {
  const passage = evidence.passages[0];
  for (const invalid of [
    { ...evidence, passages: [{ ...passage, end: passage.end + 1 }] },
    { ...evidence, passages: [{ ...passage, document_id: "unlisted" }] },
    { ...evidence, passages: [{ ...passage, sha256: "b".repeat(64) }] },
    { ...evidence, passages: [{ ...passage, start: -1 }] },
    { ...evidence, passages: Array(9).fill(passage) },
    { ...evidence, documents: Array(21).fill(evidence.documents[0]) },
    { ...evidence, status: "NO_MATCH" },
    { ...evidence, passages: [] },
  ]) assert.equal(documentEvidenceSchema.safeParse(invalid).success, false);
  assert.equal(documentEvidenceSchema.safeParse(evidence).success, true, "offsets use Unicode code points, not UTF-16 units");
});

test("search outcome requires consistent recorded document coverage", () => {
  for (const invalid of [
    { ...evidence, status: "NO_MATCH", passages: [], searched_document_ids: [], documents: [] },
    { ...evidence, status: "UNAVAILABLE", passages: [] },
    { ...evidence, status: "NOT_SEARCHED", passages: [] },
    { ...evidence, status: "NO_MATCH", passages: [], searched_document_ids: [] },
    { ...evidence, status: "NO_MATCH", passages: [], documents: [{ ...evidence.documents[0], sha256: null }] },
    { ...evidence, status: "NO_MATCH", passages: [], documents: [{ ...evidence.documents[0], total_chars: null }] },
    { ...evidence, status: "NO_MATCH", passages: [], documents: [{ ...evidence.documents[0], total_chars: 200001 }] },
  ]) assert.equal(documentEvidenceSchema.safeParse(invalid).success, false);
});

test("no match, unreadable and not searched stay distinct from excerpt results", () => {
  for (const status of ["NO_MATCH", "UNAVAILABLE", "NOT_SEARCHED"]) {
    const payload = { ...evidence, status, passages: [], searched_document_ids: status === "NO_MATCH" ? ["doc-1"] : [], documents: [{ ...evidence.documents[0], status: status === "NO_MATCH" ? "SEARCHED" : status, reason: "No passage available." }] };
    assert.equal(documentEvidenceSchema.parse(payload).status, status);
  }
});

test("invalid document evidence is a response contract failure, never an empty answer", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ conversation_id: "thread", message_id: "reply", envelope, document_evidence: { ...evidence, passages: [{ ...evidence.passages[0], end: 0 }] } }));
  try {
    const result = await new HttpGateway("http://127.0.0.1:8021", "test-key").conversationSend({ text: evidence.query, requestId: "evidence-test" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "schema_mismatch");
  } finally { globalThis.fetch = original; }
});

import { documentEvidenceExplanation, documentEvidenceLabel } from "../src/lib/document-evidence";
test("document presentation distinguishes selected excerpts, no matches, and unavailable text", () => {
  const parsed = documentEvidenceSchema.parse(evidence);
  assert.match(documentEvidenceLabel(parsed), /matching your question/);
  assert.match(documentEvidenceExplanation(parsed), /may not answer/);
  assert.match(documentEvidenceExplanation({ ...parsed, mode: "overview" }), /not a complete summary/);
  const states = ["NO_MATCH", "UNAVAILABLE", "NOT_SEARCHED"] as const;
  assert.equal(new Set(states.map((status) => documentEvidenceLabel({ ...parsed, status }))).size, 3);
});

import { requiresDocumentSource } from "../src/lib/document-evidence";
test("document research requests require visible vault selection while other tasks retain their flow", () => {
  assert.equal(requiresDocumentSource("research", 1, ["held"]), true);
  assert.equal(requiresDocumentSource("research", 1, ["held", "vault"]), false);
  assert.equal(requiresDocumentSource("research", 0, ["held"]), false);
  assert.equal(requiresDocumentSource("draft", 1, ["held"]), false);
  assert.equal(requiresDocumentSource("web", 1, ["held"]), false);
});
