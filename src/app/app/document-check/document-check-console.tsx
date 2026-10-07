"use client";

import { useActionState } from "react";
import { documentCheckAction, type DocumentCheckState } from "./actions";
import type { DocumentCheckOk, DocCheckLine } from "@/lib/gateway/types";

const initial: DocumentCheckState = { phase: "idle" };

/**
 * A glyph AND a word for the action, so the five are told apart with no colour. The action
 * is what a lawyer DOES; it is never a statement that the document is legally valid, and
 * NEEDS_LAWYER — the common, honest answer today — reads as a handoff, not a defect.
 */
const ACTION: Record<string, { glyph: string; word: string; cls: string }> = {
  KEEP: { glyph: "✓", word: "KEEP", cls: "status-pass" },
  RENEW_BY: { glyph: "⟳", word: "RENEW BY", cls: "status-deviates" },
  REPLACE: { glyph: "↻", word: "REPLACE", cls: "status-defect" },
  REMOVE: { glyph: "⌫", word: "REMOVE", cls: "status-defect" },
  NEEDS_LAWYER: { glyph: "?", word: "NEEDS LAWYER", cls: "status-needs_lawyer" },
};

/** Maps a verification check's result word to a glyph. NOT_CHECKED is neither pass nor fail. */
function lineGlyph(result: string): { glyph: string; cls: string } {
  const r = result.toUpperCase();
  if (r === "PASS") return { glyph: "✓", cls: "status-pass" };
  if (r === "FAIL" || r === "FAILED" || r === "MODIFIED") return { glyph: "✗", cls: "status-defect" };
  if (r.startsWith("NOT")) return { glyph: "–", cls: "status-needs_book" };
  return { glyph: "·", cls: "" };
}

/** `initialDocumentId` arrives from the composer's attach flow (Wall System → here). */
export function DocumentCheckConsole({ initialDocumentId = "" }: { initialDocumentId?: string }) {
  const [state, action, pending] = useActionState(documentCheckAction, initial);

  return (
    <>
      <form action={action}>
        <label htmlFor="document_id">Document id</label>
        <input
          id="document_id"
          name="document_id"
          type="text"
          defaultValue={initialDocumentId}
          placeholder="the sha256 or vault id — copy it from Wall System"
          aria-describedby="doc-help"
        />
        <p className="meta" id="doc-help">
          This checks a document already in your vault. It reads the stored bytes, so the
          document is never re-uploaded here. Upload first in Wall System and paste its
          id.
        </p>

        <div className="field-row">
          <div>
            <label htmlFor="as_of">Judge validity as of</label>
            <input id="as_of" name="as_of" type="date" aria-describedby="asof-help" />
          </div>
          <div>
            <label htmlFor="revoked_on">Revoked on</label>
            <input id="revoked_on" name="revoked_on" type="date" />
          </div>
        </div>
        <p className="meta" id="asof-help">
          A certificate valid in March is expired in October — the same bytes give a
          different answer on a different date. Blank means today. Each check is a new row:
          what you were told, when.
        </p>

        <div style={{ height: "0.9rem" }} />
        <label htmlFor="superseded_by">Superseded by</label>
        <input
          id="superseded_by"
          name="superseded_by"
          type="text"
          placeholder="the instrument that replaced this one, if you know of one"
        />
        <p className="meta">
          A fact you supply. It is never inferred — nothing here guesses that one document
          replaced another.
        </p>

        <div className="row">
          <label className="check-inline" htmlFor="renewable">
            <input id="renewable" name="renewable" type="checkbox" />
            <span>This class of document can be renewed rather than replaced</span>
          </label>
        </div>

        <div className="row">
          <button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Check document"}
          </button>
        </div>
      </form>

      {state.phase === "invalid" ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.phase === "refused" ? (
        <div className="panel register-abstain" role="status">
          <span className="register-label">Refused — {state.code}</span>
          <p className="lede-sm">{state.detail}</p>
          <p className="meta">
            A refusal is the verb&rsquo;s answer, not a breakdown. No check was recorded,
            because a judgement in the audit record where there was none would be worse than
            none.
          </p>
        </div>
      ) : null}

      {state.phase === "failed" ? (
        <div className="panel register-failed" role="alert">
          <span className="register-label">Not an abstention</span>
          <p>
            The answer never arrived. This is a transport failure, not a finding about the
            document. <span className="mono">{state.error.kind}</span> — {state.error.message}
          </p>
        </div>
      ) : null}

      {state.phase === "checked" ? <Result data={state.data} /> : null}
    </>
  );
}

function Result({ data }: { data: DocumentCheckOk }) {
  const a = ACTION[data.action.action] ?? {
    glyph: "·",
    word: data.action.action,
    cls: "",
  };

  return (
    <div className="panel">
      <h3 className="result-head">
        <span className={`status ${a.cls}`}>
          <span className="glyph" aria-hidden="true">
            {a.glyph}
          </span>
          <span className="status-word">{a.word}</span>
        </span>
        <span className="meta">
          {" "}
          {data.name ? `${data.name} · ` : ""}as of {data.as_of}
          {data.check_id ? <> · check {data.check_id.slice(0, 12)}…</> : null}
        </span>
      </h3>

      <p className="lede-sm">{data.action.reason}</p>
      {data.action.renew_by ? (
        <p className="meta">Renew by {data.action.renew_by}.</p>
      ) : null}

      {/* Validity — kept separate from the action, and never dressed as a clean bill. */}
      <div className="sub-head">
        <span className="mono">{data.validity.status}</span>
        <span className="meta"> — is it still in force?</span>
      </div>
      <p className="meta">{data.validity.reason}</p>
      {data.validity.expires_on ? (
        <p className="meta">Derived end date: {data.validity.expires_on}.</p>
      ) : null}
      {data.validity.citation ? (
        <p className="meta">
          Rule: {data.validity.citation}
          {data.validity.law_held === false ? " (not held — the Act is not in the corpus)" : ""}
        </p>
      ) : null}

      {/* Verification — one line per check, never a single genuine/forged badge. */}
      <div className="sub-head">
        <span className="mono">{data.verification.overall}</span>
        <span className="meta"> — was it signed, and are the bytes unchanged?</span>
      </div>
      <table className="findings">
        <thead>
          <tr>
            <th scope="col">Check</th>
            <th scope="col">Result</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {data.verification.checks.map((c: DocCheckLine) => {
            const g = lineGlyph(c.result);
            return (
              <tr key={c.field ?? c.name}>
                <td>{c.name}</td>
                <td>
                  <span className={`status ${g.cls}`}>
                    <span className="glyph" aria-hidden="true">
                      {g.glyph}
                    </span>
                    <span className="status-word">{c.result}</span>
                  </span>
                </td>
                <td className="meta">{c.detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="meta">{data.verification.sentence}</p>

      <p className="meta">
        {data.recorded
          ? "Recorded, append-only. This is what you were told on this date; a later check writes a new row rather than overwriting it."
          : "Not recorded."}
      </p>
      {data.note ? <p className="meta">{data.note}</p> : null}
    </div>
  );
}
