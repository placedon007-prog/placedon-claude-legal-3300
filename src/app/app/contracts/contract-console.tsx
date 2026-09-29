"use client";

import { useActionState } from "react";
import { reviewAction, type ReviewState } from "../actions";
import type { Finding, FindingStatus } from "@/lib/gateway/types";

const initial: ReviewState = { phase: "idle" };

/**
 * A glyph AND a word for every status, so the four are distinguishable with no colour at
 * all — AGENTS.md requires it and a lawyer printing this in greyscale needs it.
 */
const STATUS: Record<FindingStatus, { glyph: string; word: string; meaning: string }> = {
  MATCHES: { glyph: "=", word: "MATCHES", meaning: "meets the standard" },
  DEVIATES: { glyph: "≠", word: "DEVIATES", meaning: "differs from the standard" },
  MISSING: { glyph: "—", word: "MISSING", meaning: "the standard expects it; none found" },
  NEEDS_LAWYER: { glyph: "?", word: "NEEDS LAWYER", meaning: "code cannot decide" },
};

const ORDER: FindingStatus[] = ["DEVIATES", "NEEDS_LAWYER", "MISSING", "MATCHES"];

export function ContractConsole() {
  const [state, action, pending] = useActionState(reviewAction, initial);

  return (
    <>
      <form action={action}>
        <label htmlFor="name">Document name</label>
        <input id="name" name="name" type="text" defaultValue="nda.txt" />
        <div style={{ height: "0.9rem" }} />
        <label htmlFor="text">Contract text</label>
        <textarea
          id="text"
          name="text"
          required
          placeholder="Paste the full text of the NDA."
          aria-describedby={state.phase === "invalid" ? "text-error" : undefined}
        />
        <div className="row">
          <label className="checkline" htmlFor="test_data">
            <input id="test_data" name="test_data" type="checkbox" />
            <span>
              This is a <strong>test document</strong>, not a client contract. The model is
              hosted in <span className="mono">UAE North</span>, which has not been confirmed
              acceptable for client data.
            </span>
          </label>
        </div>
        <div className="row">
          <button type="submit" disabled={pending}>
            {pending ? "Reading…" : "Review"}
          </button>
        </div>
        {state.phase === "invalid" ? (
          <p className="field-error" id="text-error" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>

      {state.phase === "reviewed" ? <Findings data={state.data} /> : null}
      {state.phase === "failed" ? (
        <section className="panel register-failure" role="alert" aria-label="Engine failure">
          <div className="panel-head">
            <span className="register-label">Engine failure · {state.error.kind}</span>
            <span className="meta">{state.error.route}</span>
          </div>
          <p>
            <strong>This is not a finding.</strong> The review never ran, so nothing is known
            about this document.
          </p>
          <p className="quoted" style={{ marginTop: "0.9rem" }}>
            {state.error.message}
            {state.error.status ? ` (HTTP ${state.error.status})` : null}
          </p>
        </section>
      ) : null}
    </>
  );
}

function Findings({ data }: { data: Extract<ReviewState, { phase: "reviewed" }>["data"] }) {
  const sorted = [...data.findings].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
  );
  const open = sorted.filter((f) => f.status !== "MATCHES").length;

  return (
    <section className="panel" aria-label="Findings">
      <div className="panel-head">
        <h3>
          {open} of {sorted.length} rules need a look
        </h3>
        <p className="meta">
          playbook {data.playbook_status}
          {data.model ? ` · model ${data.model}` : null}
          {typeof data.clauses_in_contract === "number"
            ? ` · ${data.clauses_in_contract} clauses read`
            : null}
          {data.run_id ? (
            <>
              {" · run "}
              <a href={`/app/runs/${data.run_id}`}>{data.run_id.slice(0, 8)}</a>
            </>
          ) : null}
        </p>
      </div>

      <table className="findings">
        <caption className="meta">
          Every row is a potential issue against a company standard — never a statement that
          a clause is valid, enforceable or void.
        </caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Status</th>
            <th scope="col">What the document says</th>
            <th scope="col">The standard</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <Row key={f.rule_id} finding={f} />
          ))}
        </tbody>
      </table>

      {data.unverified.length > 0 ? (
        <div className="panel register-abstain" style={{ marginTop: "1.25rem" }}>
          <span className="register-label">Not graded</span>
          <p style={{ marginTop: "0.6rem" }}>
            {data.unverified.length} value(s) could not be re-derived from a verbatim span,
            so they were not graded against the standard.
          </p>
          <ul className="meta">
            {data.unverified.map((u) => (
              <li key={u.clause}>
                {u.clause} — {u.why}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.law_not_held.length > 0 ? (
        <div className="panel register-abstain" style={{ marginTop: "1.25rem" }}>
          <span className="register-label">Law not held</span>
          <p style={{ marginTop: "0.6rem" }}>
            A contract reaches these bodies of law and this corpus does not hold them, so
            nothing above is decided against any of them.
          </p>
          <ul className="meta" style={{ display: "grid", gap: "0.6rem" }}>
            {data.law_not_held.map((l) => (
              <li key={l.body}>
                <span className="mono">{l.body}</span> — {l.refusal}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Row({ finding }: { finding: Finding }) {
  const s = STATUS[finding.status];
  return (
    <tr>
      <td>
        <span className="mono">{finding.rule_id}</span>
        <div className="meta">{finding.clause}</div>
      </td>
      <td>
        <span className={`status status-${finding.status.toLowerCase()}`}>
          <span className="glyph" aria-hidden="true">
            {s.glyph}
          </span>
          <span className="status-word">{s.word}</span>
        </span>
        <div className="meta">{s.meaning}</div>
      </td>
      <td>
        <p className="quoted">{finding.detail}</p>
      </td>
      <td>{finding.why ? <span className="meta">{finding.why}</span> : null}</td>
    </tr>
  );
}
