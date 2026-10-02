import { docxToText, DocxError } from "./docx";
import { pdfToText, PdfError } from "./pdf";

export { looksLikeProse } from "./pdf";
export { docxToText, pdfToText, DocxError, PdfError };

/** 10 MB. A contract is words; anything larger is a scan, which has no text layer. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type Extraction =
  | { readonly ok: true; readonly text: string; readonly kind: "docx" | "pdf" | "text" }
  | { readonly ok: false; readonly reason: string };

/**
 * Text out of an uploaded file, or a named refusal.
 *
 * Never returns empty text as success. An empty contract reviews as a contract with no
 * clauses in it, which is the opposite of what it is — the same rule
 * `checker/clauses.from_pdf` applies in the backend.
 */
export function extractText(filename: string, bytes: Uint8Array): Extraction {
  if (bytes.byteLength === 0) return { ok: false, reason: "That file is empty." };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    const mb = (bytes.byteLength / 1_048_576).toFixed(1);
    return {
      ok: false,
      reason: `That file is ${mb} MB and the limit is ${
        MAX_UPLOAD_BYTES / 1_048_576
      } MB — a contract is words, and anything larger is a scan.`,
    };
  }
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith(".docx")) {
      const text = docxToText(bytes);
      if (!text.trim()) return { ok: false, reason: "That .docx contains no text." };
      return { ok: true, text, kind: "docx" };
    }
    if (lower.endsWith(".pdf")) {
      return { ok: true, text: pdfToText(bytes), kind: "pdf" };
    }
    if (lower.endsWith(".txt") || lower.endsWith(".md")) {
      const text = new TextDecoder("utf-8").decode(bytes);
      if (!text.trim()) return { ok: false, reason: "That file contains no text." };
      return { ok: true, text, kind: "text" };
    }
  } catch (cause) {
    if (cause instanceof DocxError || cause instanceof PdfError) {
      return { ok: false, reason: cause.message };
    }
    return { ok: false, reason: "That file could not be read." };
  }
  return {
    ok: false,
    reason:
      "Only .docx, text-layer .pdf and .txt are read here. Guessing at the parser is how a " +
      "spreadsheet gets reviewed as an NDA.",
  };
}
