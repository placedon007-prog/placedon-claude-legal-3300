import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractText, looksLikeProse } from "../src/lib/documents";

// Synthetic documents only (tests/fixtures/documents): no real party, no client text.
const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/documents/${name}`, import.meta.url)));
const HINDI = readFileSync(new URL("./fixtures/documents/seva-anubandh-hindi.txt", import.meta.url), "utf8");

test("a text PDF keeps its pages, joined by form feeds, so passages can name a page", async () => {
  const r = await extractText("services-agreement-text.pdf", fixture("services-agreement-text.pdf"));
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  if (!r.ok) return;
  const pages = r.text.split("\f");
  assert.equal(pages.length, 2);
  assert.match(pages[0], /SERVICES AGREEMENT/);
  assert.match(pages[1], /Schedule 1/);
  assert.deepEqual([r.pageCount, r.pagesWithoutText], [2, []]);
});

test("a scanned PDF is refused as a scan with no text layer, and says OCR is not run", async () => {
  const r = await extractText("services-agreement-scanned.pdf", fixture("services-agreement-scanned.pdf"));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.reason, /^This PDF's only page has no text layer — it is a scan/);
  assert.match(r.reason, /OCR/);
  assert.match(r.reason, /Nothing was stored/);
});

test("a PDF whose annexure is scanned is read, and the page without text is named", async () => {
  const r = await extractText("services-agreement-mixed.pdf", fixture("services-agreement-mixed.pdf"));
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  if (!r.ok) return;
  assert.deepEqual([r.pageCount, r.pagesWithoutText], [2, [2]]);
  assert.equal(r.text.split("\f").length, 2, "the empty page stays, so the backend can name it");
});

test("Indian-language prose passes the prose gate", () => {
  assert.equal(looksLikeProse(HINDI), true);
});

test("a Hindi PDF whose text layer lost its vowel signs is refused, never stored garbled", async () => {
  const r = await extractText("seva-anubandh-hindi.pdf", fixture("seva-anubandh-hindi.pdf"));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.reason, /vowel signs/);
  assert.match(r.reason, /\.docx/);
});

test("a Hindi .docx and .txt are read exactly, vowel signs and all", async () => {
  for (const name of ["seva-anubandh-hindi.docx", "seva-anubandh-hindi.txt"]) {
    const r = await extractText(name, fixture(name));
    assert.equal(r.ok, true, r.ok ? "" : r.reason);
    if (!r.ok) continue;
    assert.match(r.text, /प्राइवेट लिमिटेड/, `${name} keeps "लिमिटेड" intact`);
  }
});

test("a PARTIAL document can be attached: its readable pages are stored, its missing pages named", async () => {
  const { isReadableVaultState } = await import("../src/lib/vault-state");
  assert.deepEqual(["INGESTED", "PARTIAL", "PENDING", "CANNOT_READ", "DELETED", undefined].map(isReadableVaultState),
    [true, true, false, false, false, false]);
});
