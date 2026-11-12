import { test } from "node:test";
import assert from "node:assert/strict";
import { authMode } from "../src/lib/auth/config";

test("sign-in defaults to the workspace passcode", () => {
  assert.equal(authMode({}), "passcode");
  assert.equal(authMode({ APP_AUTH_MODE: "" }), "passcode");
});
test("accounts mode is explicit, and anything else is the passcode", () => {
  assert.equal(authMode({ APP_AUTH_MODE: "accounts" }), "accounts");
  assert.equal(authMode({ APP_AUTH_MODE: "Accounts" }), "passcode");
  assert.equal(authMode({ APP_AUTH_MODE: "sso" }), "passcode");
});
