import type { DocumentEvidence } from "./gateway/types";

/** Labels describe retrieval only; matching words do not establish legal support. */
export function documentEvidenceLabel(evidence: DocumentEvidence): string {
  switch (evidence.status) {
    case "EXCERPTS_FOUND": return evidence.mode === "overview" ? "Selected excerpts from your documents" : "Document excerpts matching your question";
    case "NO_MATCH": return "No matching document excerpts";
    case "UNAVAILABLE": return "Document text could not be searched";
    case "NOT_SEARCHED": return "Documents were not searched";
  }
}

export function documentEvidenceExplanation(evidence: DocumentEvidence): string {
  switch (evidence.status) {
    case "EXCERPTS_FOUND": return evidence.mode === "overview"
      ? "These are selected passages, not a complete summary. Read the full document before relying on them."
      : "These passages match words in your question. They may not answer it and have not been checked as legal authority.";
    case "NO_MATCH": return "No passage matched this wording. This does not establish that the document is silent on the issue. Try a clause name or words used in the document.";
    case "UNAVAILABLE": return "No searchable document text was available. Check each file below, then attach a readable text document and try again.";
    case "NOT_SEARCHED": return "No document search was performed. Check the source selection and the file details below before trying again.";
  }
}

/** Do not silently broaden a saved source selection when a user attaches a file. */
export function requiresDocumentSource(tool: string, attachmentCount: number, chosen: readonly string[]): boolean {
  return tool === "research" && attachmentCount > 0 && !chosen.includes("vault");
}

/** Displayed excerpt counts describe selection, not full-document review. */
export function documentCoverageLabel(document: DocumentEvidence["documents"][number]): string | null {
  if (document.status !== "SEARCHED" || document.shown_passages === undefined || document.total_passages === undefined) return null;
  return `${document.shown_passages} of ${document.total_passages} text passages shown. Excerpts do not establish a complete review or verification.`;
}
