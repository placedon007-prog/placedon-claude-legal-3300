import { inflateSync } from "node:zlib";

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
 * Not a general PDF reader. It handles FlateDecode content streams and the text-showing
 * operators, which is what Word and most contract tooling emit. Anything else is refused,
 * by design, rather than half-read.
 */

export class PdfError extends Error {}

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
  for (;;) {
    const at = buf.indexOf(marker, from);
    if (at === -1) break;
    let start = at + marker.length;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const end = buf.indexOf(Buffer.from("endstream"), start);
    if (end === -1) break;
    try {
      out.push(inflateSync(buf.subarray(start, end)).toString("latin1"));
    } catch {
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
  const letters = (t.match(/[A-Za-z]/g) ?? []).length;
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
  const words = t.split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'’-]{2,}$/.test(w));
  return words.length >= 40;
}

export function pdfToText(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new PdfError("This file does not begin with %PDF- and is not a PDF.");
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
  return text;
}
