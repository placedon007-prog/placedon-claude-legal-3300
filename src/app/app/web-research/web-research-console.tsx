"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock3, Globe2, Scale, Search } from "lucide-react";
import { webResearchAction, type WebResearchState } from "../actions";

type Mode = "GENERAL_WEB" | "CASE_DISCOVERY";

export function WebResearchConsole() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("GENERAL_WEB");
  const [consent, setConsent] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<WebResearchState | null>(null);

  React.useEffect(() => {
    try {
      const draft = sessionStorage.getItem("placedon-web-draft");
      if (!draft) return;
      const timer = window.setTimeout(() => {
        setQuery(draft.slice(0, 800));
        sessionStorage.removeItem("placedon-web-draft");
      }, 0);
      return () => window.clearTimeout(timer);
    } catch { /* A typed question can still be entered directly. */ }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState(null);
    try {
      const next = await webResearchAction({ query, mode, externalSearchConsent: consent });
      if (next.phase === "signed_out") {
        router.push(`/login?next=${encodeURIComponent("/app/web-research")}`);
        return;
      }
      setState(next);
    } catch {
      setState({ phase: "invalid", message: "The search did not complete. Your question was not answered." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-7 max-w-4xl">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Research type">
        <button
          type="button"
          aria-pressed={mode === "GENERAL_WEB"}
          onClick={() => setMode("GENERAL_WEB")}
          className="inline-flex min-h-11 items-center gap-2 rounded-chip border border-line-control px-3 text-ui aria-pressed:bg-fg aria-pressed:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Globe2 className="size-4" aria-hidden /> Search the web
        </button>
        <button
          type="button"
          aria-pressed={mode === "CASE_DISCOVERY"}
          onClick={() => setMode("CASE_DISCOVERY")}
          className="inline-flex min-h-11 items-center gap-2 rounded-chip border border-line-control px-3 text-ui aria-pressed:bg-fg aria-pressed:text-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Scale className="size-4" aria-hidden /> Find cases and reporting
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 rounded-composer border border-line-2 bg-ground p-4 shadow-float">
        <label htmlFor="web-research-query" className="sr-only">Research question</label>
        <textarea
          id="web-research-query"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setConsent(false);
          }}
          maxLength={800}
          rows={4}
          placeholder={mode === "CASE_DISCOVERY"
            ? "Find criminal judgments or reporting about…"
            : "Ask a question about public information…"}
          className="min-h-24 w-full resize-y bg-transparent text-read outline-none placeholder:text-fg-3 focus-visible:ring-2 focus-visible:ring-fg"
          required
        />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span className="text-caption text-fg-3">{query.length}/800</span>
          <button
            type="submit"
            disabled={pending || query.trim().length < 3 || !consent}
            className="inline-flex min-h-11 items-center gap-2 rounded-chip bg-fg px-4 text-ui font-medium text-ground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            {pending ? "Searching…" : "Search"}
            {!pending ? <Search className="size-4" aria-hidden /> : null}
          </button>
        </div>
      </form>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-card border border-line px-3 py-3 text-ui text-fg-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 size-4 accent-fg"
        />
        <span>
          Send this question to the public web provider, Exa. Do not include client-confidential,
          matter, or file text. Wall System files and conversation history are not sent.
        </span>
      </label>

      <p className="mt-3 text-caption text-fg-3">
        Current case status requires an official court record and a specific case identifier. Web
        reports and past judgments are shown as research sources, never as live docket status. A
        live-status request is handled locally and is not sent to Exa.
      </p>

      {state ? <ResearchState state={state} /> : null}
    </div>
  );
}

function ResearchState({ state }: { state: WebResearchState }) {
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
        <h4 className="mt-6 text-ui font-medium">Sources returned by Exa</h4>
        <ol className="mt-2 space-y-3">
          {(result.citations ?? []).map((citation, index) => (
            <li key={`${citation.url}-${index}`} className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={citation.url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">
                  {citation.title}<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <span className="text-caption text-fg-3">{citation.domain}{citation.published_at ? ` · ${citation.published_at.slice(0, 10)}` : " · publication date not provided"}</span>
              </div>
              {citation.excerpt ? <p className="mt-2 text-ui text-fg-2">{citation.excerpt}</p> : null}
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
  return <p role="status" aria-live="polite" className="mt-6 rounded-card border border-dashed border-line-control p-4 text-ui"><strong className="font-medium">{title}.</strong> {result.message ?? "Try again later."}</p>;
}
