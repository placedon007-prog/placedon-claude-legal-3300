import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { MockGateway } from "../src/lib/gateway/mock";
import { inviteCreateSchema, isRefusal } from "../src/lib/gateway/types";
import { canManagePeople, canOpenMatters, usageLine } from "../src/lib/team";
import {
  createMatterAction, grantAccessAction, inviteAction, matterMembersAction, revokeAccessAction,
} from "../src/app/app/team/actions";

const MATTER = "11111111-1111-4111-8111-111111111111";
const gw = () => new HttpGateway("http://localhost:8021", "fixture-key");

async function withFetch<T>(reply: (url: string, body: unknown) => Response, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => reply(String(url), init?.body ? JSON.parse(String(init.body)) : null);
  try { return await run(); } finally { globalThis.fetch = original; }
}

/** Runs `fn` with only the given env keys set (others among them removed), then restores. */
async function withEnv<T>(set: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const keys = ["APP_PASSCODE", "APP_SESSION_SECRET", "PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"];
  const saved = keys.map((k) => process.env[k]);
  try {
    for (const k of keys) delete process.env[k];
    Object.assign(process.env, set);
    return await fn();
  } finally {
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
}
const demo = <T,>(fn: () => Promise<T>) => withEnv({ PLACEDON_DEMO_MODE: "true" }, fn);

test("each team verb posts to the path rest_path() generates, with the backend's field names", async () => {
  const seen: Array<[string, unknown]> = [];
  await withFetch((url, body) => { seen.push([url.replace("http://localhost:8021", ""), body]); return Response.json({}); }, async () => {
    const g = gw();
    await g.authMe();
    await g.matterCreate({ name: "Acme", clientRef: "C-1" });
    await g.matterMembers(MATTER);
    await g.matterGrant({ matterId: MATTER, actorId: "a1", role: "viewer", reason: "joining the team" });
    await g.matterRevoke({ matterId: MATTER, actorId: "a1", reason: "left the team now" });
    await g.inviteCreate({ email: "x@firm.in", role: "lawyer" });
    await g.usageStatus();
  });
  assert.deepEqual(seen, [
    ["/v2/auth/me", {}],
    ["/v2/matters/create", { name: "Acme", client_ref: "C-1" }],
    ["/v2/matters/members", { matter_id: MATTER }],
    ["/v2/matters/grant", { matter_id: MATTER, actor_id: "a1", role: "viewer", reason: "joining the team" }],
    ["/v2/matters/revoke", { matter_id: MATTER, actor_id: "a1", reason: "left the team now" }],
    ["/v2/invites/create", { email: "x@firm.in", role: "lawyer" }],
    ["/v2/usage/status", {}],
  ]);
});

test("refusals on HTTP 200 (grant) and 409 (invite CONFLICT) arrive as refusals, never as success", async () => {
  const grant = await withFetch(() => Response.json({ status: "REFUSED", code: "REASON_REQUIRED", detail: "x" }),
    () => gw().matterGrant({ matterId: MATTER, actorId: "a", role: "member", reason: "short" }));
  assert.ok(grant.ok && isRefusal(grant.data) && grant.data.code === "REASON_REQUIRED");
  const invite = await withFetch(() => Response.json({ status: "REFUSED", code: "CONFLICT", detail: "x" }, { status: 409 }),
    () => gw().inviteCreate({ email: "x@firm.in", role: "viewer" }));
  assert.ok(invite.ok && isRefusal(invite.data) && invite.data.code === "CONFLICT");
});

test("an invite answer without its token cannot pass as success", () => {
  assert.equal(inviteCreateSchema.safeParse({ invite_id: "i", email: "x@firm.in", role: "viewer", expires_at: "2026-11-08" }).success, false);
});

test("roles: only lawyers and admins open matters; only admins manage people", () => {
  assert.deepEqual([null, "viewer", "lawyer", "admin"].map((r) => canOpenMatters(r as never)), [false, false, true, true]);
  assert.deepEqual([null, "viewer", "lawyer", "admin"].map((r) => canManagePeople(r as never)), [false, false, false, true]);
});

test("usageLine says rupees used of the cap, and never turns an unknown into ₹0", () => {
  assert.equal(usageLine({ readable: true, tenant: { month_inr: 182.4, month_cap_inr: 700, remaining_inr: 517.6 } }),
    "Used ₹182.4 of ₹700 this month");
  assert.equal(usageLine({ readable: true, tenant: null }), null);
  assert.match(usageLine({ readable: false, reason: "corrupt" }) ?? "", /could not be read/);
  assert.match(usageLine({ status: "REFUSED", code: "NO_LEDGER", detail: "x" }) ?? "", /does not mean nothing is left/);
});

test("team actions require a session before contacting the gateway", async () => {
  let calls = 0;
  await withFetch(() => { calls += 1; return new Response("no", { status: 500 }); }, () =>
    withEnv({ GATEWAY_URL: "http://gateway.invalid", PLACEDON_GATEWAY_KEY: "test-key-that-is-not-a-secret" }, async () => {
      for (const r of [await createMatterAction({ name: "A" }), await inviteAction({ email: "a@b.in", role: "viewer" }),
        await grantAccessAction({ matterId: MATTER, actorId: "a", role: "member", reason: "long enough reason" })]) {
        assert.ok(!r.ok && /session has ended/.test(r.message));
      }
    }));
  assert.equal(calls, 0);
});

test("in demo: open a matter, give and remove access, and a duplicate name is said in words", async () => {
  await demo(async () => {
    const name = `Demo matter ${Date.now()}`;
    assert.deepEqual(await createMatterAction({ name }), { ok: true, message: `${name} is open. You are its owner.` });
    const dup = await createMatterAction({ name });
    assert.ok(!dup.ok && /already exists/.test(dup.message));
    const list = await new MockGateway().mattersList();
    const id = list.ok ? list.data.matters.find((m) => m.name === name)?.matter_id : undefined;
    assert.ok(id);
    assert.ok((await grantAccessAction({ matterId: id, actorId: "colleague-1", role: "viewer", reason: "reads the diligence" })).ok);
    const members = await matterMembersAction({ matterId: id });
    assert.ok(members.ok && members.memberships.some((m) => m.actor_id === "colleague-1" && m.role === "viewer"));
    assert.ok((await revokeAccessAction({ matterId: id, actorId: "colleague-1", reason: "left the matter team" })).ok);
    const again = await revokeAccessAction({ matterId: id, actorId: "colleague-1", reason: "left the matter team" });
    assert.ok(!again.ok && /no access to remove/.test(again.message));
  });
});

test("inputs are validated before the gateway: short reason, bad matter id, bad email, unknown role", async () => {
  await demo(async () => {
    const short = await grantAccessAction({ matterId: MATTER, actorId: "a", role: "member", reason: "short" });
    assert.ok(!short.ok && /at least 10 characters/.test(short.message));
    const bad = await matterMembersAction({ matterId: "../etc" });
    assert.deepEqual(bad, { ok: false, message: "That is not a matter id." });
    const email = await inviteAction({ email: "not-an-email", role: "viewer" });
    assert.ok(!email.ok && /real email/.test(email.message));
    const role = await inviteAction({ email: "a@firm.in", role: "superuser" });
    assert.equal(role.ok, false);
    const empty = await createMatterAction({ name: "  " });
    assert.deepEqual(empty, { ok: false, message: "Give the matter a name." });
  });
});

test("the gateway's 403 role check becomes words; a refusal is never reported as done", async () => {
  const proto = MockGateway.prototype;
  const saved = { inviteCreate: proto.inviteCreate, matterGrant: proto.matterGrant, matterCreate: proto.matterCreate };
  const forbidden = { ok: false as const, error: { kind: "bad_request" as const, route: "/v2/invites/create" as const, status: 403, message: "403" } };
  try {
    await demo(async () => {
      proto.inviteCreate = async () => forbidden;
      const invite = await inviteAction({ email: "a@firm.in", role: "viewer" });
      assert.ok(!invite.ok && /Only an admin can invite/.test(invite.message));
      proto.matterCreate = async () => forbidden;
      const create = await createMatterAction({ name: "X" });
      assert.ok(!create.ok && /role cannot open matters/.test(create.message));
      proto.matterGrant = async () => ({ ok: true, data: { status: "REFUSED", code: "NOT_FOUND", detail: "x" } });
      const grant = await grantAccessAction({ matterId: MATTER, actorId: "ghost", role: "member", reason: "long enough reason" });
      assert.ok(!grant.ok && /no active account/.test(grant.message));
      proto.inviteCreate = async () => ({ ok: true, data: { status: "REFUSED", code: "CONFLICT", detail: "x" } });
      const taken = await inviteAction({ email: "a@firm.in", role: "viewer" });
      assert.ok(!taken.ok && /already exists/.test(taken.message));
    });
  } finally { Object.assign(proto, saved); }
});

test("a demo invite returns its link token once", async () => {
  await demo(async () => {
    const r = await inviteAction({ email: " new@firm.in ", role: "lawyer" });
    assert.ok(r.ok && r.email === "new@firm.in" && r.token.length > 0);
  });
});
