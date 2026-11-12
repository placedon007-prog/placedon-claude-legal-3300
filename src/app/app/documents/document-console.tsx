"use client";

import { useActionState } from "react";
import { reviewDocumentAction, type DocumentState } from "../actions";
import { ReviewGate } from "../review-gate";
import type { DocumentFinding, DocumentStatus } from "@/lib/gateway/types";

const initial: DocumentState = { phase: "idle" };

/**
 * A glyph AND a word for every status, so the four are distinguishable with no colour —
 * the same rule the contract table follows.
 *
 * `N/A` is the one most easily misread, so its words say what it is: the check does not
 * apply to this document type. It is not a pass.
 */
const STATUS: Record<DocumentStatus, { glyph: string; word: string; meaning: string }> = {
  PASS: { glyph: "✓", word: "PASS", meaning: "the document records it" },
  DEFECT: { glyph: "✗", word: "DEFECT", meaning: "penalised in the cited orders" },
  NEEDS_BOOK: { glyph: "?", word: "NEEDS BOOK", meaning: "only the physical book can say" },
  "N/A": { glyph: "–", word: "N/A", meaning: "does not apply to this document type" },
};

const ORDER: DocumentStatus[] = ["DEFECT", "NEEDS_BOOK", "PASS", "N/A"];

export function DocumentConsole() {
  const [state, action, pending] = useActionState(reviewDocumentAction, initial);

  return (
    <>
      <form action={action}>
        <label htmlFor="file">Upload a filing</label>
        <input id="file" name="file" type="file" accept=".docx,.pdf,.txt,.md"
               aria-describedby="file-help" />
        <p className="meta" id="file-help">
          Minutes, a notice or an outcome filing. .docx, or a .pdf with a real text layer.
          No model is called by this screen: the checks are code, and nothing leaves this
          machine.
        </p>

        <div style={{ height: "1.1rem" }} />
        <label htmlFor="name">Document name</label>
        <input id="name" name="name" type="text"
               placeholder="taken from the file when you upload one" />

        <div className="field-row">
          <div>
            <label htmlFor="meeting_kind">Meeting</label>
            <select id="meeting_kind" name="meeting_kind" defaultValue="board">
              <option value="board">Board</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label htmlFor="meeting_date">Meeting date</label>
            <input id="meeting_date" name="meeting_date" type="date" />
          </div>
          <div>
            <label htmlFor="entry_date">Entered in the book</label>
            <input id="entry_date" name="entry_date" type="date" />
          </div>
        </div>
        <p className="meta">
          Leave the dates blank if you do not have them. Blank leaves the 30-day entry
          check unanswered, which is not the same as passing it.
        </p>

        <div style={{ height: "0.9rem" }} />
        <label htmlFor="text">…or paste the text</label>
        <textarea id="text" name="text"
                  placeholder="Paste the full text. Ignored when a file is attached."
                  aria-describedby={state.phase === "invalid" ? "text-error" : undefined} />

        <div className="row">
          <button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Check"}
          </button>
        </div>
      </form>

      {state.phase === "invalid" ? (
        <p className="form-error" id="text-error" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.phase === "failed" ? (
        <div className="panel register-failed" role="alert">
          <span className="register-label">Not an abstention</span>
          <p>
            The answer never arrived. This is a transport failure, not a finding about the
            document. <span className="mono">{state.error.kind}</span> —{" "}
            {state.error.message}
          </p>
        </div>
      ) : null}

      {state.phase === "reviewed" ? <Result state={state} /> : null}
    </>
  );
}

function Result({ state }: { state: Extract<DocumentState, { phase: "reviewed" }> }) {
  const { data, source } = state;

  // The type could not be determined. NOT a clean bill — and the screen must not look like
  // one, so there is no table at all rather than a table of N/A rows.
  if (data.status === "UNCLASSIFIED") {
    return (
      <div className="panel register-abstain">
        <span className="register-label">Not identified</span>
        <p className="lede-sm">
          This document was not identified as minutes, a notice or an outcome filing, so no
          check was run.
        </p>
        <p className="meta">{data.note}</p>
        <p className="meta">
          <span className="mono">{source.name}</span> · {source.kind}
          {source.sha256 ? <> · sha256 {source.sha256.slice(0, 12)}…</> : null}
          {data.run_id ? <> · run {data.run_id.slice(0, 8)}</> : null}
        </p>
      </div>
    );
  }

  const sorted = [...data.findings].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
  );

  return (
    <div className="panel">
      <h3 className="result-head">
        {data.defect_count === 0
          ? "No defect found in what a file can show"
          : `${data.defect_count} defect${data.defect_count === 1 ? "" : "s"}`}
        <span className="meta">
          {" "}
          {source.name} · read as <strong>{data.doc_type}</strong>
          {source.sha256 ? <> · sha256 {source.sha256.slice(0, 12)}…</> : null} ·{" "}
          {data.checks_run} checks
          {data.needs_human_count > 0
            ? ` · ${data.needs_human_count} need a person`
            : ""}
          {data.run_id ? ` · run ${data.run_id.slice(0, 8)}` : ""}
        </span>
      </h3>

      <p className="meta">{data.note}</p>

      <table className="findings">
        <thead>
          <tr>
            <th scope="col">Check</th>
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
    </div>
  );
}

function Row({
  finding,
  runId,
}: {
  finding: DocumentFinding;
  runId: string | null | undefined;
}) {
  const s = STATUS[finding.status];
  return (
    <tr>
      <td>
        <span className="mono">{finding.rule_id}</span>
        <div className="meta">{finding.source}</div>
      </td>
      <td>
        <span className={`status status-${finding.status.toLowerCase().replace("/", "")}`}>
          <span className="glyph" aria-hidden="true">
            {s.glyph}
          </span>
          <span className="status-word">{s.word}</span>
        </span>
        <div className="meta">{s.meaning}</div>
      </td>
      <td>
        <p className="quoted">{finding.quoted_span}</p>
        {/* The human gate, on the rows a person must resolve. Never on a PASS: a control
            offering to approve something nobody needs to judge is how a reviewer learns to
            click through the ones that matter. */}
        {finding.needs_human ? (
          <ReviewGate
            runId={runId}
            itemRef={`ss:${finding.rule_id}`}
            quotedSpan={finding.quoted_span}
            label={`${finding.rule_id} (${finding.source})`}
          />
        ) : null}
      </td>
      <td>
        <p className="standard-text">{finding.defect}</p>
        <p className="meta standard-rationale">Penalised in: {finding.precedent}</p>
      </td>
    </tr>
  );
}
