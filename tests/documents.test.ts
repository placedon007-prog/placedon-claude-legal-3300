import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync, deflateSync } from "node:zlib";

import { docxToText, extractText, looksLikeProse } from "../src/lib/documents";
import { MAX_EXPANDED_BYTES, MAX_PDF_STREAMS } from "../src/lib/documents/limits";

/**
 * A minimal but REAL .docx — a zip whose central directory the reader must walk. Built
 * here rather than committed as a binary fixture, so what the test exercises is visible in
 * the diff.
 */
function makeDocx(bodyXml: string): Uint8Array {
  const name = Buffer.from("word/document.xml");
  const xml = Buffer.from(
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`,
  );
  const deflated = deflateRawSync(xml);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(deflated.length, 18);
  local.writeUInt32LE(xml.length, 22);
  local.writeUInt16LE(name.length, 26);
  const localPart = Buffer.concat([local, name, deflated]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(deflated.length, 20);
  central.writeUInt32LE(xml.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);
  const centralPart = Buffer.concat([central, name]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);

  return new Uint8Array(Buffer.concat([localPart, centralPart, eocd]));
}

test("a .docx is read in reading order, with the tab kept", () => {
  const text = docxToText(
    makeDocx(
      "<w:p><w:r><w:t>1.</w:t></w:r><w:r><w:tab/><w:t>Definitions</w:t></w:r></w:p>" +
        "<w:p><w:r><w:t>Confidential Information means anything.</w:t></w:r></w:p>",
    ),
  );
  // The tab matters: without it the clause number merges into its heading.
  assert.match(text, /^1\.\tDefinitions/);
  assert.match(text, /means anything\./);
});

test("a .docx entity is decoded, never shown raw", () => {
  const text = docxToText(
    makeDocx("<w:p><w:r><w:t>Acme &amp; Beta &#8212; terms</w:t></w:r></w:p>"),
  );
  assert.match(text, /Acme & Beta — terms/);
});

test("a file that is not a zip is REFUSED by name, not half-read", () => {
  const r = extractText("nda.docx", new TextEncoder().encode("this is not a zip at all"));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /not a readable \.docx/i);
});

test("an unknown extension is refused rather than guessed at", () => {
  const r = extractText("book.xlsx", new Uint8Array([1, 2, 3]));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /spreadsheet gets reviewed as an NDA/);
});

test("an empty file is refused", () => {
  const r = extractText("nda.docx", new Uint8Array());
  assert.equal(r.ok, false);
});

test("an oversized file is refused before it is parsed", () => {
  const r = extractText("nda.docx", new Uint8Array(11 * 1024 * 1024));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /the limit is 10 MB/);
});

test("a .txt is taken as-is, byte for byte", () => {
  const body = "MUTUAL NDA\n\nThis Agreement continues for five years.";
  const r = extractText("nda.txt", new TextEncoder().encode(body));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.text, body);
    assert.equal(r.kind, "text");
  }
});

test("a .pdf that is not a PDF is refused on its magic bytes", () => {
  const r = extractText("nda.pdf", new TextEncoder().encode("PK this is a zip"));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /%PDF-/);
});

test("a PDF with no readable stream refuses and names OCR", () => {
  const r = extractText("scan.pdf", new TextEncoder().encode("%PDF-1.7\nno streams here\n"));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /needs OCR/);
});

test("the prose gate accepts a contract and rejects a font dump", () => {
  const contract = (
    "This Agreement is made between Acme Private Limited and Beta Limited. " +
    "Each party shall keep the other party Confidential Information secret and shall " +
    "not disclose it to any third party without the prior written consent of the " +
    "disclosing party. "
  ).repeat(3);
  assert.equal(looksLikeProse(contract), true);

  // Control bytes are what a font or image stream decodes to.
  const junk = String.fromCharCode(1, 2, 3).repeat(400);
  assert.equal(looksLikeProse(junk), false);

  assert.equal(looksLikeProse("AAAA".repeat(200)), false, "no spaces is not prose");
  assert.equal(looksLikeProse("short"), false, "too short to judge");
});

test("a small DOCX that expands past the budget is refused even when it lies about its size", () => {
  const docx = Buffer.from(makeDocx("x".repeat(MAX_EXPANDED_BYTES + 1)));
  assert.ok(docx.length < 100_000, "the compressed upload is small");
  const declared = extractText("oversized.docx", docx);
  assert.equal(declared.ok, false);
  if (!declared.ok) assert.match(declared.reason, /expanded-content limit/);

  const centralOffset = docx.readUInt32LE(docx.length - 6);
  docx.writeUInt32LE(1, centralOffset + 24);
  const dishonest = extractText("dishonest.docx", docx);
  assert.equal(dishonest.ok, false);
  if (!dishonest.ok) assert.match(dishonest.reason, /expanded-content limit/);
});

function pdfWithStreams(streams: readonly Buffer[]): Buffer {
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n"),
    ...streams.flatMap((stream) => [
      Buffer.from("1 0 obj\n<< /Filter /FlateDecode >>\nstream\n"),
      stream,
      Buffer.from("\nendstream\nendobj\n"),
    ]),
  ]);
}

test("a PDF expansion over the budget is refused, never silently skipped", () => {
  const stream = deflateSync(Buffer.alloc(MAX_EXPANDED_BYTES + 1, "x"));
  const result = extractText("oversized.pdf", pdfWithStreams([stream]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /expanded-content limit/);
});

test("the PDF expansion budget is shared across all streams", () => {
  const stream = deflateSync(Buffer.alloc(MAX_EXPANDED_BYTES / 2 + 1, "x"));
  const result = extractText("aggregate.pdf", pdfWithStreams([stream, stream]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /expanded-content limit/);
});

test("PDF stream processing is bounded even when every stream is tiny", () => {
  const stream = deflateSync(Buffer.from("x"));
  const result = extractText("many-streams.pdf", pdfWithStreams(Array(MAX_PDF_STREAMS + 1).fill(stream)));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /too many streams/);
});

test("an ordinary compressed PDF still produces complete prose", () => {
  const prose = "This agreement is made between Acme Limited and Beta Limited. Each party shall keep the other party information confidential and shall not disclose it without prior written consent. ".repeat(4);
  const result = extractText("normal.pdf", pdfWithStreams([deflateSync(Buffer.from(`BT (${prose}) Tj ET`))]));
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.text, prose.trim());
});
