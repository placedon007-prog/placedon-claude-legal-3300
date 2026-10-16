import assert from "node:assert/strict";
import test from "node:test";
import type { Turn } from "../src/app/app/answer";
import type { Envelope } from "../src/lib/gateway/types";
import { envelopeSchema } from "../src/lib/gateway/types";
import { draftableAnswerKey } from "../src/lib/draft-source";
import RECORDED from "../src/lib/gateway/fixtures/conversation.json" with { type: "json" };

const recorded = envelopeSchema.parse(RECORDED.send_answered.envelope);
function answer(key: string, overrides: Partial<Envelope> = {}): Turn {
  return { key, question: key, state: { phase: "answered", conversationId: "thread",
    envelope: { ...recorded, task: "RESEARCH_QUESTION", status: "ANSWERED", run_id: key, ...overrides },
    draftId: null, code: null, region: null } };
}

test("only the newest backend source may supply the cited-answer draft action", () => {
  const first = answer("cited-A");
  assert.ok(recorded.citations.length > 0);
  assert.equal(draftableAnswerKey([first]), "cited-A");
  for (const status of ["ABSTAINED", "PARTIAL", "FAILED"] as const) {
    assert.equal(draftableAnswerKey([first, answer("newer-B", { status })]), undefined);
  }
  assert.equal(draftableAnswerKey([first, answer("newer-B", { citations: [] })]), undefined);
  assert.equal(draftableAnswerKey([first, answer("newer-B", { resource: "case" })]), undefined);
  assert.equal(draftableAnswerKey([first, answer("review-B", { task: "REVIEW_CONTRACT" })]), undefined);
  assert.equal(draftableAnswerKey([first, answer("cited-B")]), "cited-B");
});

test("non-source tasks and public research do not replace the gateway source", () => {
  const first = answer("cited-A");
  assert.equal(draftableAnswerKey([first, answer("draft-B", { task: "DRAFT" })]), "cited-A");
  assert.equal(draftableAnswerKey([first, { key: "web", question: "latest case", state: null,
    web: { state: null, mode: "CASE_DISCOVERY" } }]), "cited-A");
  assert.equal(draftableAnswerKey([answer("draft-only", { task: "DRAFT" })]), undefined);
});

test("unresolved gateway requests hide drafting until the source is known", () => {
  const first = answer("cited-A");
  assert.equal(draftableAnswerKey([first, { key: "sending", question: "question", state: null }]), undefined);
  assert.equal(draftableAnswerKey([first, { key: "queued", question: "question", state: {
    phase: "queued", conversationId: "thread", runId: "pending-run", note: "" } }]), undefined);
});
