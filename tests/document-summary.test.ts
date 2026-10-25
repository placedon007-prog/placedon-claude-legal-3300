import test from "node:test";
import assert from "node:assert/strict";
import { documentSummarySchema, turnMetadataSchema } from "../src/lib/gateway/types";
import { conversationTurns } from "../src/lib/conversation";
import { shouldRenderDocumentSummary } from "../src/lib/document-summary";

const hash = "a".repeat(64);
const base = {
  schema: "document_summary.v1" as const,
  status: "SUMMARY_DRAFT_READY" as const,
  sections: [{ heading: "Obligations" as const, items: [{
    text: "Payment is due within 30 days.", passage_ids: ["doc-1-0-30"], quotes: [{
      passage_id: "doc-1-0-30", document_id: "file-1", document_name: "Agreement.pdf",
      sha256: hash, start: 0, end: 30, quote: "Payment is due within 30 days.",
    }],
  }] }],
  coverage: [{ document_id: "file-1", name: "Agreement.pdf", sha256: hash,
    total_chars: 30, total_passages: 1, shown_passages: 1, excerpt_chars: 30, excerpt_coverage_ratio: 1 }],
  withheld_items: 0,
  limitations: ["Review against the original."],
};

test("accepts a source-linked summary and its coverage", () => {
  assert.equal(documentSummarySchema.parse(base).status, "SUMMARY_DRAFT_READY");
});

test("rejects unknown documents, hashes, ranges, and detached passage references", () => {
  assert.equal(documentSummarySchema.safeParse({ ...base, sections: [{ heading: "Obligations", items: [{
    ...base.sections[0].items[0], passage_ids: ["invented"],
  }] }] }).success, false);
  assert.equal(documentSummarySchema.safeParse({ ...base, sections: [{ heading: "Obligations", items: [{
    ...base.sections[0].items[0], quotes: [{ ...base.sections[0].items[0].quotes[0], sha256: "b".repeat(64) }],
  }] }] }).success, false);
  assert.equal(documentSummarySchema.safeParse({ ...base, coverage: [{ ...base.coverage[0], excerpt_chars: 10 }] }).success, false);
});

test("rejects duplicate coverage rows and passage IDs without a rendered quote", () => {
  assert.equal(documentSummarySchema.safeParse({ ...base,
    coverage: [base.coverage[0], base.coverage[0]],
  }).success, false);
  assert.equal(documentSummarySchema.safeParse({ ...base, sections: [{ heading: "Obligations", items: [{
    ...base.sections[0].items[0], passage_ids: ["doc-1-0-30", "doc-1-30-50"],
  }] }] }).success, false);
  assert.equal(documentSummarySchema.safeParse({ ...base, sections: [
    base.sections[0], base.sections[0],
  ] }).success, false);
});

test("summary remains optional for older saved messages and loads from conversation metadata", () => {
  const old = turnMetadataSchema.parse({ schema: "conversation_turn.v1", artifacts: [], files: [] });
  assert.equal(old.document_summary, undefined);
  const turns = conversationTurns("conversation-1", [
    { message_id: "user-1", ordinal: 0, role: "user", text: "Summarize this document" },
    { message_id: "assistant-1", ordinal: 1, role: "assistant", text: "", run_id: "run-1",
      envelope: { schema: "answer_envelope.v1", status: "PARTIAL", task: "RESEARCH_QUESTION", as_of: "2026-10-24",
        text_blocks: [{ text: "Summary prepared", citation_ids: [] }], bodies: [], citations: [], files: [] },
      metadata: { schema: "conversation_turn.v1", artifacts: [], files: [], document_summary: base } },
  ]);
  assert.equal(turns[0].state?.phase, "answered");
  if (turns[0].state?.phase === "answered") assert.equal(turns[0].state.documentSummary?.coverage[0].name, "Agreement.pdf");
});

test("summary render gate excludes failed states, non-research tasks, and case answers", () => {
  assert.equal(shouldRenderDocumentSummary(base, { task: "RESEARCH_QUESTION", status: "PARTIAL", resource: "statute" }), true);
  assert.equal(shouldRenderDocumentSummary(base, { task: "RESEARCH_QUESTION", status: "FAILED", resource: "statute" }), false);
  assert.equal(shouldRenderDocumentSummary(base, { task: "CASE_LOOKUP", status: "PARTIAL", resource: "statute" }), false);
  assert.equal(shouldRenderDocumentSummary(base, { task: "RESEARCH_QUESTION", status: "PARTIAL", resource: "case" }), false);
  assert.equal(shouldRenderDocumentSummary(undefined, { task: "RESEARCH_QUESTION", status: "PARTIAL", resource: "statute" }), false);
});
