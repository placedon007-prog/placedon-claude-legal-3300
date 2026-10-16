"use client";

import { ArrowUpRight, Clock3 } from "lucide-react";
import type { WebResearchState } from "./actions";

export function ResearchState({ state, query }: { state: WebResearchState; query: string }) {
  if (state.phase === "failed") {
    return <p role="alert" className="mt-6 rounded-card border border-dashed border-line-control p-4 text-ui">The research service did not return an answer. {state.error.message}</p>;
  }
  if (state.phase === "invalid") {
    return <p role="alert" className="mt-6 rounded-card border border-dashed border-line-control p-4 text-ui">{state.message}</p>;
  }
  if (state.phase !== "result") return null;

  const result = state.result;
  if (result.status === "ANSWERED") {
    return (
      <section aria-labelledby="research-answer-heading" aria-live="polite" className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
          <h3 id="research-answer-heading" className="text-title font-medium">Public web research</h3>
          <span className="inline-flex items-center gap-1.5 text-caption text-fg-3">
            <Clock3 className="size-3.5" aria-hidden /> Read {result.queried_at ? new Date(result.queried_at).toLocaleString() : "time not recorded"}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-read leading-7">{result.answer}</p>
        <p className="mt-3 text-caption text-fg-3">{result.note}</p>
        {result.portals?.length ? <div className="mt-4 rounded-card border border-line p-4">
          <p className="text-ui font-medium">Verify the court record</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{result.portals.map((portal) => (
            <li key={portal.url}><a className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg" href={portal.url} target="_blank" rel="noopener noreferrer">{portal.label}<ArrowUpRight className="size-4" aria-hidden /><span className="sr-only"> (opens in a new tab)</span></a></li>
          ))}</ul>
        </div> : null}
        <h4 className="mt-6 text-ui font-medium">Sources returned by Exa</h4>
        <ol className="mt-2 list-decimal space-y-3 pl-6 marker:text-fg-3">
          {(result.citations ?? []).map((citation, index) => (
            <li key={`${citation.url}-${index}`} className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={citation.url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">
                  {citation.title}<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <span className="text-caption text-fg-3">{citation.domain}{citation.published_at ? ` · ${citation.published_at.slice(0, 10)}` : " · publication date not provided"}</span>
              </div>
              {citation.excerpt ? <p className="mt-2 text-ui text-fg-2">{citation.excerpt.length > 240 ? `${citation.excerpt.slice(0, 240).trimEnd()}…` : citation.excerpt}</p> : null}
              {citation.author ? <p className="mt-2 text-caption text-fg-3">By {citation.author}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (result.status === "NEEDS_CASE_DETAILS" || result.status === "OFFICIAL_STATUS_REQUIRED") {
    return (
      <section role="status" aria-live="polite" className="mt-6 rounded-card border border-line-2 p-4">
        <h3 className="text-title font-medium">{result.status === "NEEDS_CASE_DETAILS" ? "Which case do you mean?" : "Check the official docket"}</h3>
        <p className="mt-2 text-ui text-fg-2">{result.message}</p>
        {result.portals?.length ? <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{result.portals.map((portal) => (
          <li key={portal.url}><a className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg" href={portal.url} target="_blank" rel="noopener noreferrer">{portal.label}<ArrowUpRight className="size-4" aria-hidden /><span className="sr-only"> (opens in a new tab)</span></a></li>
        ))}</ul> : null}
      </section>
    );
  }

  const title = result.status === "NOT_CONFIGURED" ? "Public search is not configured"
    : result.status === "BUSY" ? "Research is at capacity"
      : result.status === "CONSENT_REQUIRED" ? "Confirm before searching"
        : result.status === "NO_RESULTS" ? "No citable results returned"
          : "Research did not complete";
  return <div role="status" aria-live="polite" className="mt-6 rounded-card border border-dashed border-line-control p-4 text-ui">
    <p><strong className="font-medium">{title}.</strong> {result.message ?? "Try again later."}</p>
    {result.status === "NOT_CONFIGURED" ? <a
      href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
      target="_blank" rel="noopener noreferrer"
      className="mt-3 inline-flex min-h-11 items-center gap-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >Open this question in Google<ArrowUpRight className="size-4" aria-hidden /><span className="sr-only"> (opens in a new tab)</span></a> : null}
    {result.status === "NOT_CONFIGURED" ? <p className="mt-1 text-caption text-fg-3">This sends the question to Google when you choose the link. Results open outside Placedon.</p> : null}
  </div>;
}
