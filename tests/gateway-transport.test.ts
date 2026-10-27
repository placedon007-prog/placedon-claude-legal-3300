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
      drafts: [], next_cursor: null, scope: "author", note: "metadata only",
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

test("the exact draft.list body the live gateway returns parses (recorded 2026-10-25, after 028)", async () => {
  const { draftListSchema } = await import("../src/lib/gateway/types");
  const live = { drafts: [{ draft_id: "cd914491-beac-4644-9c1e-c0fa99d13859", kind: "unknown",
    title: "Board resolution (synthetic)", updated_at: "2026-10-25T23:33:08.926539+05:30", version: 1,
    blocking_count: 1, approved: false, actor_id: "4cdac3f7-474a-4a30-802b-e12d6ef27b79", matter_id: null }],
    next_cursor: null, scope: "author", note: "Titles and review state of your drafts. Draft text is not included." };
  assert.equal(draftListSchema.safeParse(live).success, true);
});

test("a 401 on a person's session ends that session instead of blaming the API key", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: "unauthorized" }), { status: 401 });
  let ended = 0;
  try {
    const gw = new HttpGateway("http://localhost:8021", "session-token", { onUnauthorized: () => { ended += 1; } });
    const result = await gw.conversationSend(request);
    assert.equal(ended, 1, "the session-ended hook runs");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error.message, /session has ended/i);
    const keyed = await new HttpGateway("http://localhost:8021", "fixture-key").conversationSend(request);
    if (!keyed.ok) assert.match(keyed.error.message, /API key/, "the deployment-key wording stays for passcode mode");
  } finally { globalThis.fetch = original; }
});

test("signing out revokes the session at the gateway, with the person's own token", async () => {
  const original = globalThis.fetch;
  const seen: { url: string; auth: string | null }[] = [];
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), auth: new Headers(init?.headers).get("authorization") });
    return new Response(JSON.stringify({ status: "ok", revoked: true }), { status: 200 });
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "session-token").authLogout();
    assert.equal(result.ok, true);
    assert.deepEqual(seen, [{ url: "http://localhost:8021/v2/auth/logout", auth: "Bearer session-token" }]);
  } finally { globalThis.fetch = original; }
});

test("contract review sends no test_data, and a region refusal is data, not a schema failure", async () => {
  const original = globalThis.fetch;
  let sent: Record<string, unknown> = {};
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return Response.json({ status: "REFUSED", code: "NOT_PERMITTED", detail: "Nothing was sent." });
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").reviewContract({ text: "A client contract." });
    assert.equal("test_data" in sent, false, "the browser cannot attest that a document is a fixture");
    assert.ok(result.ok);
    assert.deepEqual(result.data, { status: "REFUSED", code: "NOT_PERMITTED", detail: "Nothing was sent." });
  } finally { globalThis.fetch = original; }
});

test("a draft CONFLICT (409) keeps its typed versions, so it is recognised as a conflict", async () => {
  const { isConflict } = await import("../src/lib/gateway/types");
  const original = globalThis.fetch;
  // The exact shape gateway/verbs.py `_draft_revise` returns when base_version is stale.
  globalThis.fetch = async () => Response.json({
    status: "REFUSED", code: "CONFLICT",
    detail: "this revision was based on version 1, but the draft is now at version 2.",
    draft_id: "11111111-1111-4111-8111-111111111111", base_version: 1, latest_version: 2,
  }, { status: 409 });
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").draftRevise({
      draftId: "11111111-1111-4111-8111-111111111111", baseVersion: 1, body: "my edit",
    });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("a 409 refusal is a product state, not a transport failure");
    assert.ok(isConflict(result.data), "the typed conflict survives the HTTP layer");
    assert.equal((result.data as { latest_version: number }).latest_version, 2);
  } finally { globalThis.fetch = original; }
});
