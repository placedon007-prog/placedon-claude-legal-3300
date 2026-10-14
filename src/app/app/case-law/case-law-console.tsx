"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { EngineError } from "@/lib/engine/errors";
import type { CaseLawRenderModel } from "@/lib/case-law";
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
          No case matched &ldquo;{model.query}&rdquo;. Discovery finds a case by party or
          case name, not legal topic — try the parties or the exact case title.
        </p>
      ) : (
        <ul className="vault-hits">
          {model.hits.map((hit) => (
            <li key={hit.id}>
              <p>
                <strong>{hit.title}</strong>
              </p>
              <p className="meta">
                {hit.parties.join(" v. ")} · {hit.year} · {hit.court}
              </p>
              <p className="meta mono">
                {hit.date} · {hit.tier} · {hit.openTarget}
              </p>
              {/* aria-disabled keeps it focusable so the label can say why it does nothing. */}
              <button
                type="button"
                aria-disabled="true"
                aria-label={`Open ${hit.title} — not wired in this console yet`}
                onClick={(event) => event.preventDefault()}
                className="cursor-not-allowed"
              >
                Open — coming soon
              </button>
            </li>
          ))}
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
        <label htmlFor="case-law-query">Party or case name</label>
        <input
          id="case-law-query"
          name="query"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tata Consultancy Services v. Cyrus Investments"
          aria-describedby="case-law-help"
        />
        <p className="meta" id="case-law-help">
          Search is by party or case name, not legal topic. It does not search the statute —
          use Ask for that.
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
