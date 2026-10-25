import type { DocumentSummary, Envelope } from "@/lib/gateway/types";

/** Keep a stored summary on its own review-only render path, never on case answers. */
export function shouldRenderDocumentSummary(
  summary: DocumentSummary | undefined,
  envelope: Pick<Envelope, "task" | "status" | "resource">,
): summary is DocumentSummary {
  return Boolean(summary
    && envelope.task === "RESEARCH_QUESTION"
    && envelope.status === "PARTIAL"
    && envelope.resource !== "case");
}
