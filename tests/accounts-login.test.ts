import assert from "node:assert/strict";
import test from "node:test";

import { accountLoginOutcome, CREDENTIALS_MESSAGE, TRANSPORT_MESSAGE } from "../src/lib/auth/account-login";
import { authLoginOkSchema } from "../src/lib/gateway/types";
import { sessionConfigurationIssue } from "../src/lib/auth/config";
import { GATEWAY_ROUTES } from "../src/lib/engine/types";
import type { EngineResult, EngineErrorKind } from "../src/lib/engine/errors";
import type { AuthLoginOk } from "../src/lib/gateway/types";

const OK: AuthLoginOk = { token: "sess-token", expires_at: "2026-10-15T00:00:00.000Z", actor: "a1", role: "lawyer" };
const fail = (status: number | undefined, extra: Record<string, unknown> = {}, kind: EngineErrorKind = "bad_request"): EngineResult<AuthLoginOk> =>
  ({ ok: false, error: { kind, route: GATEWAY_ROUTES.authLogin, message: "x", ...(status ? { status } : {}), ...extra } });

test("success yields the token and the backend expiry, nothing else", () => {
  const out = accountLoginOutcome({ ok: true, data: OK });
  assert.deepEqual(out, { kind: "ok", token: "sess-token", expiresAt: "2026-10-15T00:00:00.000Z" });
});

test("every credential failure (401) is ONE generic message — no enumeration", () => {
  const out = accountLoginOutcome(fail(401));
  assert.equal(out.kind, "error");
  assert.equal(out.kind === "error" && out.message, CREDENTIALS_MESSAGE);
  // wrong password, unknown email, disabled, un-accepted invite all arrive as 401 → identical.
  assert.equal((accountLoginOutcome(fail(401)) as { message: string }).message,
               (accountLoginOutcome(fail(401, { detail: "whatever" })) as { message: string }).message);
});

test("lockout (429) names the wait when the backend gave one, else stays generic", () => {
  const withSecs = accountLoginOutcome(fail(429, { retryAfterSeconds: 30 }));
  assert.match((withSecs as { message: string }).message, /30 seconds/);
  const one = accountLoginOutcome(fail(429, { retryAfterSeconds: 1 }));
  assert.match((one as { message: string }).message, /1 second\b/);
  const none = accountLoginOutcome(fail(429));
  assert.match((none as { message: string }).message, /Too many attempts/);
});

test("a transport failure is its own state, never the credential message", () => {
  for (const r of [fail(undefined, {}, "transport_error"), fail(undefined, {}, "timeout"),
                   fail(500, {}, "server_error"), fail(undefined, {}, "schema_mismatch")]) {
    const out = accountLoginOutcome(r);
    assert.equal((out as { message: string }).message, TRANSPORT_MESSAGE);
    assert.notEqual((out as { message: string }).message, CREDENTIALS_MESSAGE);
  }
});

test("authLoginOkSchema accepts the contract and rejects a broken one", () => {
  assert.equal(authLoginOkSchema.safeParse(OK).success, true);
  assert.equal(authLoginOkSchema.safeParse({ ...OK, role: "superuser" }).success, false, "unknown role rejected");
  assert.equal(authLoginOkSchema.safeParse({ expires_at: OK.expires_at, actor: "a", role: "viewer" }).success, false, "missing token rejected");
  assert.equal(authLoginOkSchema.safeParse({ ...OK, token: "" }).success, false, "empty token rejected");
});

test("accounts mode needs a configured gateway, not a passcode", () => {
  const base = { APP_AUTH_MODE: "accounts" };
  assert.match(sessionConfigurationIssue(base) ?? "", /Accounts sign-in is not configured/, "no gateway → issue");
  assert.equal(
    sessionConfigurationIssue({ ...base, GATEWAY_URL: "https://gw", PLACEDON_GATEWAY_KEY: "k" }),
    null,
    "gateway configured → ok, and APP_PASSCODE is NOT required in accounts mode",
  );
});
