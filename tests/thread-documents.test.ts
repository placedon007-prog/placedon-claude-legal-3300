import assert from "node:assert/strict";
import { test } from "node:test";
import { threadDocuments } from "../src/lib/thread-documents";

const contract = { document_id: "doc-1", name: "contract-3p.pdf" };

test("a reopened thread carries the documents its latest answer used", () => {
  // Regression: a follow-up sent no file_ids, so "the termination clause" was answered from
  // the Companies Act (Section 169) instead of the uploaded contract.
  const turns = [
    { state: { phase: "answered", documentSummary: { coverage: [contract] } } },
    { state: { phase: "answered", documentEvidence: { documents: [contract, { document_id: "doc-2", name: "letter.pdf" }] } } },
  ];
  assert.deepEqual(threadDocuments(turns), [{ id: "doc-1", name: "contract-3p.pdf" }, { id: "doc-2", name: "letter.pdf" }]);
});

test("a document named by both evidence and summary is carried once", () => {
  const turns = [{ state: { phase: "answered", documentEvidence: { documents: [contract] }, documentSummary: { coverage: [contract] } } }];
  assert.equal(threadDocuments(turns).length, 1);
});

test("the latest answered turn decides: a law-only last answer carries nothing", () => {
  const turns = [
    { state: { phase: "answered", documentSummary: { coverage: [contract] } } },
    { state: { phase: "answered" } },
  ];
  assert.deepEqual(threadDocuments(turns), []);
});

test("queued and failed turns are skipped; an empty thread carries nothing", () => {
  const turns = [
    { state: { phase: "answered", documentSummary: { coverage: [contract] } } },
    { state: { phase: "queued" } },
    { state: null },
  ];
  assert.deepEqual(threadDocuments(turns), [{ id: "doc-1", name: "contract-3p.pdf" }]);
  assert.deepEqual(threadDocuments([]), []);
});
