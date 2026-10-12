import test from "node:test";
import assert from "node:assert/strict";
import SNAPSHOT from "../src/lib/gateway/fixtures/backend-conversation-v1.json" with { type: "json" };
import { conversationGetOkSchema, conversationSendOkSchema, sourcesListSchema } from "../src/lib/gateway/types";
import { conversationTurns } from "../src/lib/conversation";

test("actual backend HTTP queued completion and retry parse without losing partial outcome", () => {
  const queued = conversationSendOkSchema.parse(SNAPSHOT.queued);
  const completed = conversationGetOkSchema.parse(SNAPSHOT.completed);
  const replayed = conversationSendOkSchema.parse(SNAPSHOT.replayed);
  assert.equal(queued.envelope, null);
  assert.equal(replayed.message_id, queued.message_id);
  assert.equal(replayed.envelope?.status, "PARTIAL");
  const turns = conversationTurns(queued.conversation_id, completed.messages);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].state?.phase, "answered");
  if (turns[0].state?.phase !== "answered") throw new Error("expected completed turn");
  assert.equal(turns[0].state.envelope.status, "PARTIAL");
  assert.equal(turns[0].state.sources?.report[0].outcome, "SEARCHED_HITS");
});

test("actual backend HTTP source picker retains provider IDs", () => {
  const sources = sourcesListSchema.parse(SNAPSHOT.sources);
  assert.ok(sources.bodies.some((source) => source.id === "held"));
  assert.ok(sources.bodies.some((source) => source.id === "vault"));
  assert.ok(sources.bodies.every((source) => source.id !== "CA2013"));
});
