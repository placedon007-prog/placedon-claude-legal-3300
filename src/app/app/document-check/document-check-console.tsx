"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { FileDropInput } from "@/components/ui/file-drop-input";
import { documentCheckAction, type DocumentCheckState } from "./actions";
import { vaultUploadAction, type VaultState } from "../vault/actions";
import { documentReadinessAction } from "../actions";
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
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [check, action, pending] = useActionState(async (_previous: { version: string; result: DocumentCheckState }, data: FormData) => ({
    version: String(data.get("selection_version") ?? ""),
    result: await documentCheckAction(initial, data),
  }), { version: "", result: initial });
  const state = check.version === String(selectionVersion) ? check.result : initial;
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState("");
  const [revokedOn, setRevokedOn] = useState("");
  const [supersededBy, setSupersededBy] = useState("");
  const [renewable, setRenewable] = useState(false);
  const [uploadProblem, setUploadProblem] = useState<string | null>(null);
  const [readinessChecks, setReadinessChecks] = useState(0);

  function clearDocument() {
    setSelectionVersion((version) => version + 1);
    setDocumentId("");
    setSelectedName(null);
    setReadiness(null);
  }

  useEffect(() => {
    if (!documentId || readiness !== "PENDING" || readinessChecks >= 5) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      try {
        const current = await documentReadinessAction(documentId);
        if (live) setReadiness(current.state);
      } catch {
        if (live) setReadiness("UNKNOWN");
      } finally {
        if (live) setReadinessChecks((n) => n + 1);
      }
    }, Math.min(15_000, 1_500 * 2 ** readinessChecks));
    return () => { live = false; window.clearTimeout(timer); };
  }, [documentId, readiness, readinessChecks]);

  async function upload(file: File) {
    if (uploading) return;
    setUploading(true);
    setUploadProblem(null);
    clearDocument();
    const data = new FormData();
    data.set("file", file);
    data.set("name", file.name);
    try {
      const result: VaultState = await vaultUploadAction({ phase: "idle" }, data);
      if (result.phase === "uploaded") {
        setDocumentId(result.documentId);
        setSelectedName(result.name);
        setReadiness(result.state);
        setReadinessChecks(0);
      } else {
        setUploadProblem(result.phase === "invalid" ? result.message
          : result.phase === "refused" ? result.detail
          : result.phase === "failed" ? "The upload did not complete. Try again." : "The upload did not complete.");
      }
    } catch {
      setUploadProblem("The upload was interrupted. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <section aria-labelledby="document-check-file-title">
        <h3 id="document-check-file-title">1. Add a document</h3>
        <FileDropInput id="document-check-file" onSelected={(file) => { void upload(file); }}
          onInvalid={clearDocument} onRemoved={clearDocument} disabled={uploading || pending || refreshing} />
        <p className="meta">Readable text is stored in Wall System before checking. The original file and its digital signature are not preserved by this upload. Do not upload client-confidential files to this shared-passcode prototype.</p>
        {uploading ? <p role="status">Storing and reading the document…</p> : null}
        {uploadProblem ? <p role="alert" className="form-error">{uploadProblem}</p> : null}
        {selectedName ? <p role="status">Selected: {selectedName} · {readiness === "INGESTED" ? "ready to check" : readiness === "PARTIAL" ? "partly read; review with care" : readiness === "CANNOT_READ" ? "cannot be read" : readiness === "FAILED" ? "processing failed; retry it in Wall System" : readiness === "UNKNOWN" ? "status unavailable; refresh to retry" : "processing"}</p> : null}
        {documentId && !selectedName ? <p role="status">Stored document selected: {documentId}</p> : null}
        {selectedName && readiness !== "INGESTED" && readiness !== "CANNOT_READ" ? <button type="button" disabled={refreshing || pending || uploading} onClick={async () => {
          setRefreshing(true);
          try {
            const current = await documentReadinessAction(documentId);
            setReadiness(current.state);
            setReadinessChecks(0);
          } catch {
            setReadiness("UNKNOWN");
            setUploadProblem("File status could not be refreshed. Try again.");
          } finally {
            setRefreshing(false);
          }
        }}>Refresh file status</button> : null}
        <p className="meta"><Link href="/app/vault">Browse Wall System</Link> to find an existing document.</p>
      </section>
      <form action={action} onChange={() => setSelectionVersion((version) => version + 1)}>
        <fieldset disabled={pending || uploading || refreshing} className="m-0 min-w-0 border-0 p-0">
        <input name="selection_version" type="hidden" value={selectionVersion} />
        <h3>2. Set the check date and known facts</h3>
        <input name="document_id" type="hidden" value={documentId} />
        <details>
          <summary>Use an existing Wall System document ID</summary>
          <label htmlFor="document-id-manual">Document ID</label>
          <input id="document-id-manual" type="text" value={documentId} maxLength={128}
            placeholder="Paste the ID from Wall System" onChange={(event) => { setDocumentId(event.target.value); setSelectedName(null); setReadiness(null); }} />
        </details>

        <div className="field-row">
          <div>
            <label htmlFor="as_of">Judge validity as of</label>
            <input id="as_of" name="as_of" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} aria-describedby="asof-help" />
          </div>
          <div>
            <label htmlFor="revoked_on">Revoked on</label>
            <input id="revoked_on" name="revoked_on" type="date" value={revokedOn} onChange={(event) => setRevokedOn(event.target.value)} />
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
          value={supersededBy}
          onChange={(event) => setSupersededBy(event.target.value)}
          type="text"
          placeholder="the instrument that replaced this one, if you know of one"
        />
        <p className="meta">
          A fact you supply. It is never inferred — nothing here guesses that one document
          replaced another.
        </p>

        <div className="row">
          <label className="check-inline" htmlFor="renewable">
            <input id="renewable" name="renewable" type="checkbox" checked={renewable} onChange={(event) => setRenewable(event.target.checked)} />
            <span>This class of document can be renewed rather than replaced</span>
          </label>
        </div>

        <div className="row">
          <button type="submit" disabled={pending || uploading || !documentId || readiness === "CANNOT_READ" || readiness === "FAILED" || readiness === "PENDING" || readiness === "UNKNOWN"}>
            {pending ? "Checking…" : "Check document"}
          </button>
        </div>
        </fieldset>
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
      <table className="findings findings-labeled">
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
                <td><span className="mobile-cell-label" aria-hidden="true">Check</span>{c.name}</td>
                <td>
                  <span className="mobile-cell-label" aria-hidden="true">Result</span>
                  <span className={`status ${g.cls}`}>
                    <span className="glyph" aria-hidden="true">
                      {g.glyph}
                    </span>
                    <span className="status-word">{c.result}</span>
                  </span>
                </td>
                <td className="meta"><span className="mobile-cell-label" aria-hidden="true">Detail</span>{c.detail}</td>
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
