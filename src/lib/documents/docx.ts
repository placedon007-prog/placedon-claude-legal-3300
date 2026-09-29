import { readZipMember, ZipError } from "./zip";

/**
 * The text of a .docx, in reading order.
 *
 * Mirrors `checker/clauses.from_docx` in the backend deliberately — the same `w:p` /
 * `w:t` / `w:tab` / `w:br` handling — so a document reviewed through this app reads the
 * same as one reviewed through the CLI. A clause number separated from its heading by a
 * tab is the ordinary case, and losing the tab merges the number into the first word.
 */

export class DocxError extends Error {}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
};

function decode(xml: string): string {
  return xml.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X"))
      return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(Number(body.slice(1)));
    return ENTITIES[body] ?? whole;
  });
}

export function docxToText(bytes: Uint8Array): string {
  let xml: Buffer | null;
  try {
    xml = readZipMember(bytes, "word/document.xml");
  } catch (cause) {
    throw new DocxError(
      cause instanceof ZipError
        ? `This file is not a readable .docx: ${cause.message}`
        : "This file could not be read as a .docx.",
    );
  }
  if (!xml) throw new DocxError("This .docx has no word/document.xml inside it.");

  const doc = xml.toString("utf8");
  const body = doc.slice(doc.indexOf("<w:body"));
  const paragraphs: string[] = [];

  for (const para of body.split(/<w:p[ >]/).slice(1)) {
    const out: string[] = [];
    // One pass, in document order, so runs and tabs interleave correctly.
    const token = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>/g;
    let m: RegExpExecArray | null;
    while ((m = token.exec(para)) !== null) {
      if (m[1] !== undefined) out.push(decode(m[1]));
      else if (m[0].startsWith("<w:tab")) out.push("\t");
      else out.push("\n");
    }
    paragraphs.push(out.join(""));
  }
  return paragraphs.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
