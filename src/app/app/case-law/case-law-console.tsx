"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { EngineError } from "@/lib/engine/errors";
import { judgmentPdfUrl, type CaseLawRenderModel } from "@/lib/case-law";
import { searchCaseLawAction, type CaseLawSearchState } from "../actions";

function Failure({ error }: { error: EngineError }) {
  return (
    <div role="alert" className="transport-failure">
      <h3>The gateway did not answer</h3>
      <p>{error.message}</p>
      <p className="meta">
        {error.kind} · {error.route}
        {error.status ? ` · HTTP ${error.status}` : ""}
      </p>
      <p className="meta">
        A transport failure. No search ran, and this says nothing about any case.
      </p>
    </div>
  );
}

function Results({ model }: { model: CaseLawRenderModel }) {
  return (
    <section aria-label="Case-law results">
      <p role="status" className="register-label">
        Supporting authority — not a verified statutory answer
      </p>
      {model.note && <p className="meta">{model.note}</p>}
      {model.hits.length === 0 ? (
        <p className="cal-empty">
          No judgment matched &ldquo;{model.query}&rdquo;. Try the case title, a party, or a
          short legal topic. A missing result does not mean no case exists.
        </p>
      ) : (
        <ul className="vault-hits">
          {model.hits.map((hit) => {
            const pdfUrl = judgmentPdfUrl(hit);
            return <li key={hit.id}>
              <p>
                <strong>{hit.title}</strong>
              </p>
              <p className="meta">
                {hit.parties.join(" v. ")} · {hit.year} · {hit.court}
              </p>
              <p className="meta mono">
                {hit.date} · {hit.tier} · public-data copy; verify against the court record
              </p>
              {pdfUrl ? <a className="mt-2 inline-flex min-h-11 items-center rounded px-2 font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2" href={pdfUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open public-data PDF for ${hit.title} in a new tab`}>Open judgment PDF<span className="sr-only"> (opens in a new tab)</span></a> : <span className="meta">PDF link unavailable for this record.</span>}
            </li>
          })}
        </ul>
      )}
      {model.notSearched.length > 0 && (
        <p className="meta">
          Not searched: {model.notSearched.map((n) => n.sourceId).join(", ")}
        </p>
      )}
    </section>
  );
}

export function CaseLawConsole() {
  const [state, setState] = useState<CaseLawSearchState | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setState(await searchCaseLawAction(query));
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="case-law-query">Case name, party, or legal topic</label>
        <input
          id="case-law-query"
          name="query"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Tata v Cyrus, or oppression and mismanagement"
          aria-describedby="case-law-help"
        />
        <p className="meta" id="case-law-help">
          Searches the available Supreme Court and High Court judgment collections. Topic
          discovery depends on the collection’s search index; results are supporting authority,
          not live case status or a verified statutory answer. Use Ask to search held statutes.
        </p>
        <button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {state?.phase === "invalid" && (
        <p role="alert" className="invalid">
          {state.message}
        </p>
      )}
      {state?.phase === "failed" && <Failure error={state.error} />}
      {state?.phase === "found" && <Results model={state.model} />}
    </>
  );
}
