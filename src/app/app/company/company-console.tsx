"use client";

import * as React from "react";
import { extractCompanyFactsAction, type ExtractResult } from "./actions";
import { saveCompanyFacts, useCompanyFacts } from "../local-store";
import {
  FIELDS, FIELD_LABEL, STATES, displayValue, isTypeable, mergeFacts, sourceLine, typedFact,
  type CompanyFact, type FactField, type StoredFact, type TypeableField,
} from "@/lib/company-facts";

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** The control for a typeable field. Native elements: a select where the backend takes a closed set. */
function FactInput({ field, id, initial }: { field: TypeableField; id: string; initial: string }) {
  if (field === "listed") {
    return <select id={id} name="value" defaultValue={initial}>
      <option value="">Choose…</option><option value="yes">Yes, listed</option><option value="no">No, not listed</option>
    </select>;
  }
  if (field === "state") {
    return <select id={id} name="value" defaultValue={initial}>
      <option value="">Choose…</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>;
  }
  return <input id={id} name="value" type="text" defaultValue={initial} autoComplete="off" spellCheck={false}
    maxLength={21} placeholder="U00000MH2010PTC000000" className="mono" />;
}

function EditForm({ field, fact, facts, onDone }: {
  field: TypeableField; fact?: StoredFact; facts: readonly StoredFact[]; onDone: (message: string | null) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const id = `fact-${field}`;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("value") ?? "");
    const result = typedFact(field, value, today());
    if (!result.ok) { setError(result.message); return; }
    saveCompanyFacts(mergeFacts(facts, [result.fact]));
    onDone(`${FIELD_LABEL[field]} saved.`);
  }
  return <form className="company-edit" onSubmit={submit} noValidate>
    <label htmlFor={id} className="sr-only">{FIELD_LABEL[field]}</label>
    <FactInput field={field} id={id} initial={fact?.basis === "USER_FACT" ? fact.value : ""} />
    <div className="company-edit-actions">
      <button type="submit" className="bare company-button company-button-primary">Save</button>
      <button type="button" className="company-button" onClick={() => onDone(null)}>Cancel</button>
    </div>
    {error && <p role="alert" className="company-error">{error}</p>}
  </form>;
}

function FactRow({ field, fact, facts, onNotice }: {
  field: FactField; fact?: StoredFact; facts: readonly StoredFact[]; onNotice: (m: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const typeable = isTypeable(field);
  return <li className="company-row">
    <p className="company-label">{FIELD_LABEL[field]}</p>
    <div className="company-value">
      {editing && typeable
        ? <EditForm field={field} fact={fact} facts={facts} onDone={(m) => { setEditing(false); if (m) onNotice(m); }} />
        : fact
          ? <>
              <p className={field === "cin" ? "mono" : undefined}>{displayValue(fact)}</p>
              <p className="meta">{sourceLine(fact)}</p>
              {fact.quoted_span && <p className="company-quote">{fact.quoted_span}</p>}
            </>
          : <>
              <p className="company-missing">Not recorded</p>
              {!typeable && <p className="meta">Filled from an MCA master-data page.</p>}
            </>}
    </div>
    {!editing && <div className="company-row-actions">
      {typeable && <button type="button" className="company-button" onClick={() => setEditing(true)}
        aria-label={`${fact ? "Change" : "Add"} ${FIELD_LABEL[field]}`}>{fact ? "Change" : "Add"}</button>}
      {fact && <button type="button" className="company-button" aria-label={`Remove ${FIELD_LABEL[field]}`}
        onClick={() => { saveCompanyFacts(facts.filter((f) => f.field !== field)); onNotice(`${FIELD_LABEL[field]} removed.`); }}>Remove</button>}
    </div>}
  </li>;
}

function McaReview({ result, current, onSaved }: {
  result: Extract<ExtractResult, { ok: true }>; current: readonly StoredFact[]; onSaved: (m: string) => void;
}) {
  const [ticked, setTicked] = React.useState<ReadonlySet<FactField>>(() => new Set());
  const before = new Map(current.map((f) => [f.field, f]));
  const missing = result.missing.filter((m): m is FactField => (FIELDS as readonly string[]).includes(m));
  function save() {
    const chosen = result.facts.filter((f) => ticked.has(f.field))
      .map((f: CompanyFact): StoredFact => ({ ...f, confirmed: true, saved_on: result.uploadedOn }));
    saveCompanyFacts(mergeFacts(current, chosen));
    onSaved(`${chosen.length} ${chosen.length === 1 ? "detail" : "details"} saved from the MCA page.`);
  }
  if (result.facts.length === 0) {
    return <p role="status" className="company-error">No company details were found on this page. Check that it is the
      Company Master Data page from the MCA site. Nothing was saved.</p>;
  }
  return <section aria-label="Details read from the page" className="company-review">
    <p className="text-body text-fg">Tick each detail that matches the page. Only ticked details are saved.</p>
    <ul className="company-list">
      {result.facts.map((f) => {
        const old = before.get(f.field);
        const id = `mca-${f.field}`;
        return <li key={f.field} className="company-review-row">
          <input id={id} type="checkbox" checked={ticked.has(f.field)} onChange={(e) => {
            const on = e.currentTarget.checked;
            setTicked((prev) => { const next = new Set(prev); if (on) next.add(f.field); else next.delete(f.field); return next; });
          }} />
          <label htmlFor={id} className="company-review-text">
            <span className="text-body text-fg"><strong>{FIELD_LABEL[f.field]}:</strong> {displayValue(f)}</span>
            <span className="company-quote">Read from: {f.quoted_span}</span>
            {old && old.value !== f.value && <span className="meta">Replaces {displayValue(old)} ({sourceLine(old).toLowerCase()})</span>}
          </label>
        </li>;
      })}
    </ul>
    {missing.length > 0 && <p className="meta">Not found on this page: {missing.map((m) => FIELD_LABEL[m]).join(", ")}. These stay as they are.</p>}
    <button type="button" className="company-button company-button-primary" disabled={ticked.size === 0} onClick={save}>
      Save {ticked.size || ""} ticked {ticked.size === 1 ? "detail" : "details"}
    </button>
  </section>;
}

export function CompanyConsole() {
  const facts = useCompanyFacts();
  const [notice, setNotice] = React.useState<string | null>(null);
  const noticeRef = React.useRef<HTMLParagraphElement>(null);
  // The button that was pressed is gone after a save or removal; focus lands on what happened.
  React.useEffect(() => { if (notice) noticeRef.current?.focus(); }, [notice]);
  const [result, setResult] = React.useState<ExtractResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const byField = new Map(facts.map((f) => [f.field, f]));
  const recorded = facts.length;

  async function read(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setResult(null); setNotice(null);
    try { setResult(await extractCompanyFactsAction(new FormData(event.currentTarget))); }
    catch { setResult({ ok: false, message: "Placedon did not answer, so the page was not read. Try again." }); }
    setBusy(false);
  }

  return <>
    <section aria-labelledby="company-details" className="company-section">
      <h2 id="company-details" className="company-heading">Company details</h2>
      <p className="meta">{recorded} of {FIELDS.length} recorded. A detail that is not recorded is never assumed.</p>
      {notice && <p role="status" className="company-notice" tabIndex={-1} ref={noticeRef}>{notice}</p>}
      <ul className="company-list company-facts">
        {FIELDS.map((field) => <FactRow key={field} field={field} fact={byField.get(field)} facts={facts} onNotice={setNotice} />)}
      </ul>
      <p className="meta">Saved in this browser only. Placedon does not keep company details yet, so colleagues on
        other computers will not see them, and they are not yet sent with your questions. None of them is
        checked against the MCA register.</p>
    </section>

    <section aria-labelledby="company-mca" className="company-section">
      <h2 id="company-mca" className="company-heading">Fill from an MCA master-data page</h2>
      <p className="meta">Download your company&rsquo;s Master Data page from the MCA site, then choose the PDF or paste its text.
        Director names and DINs are not read or kept.</p>
      <form ref={formRef} onSubmit={read} className="company-mca-form">
        <div className="company-field">
          <label htmlFor="mca-file">Master-data PDF</label>
          <input id="mca-file" name="file" type="file" accept=".pdf,.txt,application/pdf,text/plain" />
        </div>
        <div className="company-field">
          <label htmlFor="mca-text">Or paste the page&rsquo;s text</label>
          <textarea id="mca-text" name="text" rows={5} />
        </div>
        <div>
          <button type="submit" className="bare company-button company-button-primary" disabled={busy} aria-busy={busy}>
            {busy ? "Reading…" : "Read the page"}
          </button>
        </div>
      </form>
      {result && !result.ok && <p role="alert" className="company-error">{result.message}</p>}
      {result?.ok && <McaReview key={result.uploadedOn + result.facts.length} result={result} current={facts}
        onSaved={(m) => { setResult(null); formRef.current?.reset(); setNotice(m); }} />}
    </section>
  </>;
}
