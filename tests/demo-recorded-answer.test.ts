import assert from "node:assert/strict";
import test from "node:test";
import { MockGateway } from "../src/lib/gateway/mock";
import { parseAnswer } from "../src/lib/gateway/types";

async function notice(text: string) {
  const r = await new MockGateway().conversationSend({ text });
  assert.ok(r.ok && "envelope" in r.data);
  return parseAnswer(r.data.envelope?.text_blocks[0]?.text ?? "");
}

test("demo answers only the recorded AGM question; any other question is told it sees another question's recording", async () => {
  const off = await notice("What is the quorum for a board meeting?");
  assert.match(off.notice ?? "", /^Demo: no recorded answer for your question\. Showing a recorded answer to: “What is the time limit for holding an annual general meeting”$/);
  assert.equal(off.sentences.length, 2, "the recorded statutory text is still served, unchanged");

  const agm = await notice("What is the time limit for holding an annual general meeting?");
  assert.equal(agm.notice, null);
  assert.deepEqual(agm.sentences, off.sentences);
});
