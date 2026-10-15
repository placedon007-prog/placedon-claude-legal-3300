import assert from "node:assert/strict";
import test from "node:test";

import { conversationSendOkSchema, envelopeSchema, sourceReportSchema } from "../src/lib/gateway/types";
import { isCaseAnswer, toCaseAnswerRenderModel } from "../src/lib/case-answer";
import RECORDED from "../src/lib/gateway/fixtures/conversation.json" with { type: "json" };

// These assert the render model `answer.tsx` builds from — the inputs the case-routed
// branch renders — not the JSX. Composed to the PLAN_12 contract, like
// `SOURCES_SEARCH_FIXTURE` in mock.ts: this backend path does not exist on any gateway this
// repo has run against, so there is no live reply to record. The judgment is the same real
// TCS v. Cyrus Investments matter the rest of this repo's case-law fixtures use.

const JUDGMENT = {
  source_id: "aws_sc_judgments" as const,
  title: "Tata Consultancy Services Limited v. Cyrus Investments Pvt. Ltd. & Ors.",
  parties: ["Tata Consultancy Services Limited", "Cyrus Investments Pvt. Ltd."],
  year: 2021,
  date: "2021-03-26",
  court: "Supreme Court of India",
  s3_key: "aws_sc_judgments/2021/tata-consultancy-services-v-cyrus-investments.pdf",
  tier: "LICENSED" as const,
};

const CASE_FOUND = envelopeSchema.parse({
  schema: "answer_envelope.v1",
  status: "PARTIAL",
  task: "RESEARCH_QUESTION",
  as_of: "2026-10-15",
  resource: "case",
  text_blocks: [{ text: "Found 1 judgment that may bear on this question.", citation_ids: [] }],
  bodies: [{ body_id: "CA2013", name: "Companies Act, 2013", status: "NOT_ENGAGED", note: "this question asks about decided cases, not the statute" }],
  citations: [],
  judgments: [JUDGMENT],
  files: [],
});

const CASE_EMPTY = envelopeSchema.parse({
  schema: "answer_envelope.v1",
  status: "ABSTAINED",
  task: "RESEARCH_QUESTION",
  as_of: "2026-10-15",
  resource: "case",
  text_blocks: [{
    text: "Searched the Supreme Court and High Court judgment collections for this question. No judgment matched. The Companies Act 2013 was not searched for this question — it does not hold decided cases.",
    citation_ids: [],
  }],
  bodies: [{ body_id: "CA2013", name: "Companies Act, 2013", status: "NOT_ENGAGED", note: "this question asks about decided cases, not the statute" }],
  citations: [],
  judgments: [],
  files: [],
});

test("a case-routed answer carries judgments as LICENSED supporting authority, with no quote", () => {
  assert.equal(isCaseAnswer(CASE_FOUND), true);
  const model = toCaseAnswerRenderModel(CASE_FOUND);
  assert.equal(model.hits.length, 1);
  const hit = model.hits[0];
  assert.match(hit.title, /Tata Consultancy Services.*Cyrus Investments/);
  assert.equal(hit.tier, "LICENSED");
  assert.equal(hit.quote, null, "discovery never carries a quote, even riding on an answer");
  assert.equal(hit.year, 2021);
  assert.deepEqual(hit.parties, JUDGMENT.parties);
  // citations stay empty by contract: a case answer verifies nothing itself.
  assert.equal(CASE_FOUND.citations.length, 0);
  // The statute is reported NOT_ENGAGED, never "nothing found".
  assert.equal(CASE_FOUND.bodies[0].status, "NOT_ENGAGED");
});

test("the honest-empty case abstains with a message distinct from the statute abstain — no judgments, not a dead end", () => {
  assert.equal(isCaseAnswer(CASE_EMPTY), true);
  assert.equal(CASE_EMPTY.status, "ABSTAINED");
  const model = toCaseAnswerRenderModel(CASE_EMPTY);
  assert.deepEqual(model.hits, []);
  const text = CASE_EMPTY.text_blocks[0].text;
  // The message names what was actually searched (the judgment index), not the statute —
  // this is the sentence that must render instead of the generic "Not answered" register.
  assert.match(text, /judgment/i);
  assert.match(text, /Companies Act 2013 was not searched/i);
  assert.equal(CASE_EMPTY.bodies[0].status, "NOT_ENGAGED");
});

test("a statute answer is unchanged: no resource, no judgments, isCaseAnswer is false", () => {
  const sent = conversationSendOkSchema.parse(RECORDED.send_answered);
  const envelope = sent.envelope!;
  assert.equal(envelope.resource, undefined);
  assert.equal(isCaseAnswer(envelope), false);
  const model = toCaseAnswerRenderModel(envelope);
  assert.deepEqual(model.hits, [], "a statute envelope carries no judgments to render");
});

test("judgments riding the sources sibling are read when the envelope itself carries none", () => {
  const sources = sourceReportSchema.parse({
    picked: ["held"],
    searched: ["held"],
    report: [],
    judgments: [JUDGMENT],
  });
  const envelopeWithoutJudgments = envelopeSchema.parse({ ...CASE_FOUND, judgments: undefined });
  const model = toCaseAnswerRenderModel(envelopeWithoutJudgments, sources);
  assert.equal(model.hits.length, 1);
  assert.equal(model.hits[0].tier, "LICENSED");
});
