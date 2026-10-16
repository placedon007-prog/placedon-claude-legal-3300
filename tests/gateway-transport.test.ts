import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";

const request = { text: "What can be answered?", requestId: "transport-test-1" };

test("a body stream failure is returned as transport failure, never thrown or an abstention", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) { controller.error(new Error("socket closed")); },
  }));
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").conversationSend(request);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Interrupted body cannot be an answer");
    assert.equal(result.error.kind, "transport_error");
    assert.equal(result.error.route, "/v2/conversation/send");
    assert.ok(!result.error.message.includes("socket closed"), "internal transport details are not leaked");
  } finally { globalThis.fetch = original; }
});

test("the deadline still aborts a stalled response after headers have arrived", { timeout: 2000 }, async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => new Response(new ReadableStream({
    start(controller) {
      init?.signal?.addEventListener("abort", () => controller.error(new DOMException("deadline", "AbortError")), { once: true });
    },
  }));
  try {
    const pending = new HttpGateway("http://localhost:8021", "fixture-key").conversationSend(request);
    await Promise.resolve(); // fetch headers resolve; body remains open
    t.mock.timers.tick(120_000);
    const result = await pending;
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("A stalled body cannot be an answer");
    assert.equal(result.error.kind, "timeout");
  } finally { globalThis.fetch = original; }
});

test("a fully consumed response clears its deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const original = globalThis.fetch;
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, init) => {
    signal = init?.signal;
    return new Response(JSON.stringify({ conversation_id: "thread", message_id: "message", envelope: null }));
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").conversationSend(request);
    assert.equal(result.ok, true);
    t.mock.timers.tick(120_000);
    assert.equal(signal?.aborted, false);
  } finally { globalThis.fetch = original; }
});

test("draft inbox uses the generated tenant-scoped route and requests metadata only", async () => {
  const original = globalThis.fetch;
  let calledUrl = "";
  let calledBody = "";
  globalThis.fetch = async (url, init) => {
    calledUrl = String(url);
    calledBody = String(init?.body ?? "");
    return new Response(JSON.stringify({
      drafts: [], next_cursor: null, scope: "tenant", note: "metadata only",
    }));
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key")
      .draftList({ cursor: "opaque-cursor", limit: 12 });
    assert.ok(result.ok);
    assert.equal(calledUrl, "http://localhost:8021/v2/draft/list");
    assert.deepEqual(JSON.parse(calledBody), { cursor: "opaque-cursor", limit: "12" });
    assert.ok(result.data.drafts.length === 0);
  } finally { globalThis.fetch = original; }
});

test("public web research sends only the explicit query, mode and consent to its gateway route", async () => {
  const original = globalThis.fetch;
  let calledUrl = "";
  let calledBody = "";
  let calledHeaders: Headers | undefined;
  globalThis.fetch = async (url, init) => {
    calledUrl = String(url);
    calledBody = String(init?.body ?? "");
    calledHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify({
      status: "NOT_CONFIGURED", provider: "exa", queried_at: null,
      answer: null, citations: [], message: "not configured",
    }));
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").researchWeb({
      query: "recent criminal judgments", mode: "CASE_DISCOVERY", externalSearchConsent: true,
    });
    assert.ok(result.ok);
    assert.equal(calledUrl, "http://localhost:8021/v2/research/web");
    assert.deepEqual(JSON.parse(calledBody), {
      query: "recent criminal judgments", mode: "CASE_DISCOVERY", external_search_consent: true,
    });
    assert.ok(!calledBody.includes("fixture-key"));
    assert.equal(calledHeaders?.get("Authorization"), "Bearer fixture-key");
  } finally { globalThis.fetch = original; }
});
