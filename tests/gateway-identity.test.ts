import { test } from "node:test";
import assert from "node:assert/strict";
import { gatewayCredential } from "../src/lib/auth/config";

const live = { GATEWAY_URL: "http://127.0.0.1:8010", PLACEDON_GATEWAY_KEY: "deployment-key" };

test("accounts mode calls the gateway as the signed-in person, never as the deployment key", () => {
  const env = { ...live, APP_AUTH_MODE: "accounts" };
  assert.equal(gatewayCredential(env, "session-of-lawyer-a"), "session-of-lawyer-a");
  assert.equal(gatewayCredential(env, "session-of-lawyer-b"), "session-of-lawyer-b");
});

test("accounts mode with no session has no credential at all, rather than falling back to the key", () => {
  const env = { ...live, APP_AUTH_MODE: "accounts" };
  assert.equal(gatewayCredential(env, undefined), null);
  assert.equal(gatewayCredential(env, "  "), null);
});

test("the passcode prototype keeps its one deployment key: it has no per-person identity", () => {
  assert.equal(gatewayCredential(live, "ignored-cookie"), "deployment-key");
});

test("the console names the session for what it is: a person's account is not a shared passcode", async () => {
  const { sessionKind } = await import("../src/lib/auth/config");
  assert.equal(sessionKind({ ...live, APP_AUTH_MODE: "accounts" }), "account");
  assert.equal(sessionKind(live), "passcode");
  assert.equal(sessionKind({ PLACEDON_DEMO_MODE: "true" }), "demo");
});
