import assert from "node:assert/strict";
import test from "node:test";

import { conversationSendOkSchema, parseAnswer } from "../src/lib/gateway/types";
import { envelopeKind, isNothingTraced, linkCitations } from "../src/lib/thread";
import NO_MODEL from "../src/lib/gateway/fixtures/conversation-no-model.json" with { type: "json" };
import NOTHING_TRACED from "../src/lib/gateway/fixtures/conversation-nothing-traced.json" with { type: "json" };
import NO_EVIDENCE from "../src/lib/gateway/fixtures/conversation-no-evidence.json" with { type: "json" };

// Each fixture is a verbatim conversation.send response from the #94 gateway. These assert
// the inputs the Answered component renders from — the register, the openable provisions,
// the messages — not the JSX, which the live screenshots cover.

test("NO_MODEL renders the FAILED register, not a finding about the law", () => {
  const sent = conversationSendOkSchema.parse(NO_MODEL);
  assert.equal(sent.code, "NO_MODEL");
  const env = sent.envelope!;
  // FAILED is the dashed transport register — StatusLine "Did not arrive — this is not a refusal".
  assert.equal(envelopeKind(env.status), "failed");
  assert.equal(isNothingTraced(envelopeKind(env.status), sent.code), false);
  // The FAILED branch renders every text_block verbatim; it must carry the distinct register.
  const text = env.text_blocks.map((b) => b.text).join(" ");
  assert.match(text, /model was unavailable/i);
  assert.match(text, /not a finding about the law/i);
  assert.match(text, /try again/i);
  // No held body claiming nothing answers — no model evaluated the law.
  assert.equal(env.bodies.length, 0);
});

test("NOTHING_TRACED shows the message and the retrieved provisions as openable sources", () => {
  const sent = conversationSendOkSchema.parse(NOTHING_TRACED);
  assert.equal(sent.code, "NOTHING_TRACED");
  const env = sent.envelope!;
  assert.equal(envelopeKind(env.status), "refused");
  assert.equal(isNothingTraced(envelopeKind(env.status), sent.code), true);

  const [first] = env.text_blocks;
  assert.match(first.text, /[Rr]elevant provisions were found/);
  assert.match(first.text, /no sentence could be traced/);

  // The provision text was not traced to a sentence, yet it must still render as an
  // openable group — linkCitations surfaces citations no sentence names.
  const parsed = parseAnswer(first.text);
  assert.equal(parsed.sentences.length, 0, "the explanation is plain prose, not cited sentences");
  const { groups } = linkCitations(parsed.sentences, env.citations);
  assert.ok(groups.length >= 1, "retrieved provisions surface as source groups");
  for (const g of groups) {
    assert.ok(g.section, "each provision shows its section number (opens via citation.get)");
    for (const c of g.citations) {
      assert.ok(c.id, "a citation id is required to call citation.get");
      assert.ok((c.quote ?? "").trim().length > 0, "the verbatim provision text is served, not model prose");
    }
  }
  // The held body explains the shortfall, not "nothing on point was found".
  const notes = env.bodies.map((b) => b.note ?? "").join(" ");
  assert.match(notes, /no sentence could be traced/);
  assert.doesNotMatch(notes, /nothing on point was found/);
});

test("NO_EVIDENCE is unchanged: nothing on point was found, no provisions, not NOTHING_TRACED", () => {
  const sent = conversationSendOkSchema.parse(NO_EVIDENCE);
  assert.equal(sent.code, "NO_EVIDENCE");
  const env = sent.envelope!;
  assert.equal(envelopeKind(env.status), "refused");
  assert.equal(isNothingTraced(envelopeKind(env.status), sent.code), false);
  assert.equal(env.citations.length, 0, "no provisions were retrieved");
  const notes = env.bodies.map((b) => b.note ?? "").join(" ");
  assert.match(notes, /nothing on point was found/);
});
