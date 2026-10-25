import { inflateSync } from "node:zlib";
import { EXPANSION_LIMIT_REASON, MAX_EXPANDED_BYTES, MAX_PDF_STREAMS } from "./limits";

/**
 * The TEXT LAYER of a PDF, or an honest refusal.
 *
 * A scanned page has no text layer at all, and a PDF that uses embedded CID fonts encodes
 * its glyphs against a font map this reader does not build. Both produce something that is
 * not the contract — and a garbled extraction reviewed as though it were the document is
 * far worse than a refusal, because every finding after it would be about text nobody
 * wrote.
 *
 * So extraction is followed by a CONFIDENCE GATE, and the gate is deliberately strict:
 * unless what came out reads like prose, this refuses and asks for .docx or pasted text.
 * The backend makes the same choice in `checker/clauses.from_pdf`, which raises rather
 * than return an empty string: "an empty string here would review as a contract with no
 * clauses in it, which is the opposite of what it is."
 *
 * pdf.js (through `unpdf`) reads first; this file's own reader is the fallback when pdf.js
 * cannot open the file. The fallback handles FlateDecode content streams and the
 * text-showing operators, which is what Word and most contract tooling emit. Whatever
 * either produces, the confidence gate decides, and anything else is refused, by design,
 * rather than half-read.
 */

export class PdfError extends Error {}

/** Joins a PDF's pages: a form feed, as pdftotext writes, so the backend can name pages. */
export const PAGE_BREAK = String.fromCharCode(12);
/** A page with fewer non-space characters than this has no text layer worth the name. */
const MIN_PAGE_CHARS = 20;

export type PdfText = {
  readonly text: string;
  /** Pages pdf.js read; null when only the fallback reader could open the file. */
  readonly pageCount: number | null;
  /** 1-indexed pages with no text layer -- a scanned annexure, a stamped signature page. */
  readonly pagesWithoutText: readonly number[];
};

const NOTHING_STORED = "OCR is not enabled in this deployment. Nothing was stored.";

// Built from code points rather than written as escapes: backspace and form feed are
// control characters, and a source file containing them literally is one nobody can
// review in a diff.
const ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: String.fromCharCode(8),
  f: String.fromCharCode(12),
  "(": "(",
  ")": ")",
  "\\": "\\",
};

/** A PDF literal string: escapes, and balanced nested parentheses. */
function readLiteral(s: string, start: number): [string, number] {
  let out = "";
  let depth = 1;
  let i = start;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      const next = s[i + 1];
      if (next in ESCAPES) {
        out += ESCAPES[next];
        i += 2;
        continue;
      }
      const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/);
      if (oct) {
        out += String.fromCharCode(parseInt(oct[0], 8));
        i += 1 + oct[0].length;
        continue;
      }
      i += 2;
      continue;
    }
    if (ch === "(") {
      depth++;
      out += ch;
      i++;
      continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0) return [out, i + 1];
      out += ch;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return [out, i];
}

/** Text-showing operators from one decoded content stream. */
function textFromStream(stream: string): string {
  const pieces: string[] = [];
  let i = 0;
  while (i < stream.length) {
    if (stream[i] === "(") {
      const [text, next] = readLiteral(stream, i + 1);
      pieces.push(text);
      i = next;
      continue;
    }
    // TD, Td, T* and ET all end a line of text on the page.
    if (
      stream.startsWith("TD", i) ||
      stream.startsWith("Td", i) ||
      stream.startsWith("T*", i) ||
      stream.startsWith("ET", i)
    ) {
      pieces.push("\n");
      i += 2;
      continue;
    }
    i++;
  }
  return pieces.join("");
}

/** Every FlateDecode stream in the file, inflated. Undecodable ones are skipped. */
function inflateStreams(buf: Buffer): string[] {
  const out: string[] = [];
  const marker = Buffer.from("stream");
  let from = 0;
  let expandedBytes = 0;
  let streamCount = 0;
  for (;;) {
    const at = buf.indexOf(marker, from);
    if (at === -1) break;
    let start = at + marker.length;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const end = buf.indexOf(Buffer.from("endstream"), start);
    if (end === -1) break;
    if (++streamCount > MAX_PDF_STREAMS) {
      throw new PdfError("This PDF has too many streams to read here. Split it into smaller documents.");
    }
    const remaining = MAX_EXPANDED_BYTES - expandedBytes;
    if (remaining <= 0) throw new PdfError(EXPANSION_LIMIT_REASON);
    try {
      const inflated = inflateSync(buf.subarray(start, end), { maxOutputLength: remaining });
      expandedBytes += inflated.length;
      out.push(inflated.toString("latin1"));
    } catch (cause) {
      if (cause instanceof Error && "code" in cause && cause.code === "ERR_BUFFER_TOO_LARGE") {
        throw new PdfError(EXPANSION_LIMIT_REASON);
      }
      // Not a flate stream (an image, a font, an object stream). Skipped, never guessed at.
    }
    from = end + 9;
  }
  return out;
}

/**
 * Does this read like a contract, or like the inside of a font?
 *
 * Checked on the OUTPUT rather than on the PDF's declared fonts: a file can declare
 * anything, and what matters is whether the characters that came out are words.
 */
export function looksLikeProse(text: string): boolean {
  const t = text.trim();
  if (t.length < 200) return false;
  // Letters of ANY script, with their combining vowel signs. `[A-Za-z]` alone refused
  // every Hindi, Tamil or Bengali document as "not prose".
  const letters = (t.match(/[\p{L}\p{M}]/gu) ?? []).length;
  const spaces = (t.match(/\s/g) ?? []).length;
  // Counted by code point, not by a regex literal: the class would otherwise put raw
  // control characters in this file.
  const junk = [...t].filter((c) => {
    const n = c.codePointAt(0) ?? 0;
    return n === 0xfffd || n < 9 || (n > 13 && n < 32);
  }).length;
  if (junk > t.length * 0.01) return false;
  if (letters / t.length < 0.55) return false;
  if (spaces / t.length < 0.08) return false;
  // Real prose has words of ordinary length. A font dump has none.
  const words = t.split(/\s+/).filter((w) => /^\p{L}[\p{L}\p{M}'’-]{2,}$/u.test(w));
  return words.length >= 40;
}

/**
 * Whether an Indian-script text layer came out garbled. pdf.js maps glyphs back to
 * characters through the font's ToUnicode table, and for Indic shaping that table often
 * cannot express a reordered vowel sign: measured on a synthetic Hindi agreement printed by
 * Chromium, every one of its 14 "ि" (the pre-base i-matra) was lost and 48 of 115 words
 * came out wrong. Such text is not the document's words, so it is refused, not stored.
 */
export function indicTextLayerGarbled(text: string): boolean {
  const indic = (text.match(/[\u0900-\u0D7F]/g) ?? []).length;
  const letters = (text.match(/[\p{L}\p{M}]/gu) ?? []).length;
  if (indic < 100 || indic < letters * 0.3) return false;
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  // "ि" is among the commonest Devanagari vowel signs; 300 characters without one is a
  // layer that dropped it, not a document that never used it.
  if (devanagari >= 300 && !text.includes("\u093F")) return true;
  // A word cannot begin with a combining vowel sign: one that does was split from its letter.
  const words = text.split(/\s+/).filter(Boolean);
  return words.filter((w) => /^\p{M}/u.test(w)).length > words.length * 0.02;
}

/** A filing is tens of pages; an ICSI guidance note is under 200. More is a book, not a document. */
export const MAX_PDF_PAGES = 500;

/**
 * The text layer through pdf.js, which decodes what the reader below cannot: CID fonts
 * through their ToUnicode maps, object streams, cross-reference streams. Measured on
 * 24-10-2026: the reader below refused all 14 real filings in the backend's
 * `corpus/testdocs/_raw/` (Route Mobile, Titan, Sonata, both ICSI guidance notes); this
 * read all 14. `null` when pdf.js cannot open the file -- the caller then falls back to the
 * reader below, whose refusals name the reason.
 */
async function pdfJsPages(bytes: Uint8Array): Promise<string[] | null> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  let pdf;
  try {
    // A copy: pdf.js transfers the buffer it is given, which would empty the caller's.
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    return null;
  }
  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new PdfError(
        `This PDF has ${pdf.numPages} pages; the limit is ${MAX_PDF_PAGES}. Split it into smaller documents.`,
      );
    }
    const { text } = await extractText(pdf, { mergePages: false });
    return text.map((page) => page.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim());
  } catch (cause) {
    if (cause instanceof PdfError) throw cause;
    return null;
  } finally {
    await pdf.destroy();
  }
}

export async function pdfToText(bytes: Uint8Array): Promise<PdfText> {
  const buf = Buffer.from(bytes);
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new PdfError("This file does not begin with %PDF- and is not a PDF.");
  }
  // The confidence gate below still decides: pdf.js output is used only when it reads as
  // prose. A font pdf.js cannot map either falls through to the same refusals.
  const pages = await pdfJsPages(bytes);
  if (pages !== null && pages.length > 0) {
    const read = pages.map((page) => (page.replace(/\s/g, "").length >= MIN_PAGE_CHARS ? page : ""));
    const pagesWithoutText = read.flatMap((page, i) => (page ? [] : [i + 1]));
    if (pagesWithoutText.length === pages.length) {
      throw new PdfError(
        `${pages.length === 1 ? "This PDF's only page has no" : `None of this PDF's ${pages.length} pages has a`} ` +
          "text layer — it is a scan, or pages saved as images, and reading it needs OCR. " +
          `${NOTHING_STORED} ` +
          "Upload a PDF with a text layer, or the .docx.",
      );
    }
    const readable = read.filter(Boolean).join("\n\n");
    if (indicTextLayerGarbled(readable)) {
      throw new PdfError(
        "This PDF's text layer garbles its Indian-language text: vowel signs are missing or " +
          "out of order, so the words it yields are not the document's words. Exporting the PDF " +
          `again will not fix this. Upload the .docx or a .txt of the same document. ${NOTHING_STORED}`,
      );
    }
    // Empty pages stay in the join, so page N of the text is page N of the PDF.
    if (looksLikeProse(readable)) return { text: read.join(PAGE_BREAK), pageCount: pages.length, pagesWithoutText };
  }

  const streams = inflateStreams(buf);
  if (streams.length === 0) {
    throw new PdfError(
      "No readable text stream was found in this PDF. If it is a scan, it has no text " +
        "layer at all and needs OCR — which this prototype does not do. Send the .docx, " +
        "or paste the text.",
    );
  }
  const text = streams
    .map(textFromStream)
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!looksLikeProse(text)) {
    throw new PdfError(
      "This PDF's text layer could not be read as words — most likely embedded fonts with " +
        "a custom encoding, or a scan. Rather than review text nobody wrote, this refuses: " +
        "send the .docx, or paste the contract text.",
    );
  }
  // The fallback reader has no notion of pages, so it claims none.
  return { text, pageCount: null, pagesWithoutText: [] };
}
