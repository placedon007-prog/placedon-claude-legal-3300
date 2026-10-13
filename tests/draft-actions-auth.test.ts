import assert from "node:assert/strict";
import { test } from "node:test";
import {
  draftCreateAction,
  draftDiffAction,
  draftExportAction,
  draftReviseAction,
  readDraftList,
  readVersions,
} from "../src/app/app/drafts/actions";

function assertLoginRedirect(error: unknown): boolean {
  assert.ok(error instanceof Error);
  assert.ok("digest" in error);
  assert.match(String(error.digest), /NEXT_REDIRECT;(push|replace);\/login;/);
  return true;
}

test("all Draft Server Actions require a session before contacting the gateway", async () => {
  const env = process.env;
  const saved = {
    APP_PASSCODE: env.APP_PASSCODE,
    APP_SESSION_SECRET: env.APP_SESSION_SECRET,
    PLACEDON_DEMO_MODE: env.PLACEDON_DEMO_MODE,
    GATEWAY_URL: env.GATEWAY_URL,
    PLACEDON_GATEWAY_KEY: env.PLACEDON_GATEWAY_KEY,
  };
  const originalFetch = globalThis.fetch;
  let gatewayCalls = 0;

  try {
    // Missing sign-in config makes hasSession() fail closed without requiring Next request context.
    delete env.APP_PASSCODE;
    delete env.APP_SESSION_SECRET;
    delete env.PLACEDON_DEMO_MODE;
    env.GATEWAY_URL = "http://gateway.invalid";
    env.PLACEDON_GATEWAY_KEY = "test-key-that-is-not-a-secret";
    globalThis.fetch = async () => {
      gatewayCalls += 1;
      return new Response("gateway should not be contacted", { status: 500 });
    };

    const createForm = new FormData();
    createForm.set("title", "Board resolution");
    createForm.set("body", "Draft text");
    const reviseForm = new FormData();
    reviseForm.set("draft_id", "draft-1");
    reviseForm.set("base_version", "1");
    reviseForm.set("body", "Revised text");
    const diffForm = new FormData();
    diffForm.set("draft_id", "draft-1");
    diffForm.set("from_version", "1");
    diffForm.set("to_version", "2");
    const exportForm = new FormData();
    exportForm.set("draft_id", "draft-1");
    exportForm.set("version", "1");

    const actions = [
      () => readDraftList(),
      () => draftCreateAction({ phase: "idle" }, createForm),
      () => readVersions("draft-1"),
      () => draftReviseAction({ phase: "idle" }, reviseForm),
      () => draftDiffAction({ phase: "idle" }, diffForm),
      () => draftExportAction({ phase: "idle" }, exportForm),
    ];

    for (const action of actions) {
      await assert.rejects(action(), assertLoginRedirect);
      assert.equal(gatewayCalls, 0, "unauthenticated action must not make a gateway request");
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
});
