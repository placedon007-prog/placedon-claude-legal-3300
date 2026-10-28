import type { DocumentEvidence } from "@/lib/gateway/types";
import { documentCoverageLabel, documentEvidenceExplanation, documentEvidenceLabel } from "@/lib/document-evidence";

/** Snapshot excerpts remain distinct from reverified citations in held law. */
export function DocumentEvidenceAnswer({ evidence }: { evidence: DocumentEvidence }) {
  const found = evidence.status === "EXCERPTS_FOUND";
  return (
    <article aria-label="Document research result" className="flex min-w-0 flex-col gap-4">
      <h3 className="text-title font-semibold text-fg">{documentEvidenceLabel(evidence)}</h3>
      <p className="max-w-[68ch] text-read text-fg-2">{documentEvidenceExplanation(evidence)}</p>
      {evidence.history_query ? (
        // Shown, not tucked into the limitations: it is why these excerpts answer a short follow-up.
        <p className="max-w-[68ch] text-body text-fg-2">Read together with your previous question: “{evidence.history_query}”</p>
      ) : null}
      {found ? <ol aria-label="Document excerpts" className="space-y-6">
        {evidence.passages.map((passage, index) => (
          <li key={passage.id} className="min-w-0 space-y-2">
            <h4 className="text-body font-medium break-words text-fg">{index + 1}. {passage.name}{passage.page ? ` · Page ${passage.page}` : ""}</h4>
            <blockquote className="max-w-[68ch] text-read whitespace-pre-wrap break-words text-fg">{passage.text}</blockquote>
            <details className="text-ui text-fg-2">
              <summary className="flex min-h-11 cursor-pointer items-center rounded-chip underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">Excerpt details</summary>
              <div className="space-y-2 pb-2">
                <p>This is the saved extraction snapshot. It has not been re-read from the current file or verified against an official record.</p>
                <p className="font-mono text-caption break-all">Characters {passage.start}–{passage.end} (start included, end excluded; Unicode characters in extracted text)</p>
                <p className="font-mono text-caption break-all">Document {passage.document_id} · SHA-256 {passage.sha256 ?? "not recorded"}</p>
              </div>
            </details>
          </li>
        ))}
      </ol> : null}
      <section aria-label="Document search coverage" className="space-y-2 border-t border-line pt-3">
        <h4 className="text-body font-medium text-fg">Files checked</h4>
        <ul className="space-y-2 text-body text-fg-2">
          {evidence.documents.map((document) => (
            <li key={document.document_id} className="break-words">
              <span className="font-medium">{document.name}</span> — {document.status === "SEARCHED" ? "text searched" : document.status === "LIMIT_EXCEEDED" ? "not searched: document limit exceeded" : document.status === "UNAVAILABLE" ? "text unavailable" : "not searched"}
              {documentCoverageLabel(document) ? <p className="text-caption">{documentCoverageLabel(document)}</p> : null}
              {document.reason ? <p>{document.reason}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      {evidence.limitations.length ? <details className="text-body text-fg-2">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-chip underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">Search scope and limitations</summary>
        <ul className="list-disc space-y-1 pl-5 text-body text-fg-2">{evidence.limitations.map((limit, index) => <li key={index}>{limit}</li>)}</ul>
      </details> : null}
    </article>
  );
}
