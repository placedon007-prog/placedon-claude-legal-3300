import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { extractText, looksLikeProse, looksLikeShortProse } from "../src/lib/documents";

// Synthetic only: tests/fixtures/documents/short-notice.pdf, printed by Chromium (19 words).
const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/documents/${name}`, import.meta.url)));

test("a one-paragraph PDF with a real text layer is read, not refused as fonts or a scan", async () => {
  const r = await extractText("short-notice.pdf", fixture("short-notice.pdf"));
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  if (r.ok) {
    assert.match(r.text, /board meeting is moved to 5 November 2026/);
    assert.equal(r.pageCount, 1);
  }
});

test("the short check accepts a short notice and still rejects junk", () => {
  const notice = "SYNTHETIC NOTICE. The board meeting is moved to 5 November 2026 at 11:00.";
  assert.equal(looksLikeProse(notice), false, "too short for the long check");
  assert.equal(looksLikeShortProse(notice), true);
  assert.equal(looksLikeShortProse("short"), false, "below the floor");
  assert.equal(looksLikeShortProse(String.fromCharCode(1, 2, 3).repeat(20)), false, "control bytes");
  assert.equal(looksLikeShortProse("/F1 12 Tf BT 0 0 1 rg ET q Q /F2 9 Tf"), false, "a content-stream dump");
  assert.equal(looksLikeShortProse("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"), false, "no spaces");
});

test("short Indian-language text is not accepted on the short path", () => {
  // The garble check needs more text than this to tell a faithful layer from a broken one.
  assert.equal(looksLikeShortProse("किराया हर महीने की पाँच तारीख तक देना होगा। नोटिस अवधि तीस दिन है।"), false);
});

test("a real scan still names OCR and a damaged file does not", async () => {
  const scan = await extractText("services-agreement-scanned.pdf", fixture("services-agreement-scanned.pdf"));
  assert.equal(scan.ok, false);
  if (!scan.ok) assert.match(scan.reason, /needs OCR/);
  const broken = await extractText("broken.pdf", new TextEncoder().encode("%PDF-1.7\nthis is not really a pdf\n"));
  assert.equal(broken.ok, false);
  if (!broken.ok) assert.match(broken.reason, /could not be opened/);
});

test("a refused file is told to be removed, never to wait for processing", async () => {
  const { attachmentNotice } = await import("../src/lib/vault-state");
  // Regression: a refused upload showed "Wait for processing" for a file that never processes.
  assert.match(attachmentNotice([{ state: "error" }]) ?? "", /could not be read\. Remove it/);
  assert.doesNotMatch(attachmentNotice([{ state: "error" }]) ?? "", /Wait/);
  assert.match(attachmentNotice([{ state: "stored", readiness: "CANNOT_READ" }]) ?? "", /could not be read/);
  assert.match(attachmentNotice([{ state: "storing" }]) ?? "", /Wait for processing/);
  assert.match(attachmentNotice([{ state: "stored", readiness: "PENDING" }]) ?? "", /Wait for processing/);
  assert.equal(attachmentNotice([{ state: "stored", readiness: "INGESTED" }]), null);
  assert.match(attachmentNotice([{ state: "storing" }, { state: "error" }]) ?? "", /could not be read/, "a dead file outranks a waiting one");
});
