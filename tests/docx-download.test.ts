import assert from "node:assert/strict";
import { test } from "node:test";
import { docxDownloadName, filenameFromDisposition, isDocx } from "../src/lib/documents/docx-download";
import { GET } from "../src/app/app/drafts/[id]/download/route";

test("isDocx accepts only a ZIP local-file header", () => {
  assert.equal(isDocx(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14])), true);
  assert.equal(isDocx(new TextEncoder().encode("<!doctype html><p>sign in</p>")), false);
  assert.equal(isDocx(new TextEncoder().encode('{"status":"REFUSED"}')), false);
  assert.equal(isDocx(new Uint8Array([0x50, 0x4b])), false);
});

test("docxDownloadName keeps the backend's .docx name and cannot break the header", () => {
  assert.equal(docxDownloadName("Cover-email-v3.docx", 3),
    `attachment; filename="Cover-email-v3.docx"; filename*=UTF-8''Cover-email-v3.docx`);
  assert.match(docxDownloadName("notes.txt", 2), /filename="notes-v2\.docx"/);
  assert.match(docxDownloadName(undefined, 1), /filename="draft-v1\.docx"/);
  const hostile = docxDownloadName('a"; filename="evil.exe\r\nX-Injected: 1.docx', 1);
  assert.doesNotMatch(hostile, /[\r\n]/, "no header injection");
  assert.equal((hostile.match(/"/g) ?? []).length, 2, "the ASCII filename stays one quoted value");
  assert.match(docxDownloadName("मसौदा.docx", 1), /filename\*=UTF-8''%E0%A4%AE/);
});

test("filenameFromDisposition prefers the UTF-8 name and falls back safely", () => {
  assert.equal(filenameFromDisposition(docxDownloadName("मसौदा.docx", 1), "x.docx"), "मसौदा.docx");
  assert.equal(filenameFromDisposition('attachment; filename="plain.docx"', "x.docx"), "plain.docx");
  assert.equal(filenameFromDisposition(null, "x.docx"), "x.docx");
  assert.equal(filenameFromDisposition("attachment; filename*=UTF-8''%E0%A4", "x.docx"), "x.docx");
});

test("the download route requires a session before contacting the gateway", async () => {
  const env = process.env;
  const saved = { APP_PASSCODE: env.APP_PASSCODE, APP_SESSION_SECRET: env.APP_SESSION_SECRET,
    PLACEDON_DEMO_MODE: env.PLACEDON_DEMO_MODE, GATEWAY_URL: env.GATEWAY_URL,
    PLACEDON_GATEWAY_KEY: env.PLACEDON_GATEWAY_KEY };
  const originalFetch = globalThis.fetch;
  let gatewayCalls = 0;
  try {
    // Missing sign-in config makes the session check fail closed, as in draft-actions-auth.
    delete env.APP_PASSCODE;
    delete env.APP_SESSION_SECRET;
    delete env.PLACEDON_DEMO_MODE;
    env.GATEWAY_URL = "http://gateway.invalid";
    env.PLACEDON_GATEWAY_KEY = "test-key-that-is-not-a-secret";
    globalThis.fetch = async () => {
      gatewayCalls += 1;
      return new Response("gateway should not be contacted", { status: 500 });
    };
    const id = "32bdcd21-39cf-42cd-91c1-b2cda9809029";
    await assert.rejects(
      GET(new Request(`http://app.test/app/drafts/${id}/download?version=1`),
        { params: Promise.resolve({ id }) }),
      (error: unknown) => {
        assert.ok(error instanceof Error && "digest" in error);
        assert.match(String(error.digest), /NEXT_REDIRECT;(push|replace);\/login;/);
        return true;
      });
    assert.equal(gatewayCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
});

test("the export schema keeps the backend's docx_base64 field", async () => {
  const { draftExportSchema } = await import("../src/lib/gateway/types");
  // The shape gateway/verbs.py `_draft_export` returns for format=docx.
  const parsed = draftExportSchema.parse({ draft_id: "d", version: 2, format: "docx",
    filename: "d-v2.docx", ready_for_approval: false, approved: false, docx_base64: "UEsDBA==" });
  assert.equal(parsed.docx_base64, "UEsDBA==");
});
