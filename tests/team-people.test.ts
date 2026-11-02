import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { MockGateway } from "../src/lib/gateway/mock";
import { invitesListSchema, isRefusal } from "../src/lib/gateway/types";
import { engineFail, engineOk } from "../src/lib/engine/errors";
import { teamList } from "../src/lib/team";
import { cancelInviteAction, inviteAction } from "../src/app/app/team/actions";

const INVITE = "22222222-2222-4222-8222-222222222222";
const gw = () => new HttpGateway("http://localhost:8021", "fixture-key");

async function withFetch<T>(reply: (url: string, body: unknown) => Response, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => reply(String(url), init?.body ? JSON.parse(String(init.body)) : null);
  try { return await run(); } finally { globalThis.fetch = original; }
}

async function demo<T>(fn: () => Promise<T>): Promise<T> {
  const keys = ["APP_PASSCODE", "APP_SESSION_SECRET", "PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"];
  const saved = keys.map((k) => process.env[k]);
  try {
    for (const k of keys) delete process.env[k];
    process.env.PLACEDON_DEMO_MODE = "true";
    return await fn();
  } finally {
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
}

test("people.list, invites.list and invites.cancel post to the paths rest_path() generates", async () => {
  const seen: Array<[string, unknown]> = [];
  await withFetch((url, body) => { seen.push([url.replace("http://localhost:8021", ""), body]); return Response.json({}); }, async () => {
    await gw().peopleList();
    await gw().invitesList();
    await gw().inviteCancel(INVITE);
  });
  assert.deepEqual(seen, [["/v2/people/list", {}], ["/v2/invites/list", {}], ["/v2/invites/cancel", { invite_id: INVITE }]]);
});

test("a pending invite never needs a token to parse, and a backend without the verb reads as unavailable", async () => {
  assert.ok(invitesListSchema.safeParse({ invites: [{ invite_id: "i", email: "a@firm.in", role: "viewer", expires_at: "2026-11-09" }] }).success);
  const missing = await withFetch(() => Response.json({ detail: "Not Found" }, { status: 404 }), () => gw().invitesList());
  assert.deepEqual(teamList(missing, (d) => d.invites), { state: "unavailable" });
});

test("teamList: ready, a 403 in words, and any other failure is an error, never an empty firm", () => {
  assert.deepEqual(teamList(engineOk({ people: [] }), (d) => d.people), { state: "ready", items: [] });
  const fail = (status?: number) => engineFail<{ people: never[] }>({ kind: "server_error", route: "/v2/people/list", status, message: "x" });
  const forbidden = teamList(fail(403), (d) => d.people);
  assert.ok(forbidden.state === "error" && /Only an admin/.test(forbidden.message));
  assert.equal(teamList(fail(500), (d) => d.people).state, "error");
  assert.equal(teamList(fail(undefined), (d) => d.people).state, "error");
});

test("cancelling: a bad id is refused before the gateway; no session means no call", async () => {
  await demo(async () => {
    assert.deepEqual(await cancelInviteAction({ inviteId: "../x" }), { ok: false, message: "That is not an invite id." });
  });
  let calls = 0;
  await withFetch(() => { calls += 1; return new Response("no", { status: 500 }); }, async () => {
    const saved = { ...process.env };
    try {
      process.env.GATEWAY_URL = "http://gateway.invalid";
      process.env.PLACEDON_GATEWAY_KEY = "test-key-that-is-not-a-secret";
      delete process.env.PLACEDON_DEMO_MODE; delete process.env.APP_PASSCODE; delete process.env.APP_SESSION_SECRET;
      const r = await cancelInviteAction({ inviteId: INVITE });
      assert.ok(!r.ok && /session has ended/.test(r.message));
    } finally { process.env = saved; }
  });
  assert.equal(calls, 0);
});

test("in demo: a new invite is pending, cancelling removes it, and cancelling twice says it is gone", async () => {
  await demo(async () => {
    const email = `pending-${Date.now()}@firm.in`;
    assert.ok((await inviteAction({ email, role: "viewer" })).ok);
    const listed = await new MockGateway().invitesList();
    const id = listed.ok ? listed.data.invites.find((i) => i.email === email)?.invite_id : undefined;
    assert.ok(id && listed.ok && !JSON.stringify(listed.data).includes("token"));
    assert.deepEqual(await cancelInviteAction({ inviteId: id }), { ok: true, message: "Invite cancelled. Its link no longer works." });
    const after = await new MockGateway().invitesList();
    assert.ok(after.ok && !after.data.invites.some((i) => i.email === email));
    const again = await cancelInviteAction({ inviteId: id });
    assert.equal(again.ok, false);
  });
});

test("the gateway's 404 and 403 on cancel become words; a refusal is never reported as done", async () => {
  const proto = MockGateway.prototype;
  const saved = proto.inviteCancel;
  const fail = (status: number) => ({ ok: false as const, error: { kind: "bad_request" as const, route: "/v2/invites/cancel" as const, status, message: String(status) } });
  try {
    await demo(async () => {
      proto.inviteCancel = async () => fail(404);
      const gone = await cancelInviteAction({ inviteId: INVITE });
      assert.ok(!gone.ok && /no longer pending/.test(gone.message));
      proto.inviteCancel = async () => ({ ok: true, data: { status: "REFUSED", code: "NOT_FOUND", detail: "x" } });
      const refused = await cancelInviteAction({ inviteId: INVITE });
      assert.ok(!refused.ok && /no longer pending/.test(refused.message));
      proto.inviteCancel = async () => fail(403);
      const forbidden = await cancelInviteAction({ inviteId: INVITE });
      assert.ok(!forbidden.ok && /Only an admin/.test(forbidden.message));
      proto.inviteCancel = async () => fail(503);
      const unsure = await cancelInviteAction({ inviteId: INVITE });
      assert.ok(!unsure.ok && /could not be confirmed/.test(unsure.message));
    });
  } finally { proto.inviteCancel = saved; }
});

test("over HTTP, a cancel refused as NOT_FOUND (HTTP 404) is a refusal, not success", async () => {
  const r = await withFetch(() => Response.json({ status: "REFUSED", code: "NOT_FOUND", detail: "x" }, { status: 404 }),
    () => gw().inviteCancel(INVITE));
  assert.ok(r.ok && isRefusal(r.data) && r.data.code === "NOT_FOUND");
  const ok = await withFetch(() => Response.json({ status: "cancelled", invite_id: INVITE }), () => gw().inviteCancel(INVITE));
  assert.ok(ok.ok && !isRefusal(ok.data) && ok.data.status === "cancelled");
});
