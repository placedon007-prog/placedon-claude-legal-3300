import type { DocumentSummary } from "@/lib/gateway/types";

/** Model prose remains a review draft; the source quote and locator stay one click away. */
export function DocumentSummaryAnswer({ summary }: { summary: DocumentSummary }) {
  if (summary.status === "NO_VALID_ITEMS") {
    return <section aria-label="Document summary" className="space-y-3 rounded-card border border-line p-4">
      <h3 className="text-title font-semibold text-fg">No summary items passed quotation checks</h3>
      <p className="text-read text-fg-2">The response did not provide exact quotations that matched the selected files. No summary was shown.</p>
      <SummaryCoverage summary={summary} />
      <SummaryLimits summary={summary} />
    </section>;
  }
  return <article aria-label="Document summary draft" className="flex min-w-0 flex-col gap-4">
    <header className="space-y-1">
      <h3 className="text-title font-semibold text-fg">Document summary</h3>
      <p className="text-ui text-fg-2">Partial AI summary · Review each point against the quoted text. Matching words do not prove legal meaning or completeness.</p>
    </header>
    {summary.sections.map((section) => <section key={section.heading} aria-label={section.heading} className="space-y-2">
      <h4 className="text-body font-semibold text-fg">{section.heading}</h4>
      <ul className="space-y-3">
        {section.items.map((item, index) => <li key={`${section.heading}-${index}`} className="rounded-card border border-line p-3">
          <p className="max-w-[72ch] whitespace-pre-wrap text-read text-fg">{item.text}</p>
          <details className="mt-2 text-ui text-fg-2">
            <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">View quoted text{item.quotes.length === 1 ? "" : ` (${item.quotes.length})`}</summary>
            <ol className="space-y-3 pb-2">
              {item.quotes.map((source) => <li key={`${source.passage_id}-${source.start}`} className="space-y-1">
                <p className="font-medium text-fg">{source.document_name}</p>
                <blockquote className="max-w-[72ch] whitespace-pre-wrap border-l-2 border-line pl-3 text-read text-fg">{source.quote}</blockquote>
                <p className="break-all font-mono text-caption">Manual locator: extracted text characters {source.start}–{source.end} · SHA-256 {source.sha256}. Open the source document separately to review this passage.</p>
              </li>)}
            </ol>
          </details>
        </li>)}
      </ul>
    </section>)}
    {summary.withheld_items ? <p role="status" className="text-ui text-fg-2">{summary.withheld_items} point{summary.withheld_items === 1 ? " was" : "s were"} omitted because its supporting passage could not be validated.</p> : null}
    <SummaryCoverage summary={summary} />
    <SummaryLimits summary={summary} />
  </article>;
}

function SummaryCoverage({ summary }: { summary: DocumentSummary }) {
  return <section aria-label="Summary coverage" className="space-y-1 border-t border-line pt-3">
    <h4 className="text-body font-medium text-fg">Text included</h4>
    <ul className="space-y-1 text-ui text-fg-2">
      {summary.coverage.map((doc) => <li key={doc.document_id}>{doc.name} — {doc.shown_passages} of {doc.total_passages} extracted text passages included</li>)}
    </ul>
  </section>;
}

function SummaryLimits({ summary }: { summary: DocumentSummary }) {
  return <details className="text-ui text-fg-2">
    <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">Scope and limits</summary>
    <ul className="list-disc space-y-1 pl-5">{summary.limitations.map((limit, i) => <li key={i}>{limit}</li>)}</ul>
  </details>;
}
