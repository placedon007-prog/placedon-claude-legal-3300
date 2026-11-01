import assert from "node:assert/strict";
import { test } from "node:test";
import { stillQueued, waitedLabel } from "../src/lib/conversation";
import { summaryUnavailableLead } from "../src/lib/thread";

const queued = { phase: "queued" as const, conversationId: "c", runId: "r",
  note: "Preparing a structured summary from the selected documents.",
  progress: "Preparing a structured summary from the selected documents." };

test("a poll that finds the reply still queued keeps the server's progress line", () => {
  // Regression: the poll used to set note to "", wiping this line after about 4 s.
  assert.equal(stillQueued(queued).note, queued.progress);
});

test("a successful poll clears an earlier connection note and restores progress", () => {
  const interrupted = { ...queued, note: "Connection interrupted. Your saved request continues; reconnecting." };
  assert.equal(stillQueued(interrupted).note, queued.progress);
});

test("a reopened thread with no recorded progress shows no invented line", () => {
  assert.equal(stillQueued({ phase: "queued" as const, note: "" }).note, "");
});

test("the wait label counts seconds, then minutes, and never goes negative", () => {
  assert.equal(waitedLabel(0), "Waiting 0 s");
  assert.equal(waitedLabel(59_999), "Waiting 59 s");
  assert.equal(waitedLabel(60_000), "Waiting 1 min 00 s");
  assert.equal(waitedLabel(238_400), "Waiting 3 min 58 s");
  assert.equal(waitedLabel(-5_000), "Waiting 0 s");
});

test("each unavailable reason opens with a plain line that says nothing was changed", () => {
  for (const reason of ["NO_PERMITTED_PROVIDER", "PROVIDER_REFUSED_ACCESS", "SOMETHING_NEW", undefined]) {
    const lead = summaryUnavailableLead(reason);
    assert.match(lead, /unchanged\.$/, String(reason));
    assert.doesNotMatch(lead, /deployment|provider|administrator|India-region/i, `plain words for ${reason}`);
  }
  assert.notEqual(summaryUnavailableLead("NO_PERMITTED_PROVIDER"), summaryUnavailableLead("PROVIDER_REFUSED_ACCESS"));
});

test("a remounted workspace gets back the progress line and queue time the server does not store", async () => {
  // Regression: key "new" → conversation id remounts the workspace with server turns whose
  // note is "", which wiped the progress line about 1.5 s after sending.
  const { restoreQueued } = await import("../src/lib/conversation");
  const server = [
    { key: "msg-u1", question: "Q", state: { phase: "queued", conversationId: "c", runId: "run-1", note: "" } },
    { key: "req-2", question: "Q2", state: { phase: "answered" } },
  ];
  const memory = [{ key: "req-1", runId: "run-1", progress: "Preparing a structured summary.", queuedAt: 1000 }];
  const [first, second] = restoreQueued(server, memory);
  assert.deepEqual(first.state, { phase: "queued", conversationId: "c", runId: "run-1",
    note: "Preparing a structured summary.", progress: "Preparing a structured summary.", queuedAt: 1000 }, "matched by run id");
  assert.equal(second, server[1], "an answered turn is untouched");
  assert.equal(restoreQueued(server, [])[0], server[0], "nothing remembered: unchanged");
});

test("a queued reply with live steps carries them; an older backend's reply shows today's UI", async () => {
  const { conversationTurns } = await import("../src/lib/conversation");
  const { conversationMessageSchema } = await import("../src/lib/gateway/types");
  const user = { message_id: "u", ordinal: 0, role: "user" as const, text: "Q" };
  const steps = { current: "Searching the Companies Act", done: ["Understanding the question"] };
  const withSteps = conversationMessageSchema.parse({ message_id: "a", ordinal: 1, role: "assistant", text: "", run_id: "r", envelope: null, progress: steps });
  const old = conversationMessageSchema.parse({ message_id: "a", ordinal: 1, role: "assistant", text: "", run_id: "r", envelope: null });
  assert.deepEqual((conversationTurns("c", [user, withSteps])[0].state as { steps?: unknown }).steps, steps);
  assert.equal("steps" in (conversationTurns("c", [user, old])[0].state as object), false, "no progress field: no checklist");
});

test("a poll replaces the steps with fresh ones and keeps the last known ones otherwise", () => {
  const first = { current: "Understanding the question", done: [] };
  const next = { current: "Writing the answer", done: ["Understanding the question", "Searching the Companies Act"] };
  const shown = stillQueued({ ...queued, steps: first }, next);
  assert.deepEqual(shown.steps, next);
  assert.equal(shown.note, queued.progress);
  assert.deepEqual(stillQueued({ ...queued, steps: first }).steps, first);
  assert.equal("steps" in stillQueued(queued), false);
});

test("demo mode: a 'slow demo' question advances through the steps, then answers", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  const { MockGateway } = await import("../src/lib/gateway/mock");
  const mock = new MockGateway();
  const sent = await mock.conversationSend({ text: "slow demo: when must an AGM be held?", requestId: "slow-demo-req-1" });
  assert.ok(sent.ok && !("code" in sent.data && sent.data.code));
  const cid = (sent.data as { conversation_id: string }).conversation_id;
  assert.equal((sent.data as { envelope: unknown }).envelope, null, "queued, not answered");
  const reply = async () => {
    const got = await mock.conversationGet(cid);
    assert.ok(got.ok && "messages" in got.data);
    return got.data.messages[1];
  };
  assert.deepEqual((await reply()).progress, { current: "Understanding the question", done: [] });
  t.mock.timers.tick(6_500);
  assert.deepEqual((await reply()).progress, { current: "Writing the answer", done: ["Understanding the question", "Searching the Companies Act"] });
  t.mock.timers.tick(6_000);
  const done = await reply();
  assert.ok(done.envelope, "the recorded answer arrives");
  assert.equal(done.progress, undefined);
});
