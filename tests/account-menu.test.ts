import assert from "node:assert/strict";
import { test } from "node:test";
import { MockGateway } from "../src/lib/gateway/mock";
import { accountIdentity } from "../src/lib/team";
import { unlistedLocalThreads } from "../src/lib/thread";
import { loadSavedConversations } from "../src/app/app/actions";

async function withEnv<T>(set: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const keys = ["APP_PASSCODE", "APP_SESSION_SECRET", "PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY", "APP_AUTH_MODE"];
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

test("the account menu names the person from the server: label first, else email, with a short role", () => {
  assert.deepEqual(accountIdentity({ email: "asha@firm.in", role: "lawyer", label: "Asha Rao" }),
    { name: "Asha Rao", email: "asha@firm.in", role: "Lawyer" });
  assert.deepEqual(accountIdentity({ email: "asha@firm.in", role: "admin", label: "  " }),
    { name: "asha@firm.in", email: null, role: "Admin" });
  assert.deepEqual(accountIdentity({ email: null, role: "viewer" }), { name: "Signed in", email: null, role: "Viewer" });
});

test("local threads a listed matter already holds are not shown twice", () => {
  const groups = [{ matterId: "m1", matter: "Acme", threads: [{ id: "a", title: "A", at: "" }] }];
  const local = [{ id: "a", title: "A", at: "" }, { id: "b", title: "B", at: "" }];
  assert.deepEqual(unlistedLocalThreads(groups, local).map((t) => t.id), ["b"]);
});

test("in demo: a thread filed to a matter is listed under that matter by the server", async () => {
  await demo(async () => {
    const gateway = new MockGateway();
    await gateway.matterCreate({ name: `Sidebar matter ${Date.now()}` });
    const matters = await gateway.mattersList();
    assert.ok(matters.ok && matters.data.matters.length);
    const matter = matters.data.matters[0]!;
    const sent = await gateway.conversationSend({ text: "Who can be a director?", matterId: matter.matter_id });
    assert.ok(sent.ok && "conversation_id" in sent.data);
    const id = (sent.data as { conversation_id: string }).conversation_id;
    // A later turn without matterId stays in its matter, like the backend's MATTER_CONFLICT rule.
    await gateway.conversationSend({ text: "And a second question", conversationId: id });

    const saved = await loadSavedConversations();
    assert.equal(saved.phase, "loaded");
    const group = saved.phase === "loaded" ? saved.groups.find((g) => g.matterId === matter.matter_id) : undefined;
    assert.equal(group?.matter, matter.name);
    assert.deepEqual(group?.threads.filter((t) => t.id === id).map((t) => t.title), ["Who can be a director?"]);
  });
});

test("a matter whose list fails is reported as partial, never as empty", async () => {
  const proto = MockGateway.prototype;
  const original = proto.conversationList;
  try {
    proto.conversationList = async (matterId: string) => ({ ok: true, data: { status: "REFUSED", code: "FORBIDDEN", detail: matterId } });
    await demo(async () => {
      await new MockGateway().matterCreate({ name: `Failing matter ${Date.now()}` });
      const saved = await loadSavedConversations();
      assert.deepEqual(saved, { phase: "loaded", groups: [], partial: true });
    });
  } finally { proto.conversationList = original; }
});
