"use client";

import { useActionState } from "react";
import { reviewAction, type ReviewState } from "../actions";
import { ReviewGate } from "../review-gate";
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
        <label htmlFor="file">Upload a contract</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".docx,.pdf,.txt,.md"
          aria-describedby="file-help"
        />
        <p className="meta" id="file-help">
          .docx, or a .pdf that has a real text layer. A scan has no text layer and is
          refused rather than half-read. Nothing is stored beyond this deployment.
        </p>

        <div style={{ height: "1.1rem" }} />
        <label htmlFor="name">Document name</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="taken from the file when you upload one"
        />
        <div style={{ height: "0.9rem" }} />
        <label htmlFor="text">…or paste the text</label>
        <textarea
          id="text"
          name="text"
          placeholder="Paste the full text of the NDA. Ignored when a file is attached."
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

      {state.phase === "reviewed" ? (
        <Findings phase="reviewed" data={state.data} source={state.source} />
      ) : null}
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

function Findings({
  data,
  source,
}: Extract<ReviewState, { phase: "reviewed" }>) {
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
          {source.kind === "pasted" ? "pasted text" : `${source.name} · ${source.kind}`}
          {source.sha256 ? ` · sha256 ${source.sha256.slice(0, 12)}…` : null} ·{" "}
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
            <Row key={f.rule_id} finding={f} runId={data.run_id} />
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

function Row({ finding, runId }: { finding: Finding; runId: string | null | undefined }) {
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
        {/* Only on the rows a person must resolve. A control offering to approve a MATCHES
            is how a reviewer learns to click through the ones that matter. */}
        {finding.status === "NEEDS_LAWYER" ? (
          <ReviewGate
            runId={runId}
            itemRef={`playbook:${finding.rule_id}`}
            quotedSpan={finding.detail}
            label={`${finding.rule_id} (${finding.clause})`}
          />
        ) : null}
      </td>
      <td>
        {finding.standard_text ? (
          <>
            <p className="standard-text">{finding.standard_text}</p>
            {finding.rationale ? (
              <p className="meta standard-rationale">{finding.rationale}</p>
            ) : null}
          </>
        ) : (
          // Not a blank cell. A standard the backend did not send is a finding whose
          // basis is missing, and saying so is the honest render — silence here reads
          // as "no standard applies", which is the opposite of what a finding means.
          <span className="meta">The playbook sent no standard for this rule.</span>
        )}
      </td>
    </tr>
  );
}
