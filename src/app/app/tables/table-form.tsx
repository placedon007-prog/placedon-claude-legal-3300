"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { VaultFileBrowser, type SelectedVaultFile } from "@/components/ui/vault-browser";
import { COLUMN_KINDS, KIND_LABEL, MAX_COLUMNS, TABLE_TEMPLATES, type Column, type ColumnKind } from "@/lib/table-columns";
import type { MattersList } from "@/lib/gateway/types";
import { rememberDocNames } from "../local-store";
import { tableCreateAction, type TableState } from "./actions";
import { TableFailure } from "./table-failure";

const idle: TableState = { phase: "idle" };
const MAX_FILES = 20;
type Row = Column & { key: number };

/** Define a table: tick ready files, then ask questions as rows. Create opens the table. */
export function TableForm({ matters, mattersUnavailable }: { matters: MattersList["matters"]; mattersUnavailable: boolean }) {
  const [state, action, creating] = useActionState(tableCreateAction, idle);
  const nextKey = useRef(1);
  const blank = (): Row => ({ key: nextKey.current++, name: "", kind: "text", question: "" });
  const [name, setName] = useState("");
  const [matterId, setMatterId] = useState<string | null>(null);
  const [files, setFiles] = useState<SelectedVaultFile[]>([]);
  const [rows, setRows] = useState<Row[]>(() => [{ key: 0, name: "", kind: "text", question: "" }]);
  const filled = rows.filter((r) => r.name.trim() || r.question.trim()).length;

  function update(key: number, patch: Partial<Column>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function applyTemplate(id: string) {
    const template = TABLE_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setRows(template.columns.map((c) => ({ ...c, key: nextKey.current++ })));
    if (!name.trim()) setName(template.name);
  }
  function toggle(file: SelectedVaultFile) {
    setFiles((current) => current.some((f) => f.id === file.id) ? current.filter((f) => f.id !== file.id)
      : current.length < MAX_FILES ? [...current, file] : current);
  }

  return (
    <form action={action} className="table-form" aria-label="New review table"
      onSubmit={() => rememberDocNames(Object.fromEntries(files.flatMap((f) => (f.sha256 ? [[f.sha256, f.name]] : []))))}>
      <label htmlFor="table-name">Table name</label>
      <input id="table-name" name="name" type="text" maxLength={120} placeholder="e.g. Supplier NDAs, March"
        value={name} onChange={(e) => setName(e.target.value)} />

      <fieldset className="table-fieldset">
        <legend>1. Tick the files to review</legend>
        <div className="table-scope">
          <label htmlFor="table-matter">Files from</label>
          <select id="table-matter" value={matterId ?? ""}
            onChange={(e) => { setMatterId(e.target.value || null); setFiles([]); }}>
            <option value="">Unfiled workspace</option>
            {matters.map((m) => <option key={m.matter_id} value={m.matter_id}>{m.name}</option>)}
          </select>
        </div>
        {mattersUnavailable && <p role="status" className="meta">Matters could not be loaded. Unfiled files are still listed; reload the page to try again.</p>}
        <VaultFileBrowser matterId={matterId} selected={files} onToggle={toggle} capacity={MAX_FILES} />
        <p className="meta" aria-live="polite">
          {files.length ? `${files.length} of ${MAX_FILES} files ticked.` : "Only files marked “Ready to read” can be ticked."}
        </p>
        {files.map((f) => f.sha256 ? <input key={f.id} type="hidden" name="document_id" value={f.sha256} /> : null)}
      </fieldset>

      <fieldset className="table-fieldset">
        <legend>2. Ask the same questions of every file</legend>
        <div className="table-templates" role="group" aria-label="Templates">
          <span className="meta">Start from a template:</span>
          {TABLE_TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="table-chip" onClick={() => applyTemplate(t.id)}>{t.label}</button>
          ))}
        </div>
        <ol className="table-questions">
          {rows.map((row, i) => (
            <li key={row.key} className="table-question">
              <div className="table-q-name">
                <label htmlFor={`q-name-${i}`}>Column name</label>
                <input id={`q-name-${i}`} name="column_name" type="text" maxLength={60} placeholder="e.g. Governing law"
                  value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} />
              </div>
              <div className="table-q-kind">
                <label htmlFor={`q-kind-${i}`}>Answer type</label>
                <select id={`q-kind-${i}`} name="column_kind" value={row.kind}
                  onChange={(e) => update(row.key, { kind: e.target.value as ColumnKind })}>
                  {COLUMN_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </div>
              <div className="table-q-question">
                <label htmlFor={`q-question-${i}`}>Question</label>
                <textarea id={`q-question-${i}`} name="column_question" rows={1} maxLength={300} className="table-q-text"
                  placeholder="e.g. Which law governs this agreement?"
                  value={row.question} onChange={(e) => update(row.key, { question: e.target.value })} />
              </div>
              <button type="button" className="table-remove" aria-label={`Remove question ${i + 1}`}
                disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}>
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="table-add" disabled={rows.length >= MAX_COLUMNS}
          onClick={() => setRows((current) => [...current, blank()])}>
          <Plus aria-hidden className="size-4" /> Add a question
        </button>
        <p className="meta">Date answers come back as a date, Amount as a figure, Yes/No as yes or no, and Clause as the clause’s own words.</p>
      </fieldset>

      <p className="meta">
        {files.length && filled ? `${files.length} file${files.length === 1 ? "" : "s"} × ${filled} question${filled === 1 ? "" : "s"} = ${files.length * filled} answers, each read separately.` : "Each file is asked each question separately."}
      </p>
      <button type="submit" disabled={creating} className="primary">{creating ? "Creating…" : "Create table"}</button>
      {state.phase === "invalid" && <p role="alert" className="invalid">{state.message}</p>}
      {state.phase === "failed" && <TableFailure error={state.error} />}
    </form>
  );
}
