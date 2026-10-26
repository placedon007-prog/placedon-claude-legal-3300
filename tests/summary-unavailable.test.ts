import assert from "node:assert/strict";
import test from "node:test";
import { conversationGetOkSchema } from "../src/lib/gateway/types";
import { conversationTurns } from "../src/lib/conversation";
import { failedRegister } from "../src/lib/thread";
import RECORDED from "../src/lib/gateway/fixtures/conversation.json" with { type: "json" };

// The backend's text for this state (gateway/verbs.py _envelope_for), recorded verbatim.
const UNAVAILABLE_TEXT = "Document summarization is unavailable in this deployment. The permitted model provider refused access for this deployment's account. No summary was generated and your document is unchanged. Retrying will not help until an administrator restores access. This is not a finding about the document or the law.";
const envelope = { ...RECORDED.send_answered.envelope, status: "FAILED", bodies: [], citations: [],
  text_blocks: [{ text: UNAVAILABLE_TEXT, citation_ids: [] }] };

test("a reopened conversation keeps the summary-unavailable state from the turn's metadata", () => {
  const payload = conversationGetOkSchema.parse({ conversation: { conversation_id: "thread", title: "Q", matter_id: null }, messages: [
    { message_id: "u", ordinal: 1, role: "user", text: "Summarize this document", file_ids: ["doc"] },
    { message_id: "a", ordinal: 2, role: "assistant", text: "", envelope, metadata: { schema: "conversation_turn.v1",
      document_summary_unavailable: { reason: "PROVIDER_REFUSED_ACCESS", retryable: false } } },
  ] });
  const [turn] = conversationTurns("thread", payload.messages);
  if (turn.state?.phase !== "answered") throw new Error("missing answer");
  assert.deepEqual(turn.state.documentSummaryUnavailable, { reason: "PROVIDER_REFUSED_ACCESS", retryable: false });
});

test("a known access block is its own register with no retry; a transient failure stays retryable", () => {
  assert.deepEqual(failedRegister({ reason: "NO_PERMITTED_PROVIDER", retryable: false }),
    { title: "Document summarization unavailable", retryable: false });
  assert.deepEqual(failedRegister(undefined), { title: null, retryable: true });
  assert.deepEqual(failedRegister({ reason: "SOMETHING_NEW", retryable: true }), { title: null, retryable: true },
    "only an explicit non-retryable state removes the retry");
});
