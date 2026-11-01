"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Square } from "lucide-react";
import type { CellState, TableStatus } from "@/lib/gateway/types";
import { rememberTable, useDocNames } from "../../local-store";
import { tableCancelAction, tableExportAction, type TableState } from "../actions";
import { TableFailure } from "../table-failure";

const idle: TableState = { phase: "idle" };
const REFRESH_MS = 4_000;

/**
 * A glyph AND words per cell, so the grid reads with no colour. Waiting and Could not run are
 * not findings: neither says anything about the document.
 */
export const CELL: Record<CellState, { glyph: string; word: string; meaning: string }> = {
  FOUND: { glyph: "✓", word: "Found", meaning: "read, with the passage it came from" },
  NOT_FOUND: { glyph: "✗", word: "Not in the document", meaning: "read, and the answer is not there" },
  NEEDS_LAWYER: { glyph: "?", word: "Needs a lawyer", meaning: "a person must decide" },
  PENDING: { glyph: "·", word: "Waiting", meaning: "not read yet; not a finding" },
  FAILED: { glyph: "–", word: "Could not run", meaning: "this cell did not run; not a finding" },
};

function stateLine(data: TableStatus): { title: string; detail: string } {
  const done = data.cells - (data.by_state.PENDING ?? 0);
  const state = data.table_state ?? (data.cancelled ? "CANCELLED" : data.complete ? "COMPLETE" : "RUNNING");
  if (state === "CANCELLED") return { title: "Stopped", detail: `${done} of ${data.cells} answers were read and are kept. The rest were not read.` };
  if (state === "COMPLETE") return { title: "All answers are in", detail: `${data.cells} answers across ${data.documents} file${data.documents === 1 ? "" : "s"}.` };
  if (state === "PAUSED_BUDGET") return { title: "Paused: spending cap reached", detail: data.pause_note ?? "Some cells were not sent because the spending cap was reached. They stay waiting; nothing was charged for them." };
  return { title: "Reading", detail: `${done} of ${data.cells} answers in. This page updates by itself.` };
}

function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LiveTable({ data }: { data: TableStatus }) {
  const router = useRouter();
  const names = useDocNames();
  const [exported, exportAction, exporting] = useActionState(tableExportAction, idle);
  const [cancelled, cancelAction, cancelling] = useActionState(tableCancelAction, idle);
  const [confirming, setConfirming] = useState(false);
  const status = stateLine(data);
  const running = (data.table_state ?? "RUNNING") === "RUNNING" && !data.cancelled && !data.complete;
  const stoppable = !data.cancelled && !data.complete;

  useEffect(() => rememberTable(data.grid_id, data.name), [data.grid_id, data.name]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [running, router]);
  useEffect(() => {
    if (exported.phase === "exported") download(exported.data.filename, exported.data.csv);
  }, [exported]);
  useEffect(() => {
    if (cancelled.phase === "cancelled") router.refresh();
  }, [cancelled, router]);

  const columns = [...new Set(data.cells_detail.map((c) => c.column))];
  const documents = [...new Set(data.cells_detail.map((c) => c.document_id))];

  return (
    <>
      <div className="drafts-heading table-heading">
        <div>
          <h1>{data.name || "Review table"}</h1>
          <p className="meta">{data.documents} file{data.documents === 1 ? "" : "s"} × {data.columns} question{data.columns === 1 ? "" : "s"}</p>
        </div>
        <div className="table-actions">
          <form action={exportAction}>
            <input type="hidden" name="grid_id" value={data.grid_id} />
            <button type="submit" className="table-action" disabled={exporting}>
              <Download aria-hidden className="size-4" /> {exporting ? "Preparing…" : "Export CSV"}
            </button>
          </form>
          {stoppable && !confirming && (
            <button type="button" className="table-action" onClick={() => setConfirming(true)}>
              <Square aria-hidden className="size-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {confirming && stoppable && (
        <form action={cancelAction} className="table-confirm" role="group" aria-label="Stop this table">
          <input type="hidden" name="grid_id" value={data.grid_id} />
          <p>Stop reading the remaining files? Answers already in are kept.</p>
          <div className="table-actions">
            <button type="submit" className="table-action" disabled={cancelling}>{cancelling ? "Stopping…" : "Stop the table"}</button>
            <button type="button" className="table-action" onClick={() => setConfirming(false)}>Keep reading</button>
          </div>
        </form>
      )}

      <div role="status" className="table-status" aria-live="polite">
        <strong>{status.title}</strong>
        <span className="meta">{status.detail}</span>
      </div>
      {[exported, cancelled].map((s, i) => s.phase === "failed" ? <TableFailure key={i} error={s.error} />
        : s.phase === "invalid" ? <p key={i} role="alert" className="invalid">{s.message}</p> : null)}
      {exported.phase === "exported" && <p role="status" className="meta">Downloaded {exported.data.filename}. Every cell has words in it, never a blank.</p>}

      <p className="meta table-caption" id="table-caption">
        {data.findings} of {data.cells} answers describe a file. Waiting and Could not run do not.
      </p>
      <div className="table-scroll">
        <table className="grid-table" aria-describedby="table-caption">
          <thead>
            <tr>
              <th scope="col">File</th>
              {columns.map((c) => <th scope="col" key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {documents.map((d, i) => (
              <tr key={d}>
                <th scope="row" className="grid-doc">{names[d] ?? `File ${i + 1}`}</th>
                {columns.map((col) => {
                  const cell = data.cells_detail.find((c) => c.document_id === d && c.column === col);
                  if (!cell) return <td key={col}>—</td>;
                  const s = CELL[cell.state];
                  return (
                    <td key={col} className={`cell cell-${cell.state.toLowerCase()}`}>
                      <span className="cell-state"><span aria-hidden="true">{s.glyph}</span> {s.word}</span>
                      {cell.state === "FOUND" && cell.value && <span className="cell-value">{cell.value}</span>}
                      {cell.quote ? <span className="meta cell-quote">“{cell.quote}”</span>
                        : cell.state !== "PENDING" && cell.reason ? <span className="meta cell-quote">{cell.reason}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="meta">
        {data.spend.total_inr === null ? <><span className="unpriced">UNPRICED</span> · {data.spend.note.replace(/^UNPRICED:\s*/, "")}</>
          : <>₹{data.spend.total_inr.toFixed(2)} so far · {data.spend.note}</>}
      </p>
      <dl className="table-legend">
        {(Object.keys(CELL) as CellState[]).map((k) => (
          <div key={k}><dt><span aria-hidden="true">{CELL[k].glyph}</span> {CELL[k].word}</dt><dd className="meta">{CELL[k].meaning}</dd></div>
        ))}
      </dl>
    </>
  );
}
