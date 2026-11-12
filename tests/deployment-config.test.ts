import { test } from "node:test";
import assert from "node:assert/strict";
import { demoModeEnabled, gatewayConfiguration, sessionConfigurationIssue } from "../src/lib/auth/config";

test("missing configuration never selects fixture answers", () => {
  for (const NODE_ENV of ["production", "development", "test"] as const) {
    assert.throws(() => gatewayConfiguration({ NODE_ENV }), /not configured/);
    assert.ok(sessionConfigurationIssue({ NODE_ENV }));
  }
});
test("demo requires explicit opt-in and cannot reach live tenant data", () => {
  assert.equal(demoModeEnabled({ PLACEDON_DEMO_MODE: "false" }), false);
  assert.deepEqual(gatewayConfiguration({ PLACEDON_DEMO_MODE: "true" }), { mode: "demo" });
  assert.equal(sessionConfigurationIssue({ PLACEDON_DEMO_MODE: "true" }), null);
  assert.throws(() => gatewayConfiguration({ PLACEDON_DEMO_MODE: "true", GATEWAY_URL: "https://example.test" }), /live gateway/);
  assert.throws(() => gatewayConfiguration({ PLACEDON_DEMO_MODE: "true", PLACEDON_GATEWAY_KEY: "example" }), /live gateway/);
});
test("live configuration requires independent session signing and gateway credentials", () => {
  const env = { GATEWAY_URL: "https://example.test", PLACEDON_GATEWAY_KEY: "test", APP_PASSCODE: "example" };
  assert.ok(sessionConfigurationIssue(env));
  assert.equal(sessionConfigurationIssue({ ...env, APP_SESSION_SECRET: "a-long-test-signing-secret" }), null);
  assert.ok(sessionConfigurationIssue({ ...env, APP_PASSCODE: "same-long-secret-value", APP_SESSION_SECRET: "same-long-secret-value" }));
  assert.equal(gatewayConfiguration(env).mode, "live");
  assert.throws(() => gatewayConfiguration({ GATEWAY_URL: env.GATEWAY_URL }), /not configured/);
});
