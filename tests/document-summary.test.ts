import { test } from "node:test";
import assert from "node:assert/strict";
import { documentSummarySchema, turnMetadataSchema } from "../src/lib/gateway/types";
import { documentTypeLabel, passageLocation } from "../src/lib/document-location";

// The backend's own shape (gateway/document_summary.parse), synthetic content.
const SUMMARY = {
  schema: "document_summary.v1", status: "SUMMARY_DRAFT_READY", withheld_items: 1,
  sections: [
    { heading: "Parties", items: [{ text: "Kestrel Analytics is the provider.", basis: "QUOTED",
      passage_ids: ["doc-1-0-80"], quotes: [{ passage_id: "doc-1-0-80", quote: "Kestrel Analytics Private Limited",
        document_id: "d1", document_name: "sa.pdf", sha256: "a".repeat(64), start: 0, end: 80, page: 1 }] }] },
    { heading: "Questions the document leaves open", items: [{ text: "Which law governs this agreement?",
      basis: "NOT_STATED_IN_DOCUMENT", passage_ids: [], quotes: [] }] },
  ],
  coverage: [{ document_id: "d1", name: "sa.pdf", doc_class: "services_agreement", class_reason: "matched",
    sha256: "a".repeat(64), total_chars: 900, total_passages: 4, shown_passages: 4, excerpt_chars: 900,
    excerpt_coverage_ratio: 1 }],
  limitations: ["Page numbers come from the page breaks in the uploaded text layer."],
};

test("the backend's summary parses, and rides the turn metadata", () => {
  const parsed = documentSummarySchema.parse(SUMMARY);
  assert.equal(parsed.sections[0].items[0].quotes[0].page, 1);
  assert.equal(parsed.sections[1].items[0].basis, "NOT_STATED_IN_DOCUMENT");
  const meta = turnMetadataSchema.parse({ schema: "conversation_turn.v1", document_summary: SUMMARY });
  assert.equal(meta.document_summary?.coverage[0].doc_class, "services_agreement");
});

test("a location names the page only when the PDF text carried one", () => {
  assert.equal(passageLocation({ start: 10, end: 42, page: 2 }), "p. 2 · chars 10–42");
  assert.equal(passageLocation({ start: 10, end: 42, page: null }), "chars 10–42");
  assert.equal(passageLocation({ start: 10, end: 42 }), "chars 10–42");
});

test("the document type is the rules class in words, and unknown says why", () => {
  assert.equal(documentTypeLabel("share_purchase_agreement"), "share purchase agreement");
  assert.equal(documentTypeLabel("unknown"), "unknown — no rule matched");
  assert.equal(documentTypeLabel(null), "not classified");
});
