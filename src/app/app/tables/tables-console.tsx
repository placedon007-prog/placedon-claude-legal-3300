"use client";

import { useActionState } from "react";
import {
  tableCancelAction,
  tableCreateAction,
  tableExportAction,
  tableStatusAction,
  type TableState,
} from "./actions";
import type { CellState, TableStatus } from "@/lib/gateway/types";

const initial: TableState = { phase: "idle" };

/**
 * A glyph AND a word per cell state, so the grid is readable with no colour at all.
 *
 * PENDING and COULD NOT RUN are **not findings** — the backend's own note says so, and
 * `findings` counts only the three that describe a document. The meanings below keep that
 * distinction on screen, because a blank cell makes "the clause is absent" and "we did not
 * read it" the same cell.
 */
const CELL: Record<CellState, { glyph: string; word: string; meaning: string }> = {
  FOUND: { glyph: "✓", word: "FOUND", meaning: "read, with the span it came from" },
  NOT_FOUND: {
    glyph: "✗",
    word: "NOT FOUND",
    meaning: "read, and the answer is not in the document",
  },
  NEEDS_LAWYER: { glyph: "?", word: "NEEDS LAWYER", meaning: "a person must decide" },
  PENDING: { glyph: "·", word: "PENDING", meaning: "not attempted; NOT a finding" },
  FAILED: { glyph: "–", word: "COULD NOT RUN", meaning: "did not run; NOT a finding" },
};

function Failure({ error }: { error: TableState & { phase: "failed" } }) {
  return (
    <div role="alert" className="transport-failure">
      <h3>The gateway did not answer</h3>
      <p>{error.error.message}</p>
      <p className="meta">
        {error.error.kind} · {error.error.route}
        {error.error.status ? ` · HTTP ${error.error.status}` : ""}
      </p>
      <p className="meta">
        A transport failure. No cell has been read, and nothing above describes a document.
      </p>
    </div>
  );
}

/** `null` is UNPRICED, with the reason. Never 0 — a zero would claim the work was free. */
function Cost({ amount, note }: { amount: number | null; note: string }) {
  return (
    <p className="meta">
      {amount === null ? (
        <>
          <span className="unpriced">UNPRICED</span> — {note}
        </>
      ) : (
        <>₹{amount.toFixed(2)} — {note}</>
      )}
    </p>
  );
}

function Grid({ data }: { data: TableStatus }) {
  const columns = [...new Set(data.cells_detail.map((c) => c.column))];
  const documents = [...new Set(data.cells_detail.map((c) => c.document_id))];
  return (
    <table className="grid-table">
      <caption className="meta">
        {data.cells} cell(s) · {data.findings} finding(s). PENDING and COULD NOT RUN are
        counted separately, because neither says anything about a document.
      </caption>
      <thead>
        <tr>
          <th scope="col">Document</th>
          {columns.map((c) => (
            <th scope="col" key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {documents.map((d) => (
          <tr key={d}>
            <th scope="row" className="meta grid-doc">{d.slice(0, 12)}…</th>
            {columns.map((col) => {
              const cell = data.cells_detail.find(
                (c) => c.document_id === d && c.column === col,
              );
              if (!cell) return <td key={col}>—</td>;
              const s = CELL[cell.state];
              return (
                <td key={col} className={`cell cell-${cell.state.toLowerCase()}`}>
                  <span className="cell-state">
                    <span aria-hidden="true">{s.glyph}</span> {s.word}
                  </span>
                  {cell.state === "FOUND" && cell.value && (
                    <span className="cell-value">{cell.value}</span>
                  )}
                  {cell.quote && <span className="meta cell-quote">{cell.quote}</span>}
                  {!cell.quote && cell.reason && (
                    <span className="meta cell-quote">{cell.reason}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TablesConsole() {
  const [created, createAction, creating] = useActionState(tableCreateAction, initial);
  const [status, statusAction, loading] = useActionState(tableStatusAction, initial);
  const [exported, exportAction, exporting] = useActionState(tableExportAction, initial);
  const [cancelled, cancelAction, cancelling] = useActionState(tableCancelAction, initial);

  return (
    <>
      <section aria-label="Define a table">
        <h3>Define a table</h3>
        <form action={createAction}>
          <label htmlFor="name">Table name</label>
          <input id="name" name="name" type="text" defaultValue="NDA diligence" />

          <label htmlFor="document_ids">Documents</label>
          <textarea id="document_ids" name="document_ids" rows={3}
                    aria-describedby="docs-help"
                    defaultValue={`${"a".repeat(64)}\n${"b".repeat(64)}`} />
          <p className="meta" id="docs-help">
            One sha256 per line, as returned by the vault or an upload.
          </p>

          <label htmlFor="columns">Questions</label>
          <textarea id="columns" name="columns" rows={4} aria-describedby="cols-help"
                    defaultValue={
                      "text|governing law|Which law governs this agreement?\n" +
                      "date|term end|On what date does confidentiality expire?"
                    } />
          <p className="meta" id="cols-help">
            One per line: <code>kind|name|question</code>. Kinds: text, date, amount,
            yes_no. One run per cell — documents times questions.
          </p>

          <button type="submit" disabled={creating} className="primary">
            {creating ? "Queueing…" : "Create and queue"}
          </button>
        </form>

        {created.phase === "invalid" && (
          <p role="alert" className="invalid">{created.message}</p>
        )}
        {created.phase === "failed" && <Failure error={created} />}
        {created.phase === "created" && (
          <div role="status" className="table-created">
            <p>
              {created.data.cells} cell(s) over {created.data.documents} document(s) and{" "}
              {created.data.columns} question(s).
            </p>
            <p className="meta">grid {created.data.grid_id}</p>
            <Cost amount={created.data.estimated_cost_inr} note={created.data.cost_note} />

            {/* PAUSED_BUDGET: a STATE, not an error. It gets the status register, not the
                failure one, and says what is resumable. */}
            {created.data.scheduled.paused_budget && (
              <div className="paused-budget" role="status">
                <h4>
                  <span aria-hidden="true">⏸</span> PAUSED_BUDGET
                </h4>
                <p>
                  {created.data.scheduled.enqueued.length} cell(s) were dispatched and{" "}
                  {created.data.scheduled.not_scheduled?.length ?? 0} were not. The unrun
                  cells stay PENDING — they are not failures, and nothing was charged for
                  the cell that was refused.
                </p>
                <p className="meta">{created.data.scheduled.pause_reason}</p>
                <p className="meta">
                  Raise the cap and create the table again: only the cells that have not
                  run will be dispatched.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-label="One table">
        <h3>Read a table</h3>
        <form action={statusAction} className="inline-form">
          <label htmlFor="grid_id">Grid id</label>
          <input id="grid_id" name="grid_id" type="text"
                 defaultValue={created.phase === "created" ? created.data.grid_id : ""} />
          <button type="submit" disabled={loading}>
            {loading ? "Reading…" : "Read"}
          </button>
        </form>

        {status.phase === "invalid" && (
          <p role="alert" className="invalid">{status.message}</p>
        )}
        {status.phase === "failed" && <Failure error={status} />}
        {status.phase === "status" && (
          <>
            <Grid data={status.data} />
            <Cost amount={status.data.spend.total_inr} note={status.data.spend.note} />
            <p className="meta">{status.data.note}</p>
            {status.data.cancelled && (
              <p className="meta">
                This table was cancelled. Answered cells were kept; unrun cells stay
                PENDING.
              </p>
            )}
            <p className="meta">
              This response does not carry the budget state. If a table paused, that was
              reported when it was created — a table reading PENDING here has either not
              been dispatched or is waiting its turn, and this screen does not guess which.
            </p>
          </>
        )}
      </section>

      <section aria-label="Export and cancel">
        <h3>Export</h3>
        <form action={exportAction} className="inline-form">
          <label htmlFor="export_grid">Grid id</label>
          <input id="export_grid" name="grid_id" type="text"
                 defaultValue={created.phase === "created" ? created.data.grid_id : ""} />
          <button type="submit" disabled={exporting}>
            {exporting ? "Building…" : "Export CSV"}
          </button>
        </form>
        {exported.phase === "failed" && <Failure error={exported} />}
        {exported.phase === "exported" && (
          <div role="status">
            <p className="meta">
              {exported.data.filename} · {exported.data.content_type}
            </p>
            <pre className="csv-preview">{exported.data.csv}</pre>
            <p className="meta">{exported.data.note}</p>
          </div>
        )}

        <h3>Cancel</h3>
        <form action={cancelAction} className="inline-form">
          <label htmlFor="cancel_grid">Grid id</label>
          <input id="cancel_grid" name="grid_id" type="text"
                 defaultValue={created.phase === "created" ? created.data.grid_id : ""} />
          <button type="submit" disabled={cancelling}>
            {cancelling ? "Stopping…" : "Stop scheduling"}
          </button>
        </form>
        {cancelled.phase === "failed" && <Failure error={cancelled} />}
        {cancelled.phase === "cancelled" && (
          <div role="status">
            <p>
              {cancelled.data.findings_kept} answered cell(s) kept ·{" "}
              {cancelled.data.pending_stopped} unrun cell(s) stay PENDING
            </p>
            <p className="meta">{cancelled.data.note}</p>
          </div>
        )}
      </section>

      <table className="legend">
        <caption className="meta">
          Every state carries a glyph and a word, so the grid reads with no colour.
        </caption>
        <tbody>
          {(Object.keys(CELL) as CellState[]).map((k) => (
            <tr key={k}>
              <th scope="row">
                <span aria-hidden="true">{CELL[k].glyph}</span> {CELL[k].word}
              </th>
              <td className="meta">{CELL[k].meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="meta hosting-note">
        playbook_status DRAFT — the questions behind these cells are not lawyer approved.
        Model hosting: UAE North; no client document may be sent there.
      </p>
    </>
  );
}
