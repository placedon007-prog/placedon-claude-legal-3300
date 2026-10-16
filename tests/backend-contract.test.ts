import test from "node:test";
import assert from "node:assert/strict";
import SNAPSHOT from "../src/lib/gateway/fixtures/backend-conversation-v1.json" with { type: "json" };
import { conversationGetOkSchema, conversationSendOkSchema, sourcesListSchema, webResearchSchema } from "../src/lib/gateway/types";
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

test("web-research outcomes keep provider setup, ambiguity and citations distinct", () => {
  const unavailable = webResearchSchema.parse({
    status: "NOT_CONFIGURED", provider: "exa", queried_at: null, answer: null,
    citations: [], message: "provider setup required",
  });
  assert.equal(unavailable.status, "NOT_CONFIGURED");
  const ambiguous = webResearchSchema.parse({
    status: "NEEDS_CASE_DETAILS", provider: "exa", queried_at: null, answer: null,
    citations: [], message: "identify the court and case",
    portals: [{ label: "High Court case status", url: "https://hcservices.ecourts.gov.in/hcservices/" }],
  });
  assert.equal(ambiguous.status, "NEEDS_CASE_DETAILS");
  const answer = webResearchSchema.parse({
    status: "ANSWERED", provider: "exa", queried_at: "2026-10-16T00:00:00+00:00",
    answer: "Public web summary.", note: "Not verified law.",
    citations: [{ title: "Source", url: "https://example.org/page", domain: "example.org",
      published_at: null, author: null, excerpt: "Relevant passage." }],
  });
  assert.equal(answer.citations?.[0].domain, "example.org");
  assert.throws(() => webResearchSchema.parse({
    status: "ANSWERED", answer: "Claim with a non-HTTPS citation.",
    citations: [{ title: "Unsafe", url: "javascript:alert(1)", domain: "unknown",
      published_at: null, author: null, excerpt: "" }],
  }));
});
