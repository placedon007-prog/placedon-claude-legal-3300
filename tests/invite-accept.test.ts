import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteAcceptOutcome, validateNewPassword, INVALID_INVITE_MESSAGE } from "../src/lib/auth/invite-accept";
import { inviteAcceptSchema } from "../src/lib/gateway/types";
import { GATEWAY_ROUTES } from "../src/lib/engine/types";

const fail = (kind: "transport_error" | "timeout" | "server_error") =>
  ({ ok: false as const, error: { kind, route: GATEWAY_ROUTES.invitesAccept, message: "x" } });

test("the live gateway's accept bodies parse (recorded 2026-10-26)", () => {
  assert.equal(inviteAcceptSchema.safeParse({ status: "accepted", actor_id: "a1",
    tenant_id: "00000000-0000-0000-0000-000000000001", role: "lawyer" }).success, true);
  assert.equal(inviteAcceptSchema.safeParse({ status: "REFUSED", code: "INVALID_INVITE",
    detail: "this invite link is not valid or has already been used" }).success, true);
});

test("an accepted invite says to sign in; it never claims a session it did not start", () => {
  const out = inviteAcceptOutcome({ ok: true, data: { status: "accepted", actor_id: "a1", tenant_id: "t", role: "lawyer" } });
  assert.deepEqual(out, { kind: "accepted" });
});

test("an unusable invite gets one message, whatever the reason", () => {
  const out = inviteAcceptOutcome({ ok: true, data: { status: "REFUSED", code: "INVALID_INVITE", detail: "backend wording" } });
  assert.deepEqual(out, { kind: "error", message: INVALID_INVITE_MESSAGE });
});

test("a password the backend refuses shows the backend's rule; a transport failure is not a verdict", () => {
  const rule = inviteAcceptOutcome({ ok: true, data: { status: "REFUSED", code: "BAD_REQUEST", detail: "a password must be at least 12 characters" } });
  assert.deepEqual(rule, { kind: "error", message: "a password must be at least 12 characters" });
  for (const kind of ["transport_error", "timeout", "server_error"] as const) {
    const out = inviteAcceptOutcome(fail(kind));
    assert.equal(out.kind, "error");
    // A lost response may follow a successful accept: never claim nothing was created.
    if (out.kind === "error") {
      assert.match(out.message, /could not confirm/i);
      assert.doesNotMatch(out.message, /nothing was created/i);
    }
  }
});

test("a new password is checked before anything is sent", () => {
  assert.match(validateNewPassword("short", "short") ?? "", /at least 12/);
  assert.match(validateNewPassword("a long enough secret", "a different secret!!") ?? "", /do not match/);
  assert.match(validateNewPassword("x".repeat(4097), "x".repeat(4097)) ?? "", /too long/);
  assert.equal(validateNewPassword("a long enough secret", "a long enough secret"), null);
});
