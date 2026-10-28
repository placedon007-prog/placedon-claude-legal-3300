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
