"use client";

import { useActionState } from "react";
import { askAction, type AskState } from "./actions";

const initial: AskState = { phase: "idle" };

/** Refusal codes the pipeline produces, in the words a reader needs. */
const REFUSAL: Record<string, string> = {
  NO_EVIDENCE:
    "Retrieval abstained. No provision in the held corpus answers this, and no model was called.",
  NOTHING_TRACED:
    "A model answered and every sentence it wrote failed to trace back to the provisions it was given. Nothing it said is shown, because none of it could be attributed.",
  NO_MODEL: "No model was available for this task, so no answer was attempted.",
  NO_BUDGET: "The budget guard refused before any call was made.",
};

export function AskConsole() {
  const [state, action, pending] = useActionState(askAction, initial);

  return (
    <>
      <form action={action}>
        <label htmlFor="question">Question</label>
        <textarea
          id="question"
          name="question"
          required
          placeholder="What is the time limit for holding an annual general meeting under section 96?"
          aria-describedby={state.phase === "invalid" ? "question-error" : undefined}
        />
        <div className="row">
          <button type="submit" disabled={pending}>
            {pending ? "Asking…" : "Ask"}
          </button>
          <span className="meta">
            {pending ? "A live model answer takes a few seconds." : null}
          </span>
        </div>
        {state.phase === "invalid" ? (
          <p className="field-error" id="question-error" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>

      {state.phase === "answered" ? <Answer state={state} /> : null}
      {state.phase === "refused" ? <Refusal state={state} /> : null}
      {state.phase === "failed" ? <Failure state={state} /> : null}
    </>
  );
}

function Provenance({
  model,
  degraded,
  runId,
}: {
  model?: string | null;
  degraded?: boolean;
  runId?: string | null;
}) {
  return (
    <p className="meta">
      {model ? <>model {model}</> : "no model"}
      {degraded ? " · degraded route" : null}
      {runId ? (
        <>
          {" · run "}
          <a href={`/app/runs/${runId}`}>{runId.slice(0, 8)}</a>
        </>
      ) : null}
    </p>
  );
}

function Answer({ state }: { state: Extract<AskState, { phase: "answered" }> }) {
  const { data, parsed } = state;
  return (
    <section className="panel" aria-label="Answer">
      <div className="panel-head">
        <h3>{data.status === "PARTIAL" ? "Partial answer" : "Answer"}</h3>
        <Provenance model={data.model} degraded={data.degraded} runId={data.run_id} />
      </div>

      {parsed.notice ? (
        <p className="meta" style={{ marginBottom: "1rem" }}>
          {parsed.notice}
        </p>
      ) : null}

      {parsed.sentences.length > 0 ? (
        <ol className="cited">
          {parsed.sentences.map((s) => (
            <li key={s.n}>
              <p className="claim">{s.text}</p>
              <p className="basis">
                {s.section ? (
                  <span className="section mono">Section {s.section}</span>
                ) : null}
                <span>{s.source}</span>
                {s.span ? (
                  <span>
                    chars {s.span[0]}–{s.span[1]}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        /* The parse did not recognise the shape. The served text is shown VERBATIM rather
           than reconstructed — this app never authors a legal sentence. */
        <pre className="quoted" style={{ whiteSpace: "pre-wrap" }}>
          {parsed.raw}
        </pre>
      )}

      {typeof data.dropped === "number" && data.dropped > 0 ? (
        <p className="meta" style={{ marginTop: "1rem" }}>
          {data.dropped} sentence(s) the model wrote did not trace and are not shown.
        </p>
      ) : null}
    </section>
  );
}

function Refusal({ state }: { state: Extract<AskState, { phase: "refused" }> }) {
  const { data } = state;
  const code = data.code ?? "REFUSED";
  return (
    <section className="panel register-abstain" aria-label="Refusal">
      <div className="panel-head">
        <span className="register-label">Abstained · {code}</span>
        <Provenance model={data.model} degraded={data.degraded} runId={data.run_id} />
      </div>
      <p>{REFUSAL[code] ?? "No answer is served."}</p>
      {data.reason ? (
        <p className="quoted" style={{ marginTop: "0.9rem" }}>
          {data.reason}
        </p>
      ) : null}
      {data.provisions && data.provisions.length > 0 ? (
        <p className="meta" style={{ marginTop: "0.9rem" }}>
          Provisions retrieved: {data.provisions.join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

function Failure({ state }: { state: Extract<AskState, { phase: "failed" }> }) {
  const { error } = state;
  return (
    <section className="panel register-failure" aria-label="Engine failure" role="alert">
      <div className="panel-head">
        <span className="register-label">Engine failure · {error.kind}</span>
        <span className="meta">{error.route}</span>
      </div>
      <p>
        <strong>This is not an abstention.</strong> The answer never arrived, so nothing is
        known about the question either way. Nothing here has been verified or refused.
      </p>
      <p className="quoted" style={{ marginTop: "0.9rem" }}>
        {error.message}
        {error.detail ? ` — ${error.detail}` : null}
        {error.status ? ` (HTTP ${error.status})` : null}
      </p>
      {error.issues?.length ? (
        <ul className="meta" style={{ marginTop: "0.9rem" }}>
          {error.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
