"use client";

import * as React from "react";
import { extractCompanyFactsAction, saveCompanyProfileAction, type ExtractResult } from "./actions";
import { saveCompanyFacts, useCompanyFacts } from "../local-store";
import {
  COMPANY_CLASSES, FIELDS, FIELD_LABEL, PROFILE_FIELDS, STATES, displayValue, isTypeable, mergeFacts, sourceLine, typedFact,
  type CompanyFact, type FactField, type ProfileLoad, type StoredFact, type TypeableField,
} from "@/lib/company-facts";

/** Persist the whole profile; resolves to an error message, or null once saved. */
type Save = (next: readonly StoredFact[], what: string) => Promise<string | null>;

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
  if (field === "company_class") {
    return <select id={id} name="value" defaultValue={initial}>
      <option value="">Choose…</option>{COMPANY_CLASSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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

function EditForm({ field, fact, facts, save, onDone }: {
  field: TypeableField; fact?: StoredFact; facts: readonly StoredFact[]; save: Save; onDone: (message: string | null) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const id = `fact-${field}`;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("value") ?? "");
    const result = typedFact(field, value, today());
    if (!result.ok) { setError(result.message); return; }
    setBusy(true);
    const problem = await save(mergeFacts(facts, [result.fact]), `${FIELD_LABEL[field]} entered by hand`);
    setBusy(false);
    if (problem) { setError(problem); return; }
    onDone(`${FIELD_LABEL[field]} saved.`);
  }
  return <form className="company-edit" onSubmit={submit} noValidate>
    <label htmlFor={id} className="sr-only">{FIELD_LABEL[field]}</label>
    <FactInput field={field} id={id} initial={fact?.basis === "USER_FACT" ? fact.value : ""} />
    <div className="company-edit-actions">
      <button type="submit" className="bare company-button company-button-primary" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" className="company-button" onClick={() => onDone(null)}>Cancel</button>
    </div>
    {error && <p role="alert" className="company-error">{error}</p>}
  </form>;
}

function FactRow({ field, fact, facts, save, onNotice }: {
  field: FactField; fact?: StoredFact; facts: readonly StoredFact[]; save: Save; onNotice: (m: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const typeable = isTypeable(field);
  return <li className="company-row">
    <p className="company-label">{FIELD_LABEL[field]}</p>
    <div className="company-value">
      {editing && typeable
        ? <EditForm field={field} fact={fact} facts={facts} save={save} onDone={(m) => { setEditing(false); if (m) onNotice(m); }} />
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
        onClick={async () => {
          const problem = await save(facts.filter((f) => f.field !== field), `${FIELD_LABEL[field]} removed`);
          onNotice(problem ?? `${FIELD_LABEL[field]} removed.`);
        }}>Remove</button>}
    </div>}
  </li>;
}

function McaReview({ result, current, save, onSaved }: {
  result: Extract<ExtractResult, { ok: true }>; current: readonly StoredFact[]; save: Save; onSaved: (m: string) => void;
}) {
  const [ticked, setTicked] = React.useState<ReadonlySet<FactField>>(() => new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const before = new Map(current.map((f) => [f.field, f]));
  const missing = result.missing.filter((m): m is FactField => (FIELDS as readonly string[]).includes(m));
  async function confirm() {
    const chosen = result.facts.filter((f) => ticked.has(f.field))
      .map((f: CompanyFact): StoredFact => ({ ...f, confirmed: true, saved_on: result.uploadedOn }));
    setBusy(true);
    const problem = await save(mergeFacts(current, chosen), `${chosen.length} confirmed from the MCA page uploaded on ${result.uploadedOn}`);
    setBusy(false);
    if (problem) { setError(problem); return; }
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
    {error && <p role="alert" className="company-error">{error}</p>}
    <button type="button" className="company-button company-button-primary" disabled={ticked.size === 0 || busy} aria-busy={busy} onClick={confirm}>
      Save {ticked.size || ""} ticked {ticked.size === 1 ? "detail" : "details"}
    </button>
  </section>;
}

export function CompanyConsole({ initial }: { initial: ProfileLoad }) {
  const browserFacts = useCompanyFacts();
  // Where the profile lives. "browser" only when the backend has no company profile yet.
  const [mode, setMode] = React.useState(initial.mode);
  const [serverFacts, setServerFacts] = React.useState<readonly StoredFact[]>(
    initial.mode === "server" ? initial.facts : []);
  const facts = mode === "server" ? serverFacts : browserFacts;
  const [notice, setNotice] = React.useState<string | null>(null);

  const save: Save = React.useCallback(async (next, what) => {
    if (mode !== "server") { saveCompanyFacts(next); return null; }
    try {
      const result = await saveCompanyProfileAction(next, `${what}, on the Company page`);
      if (result.ok) { setServerFacts(result.facts); return null; }
      if (result.browserOnly) { setMode("browser"); saveCompanyFacts(next); return null; }
      return result.message;
    } catch {
      return "Placedon did not answer, so nothing was saved. Try again.";
    }
  }, [mode]);
  // Details an earlier visit kept in this browser, offered once the firm's profile exists.
  const movable = mode === "server" && serverFacts.length === 0 ? browserFacts : [];
  const noticeRef = React.useRef<HTMLParagraphElement>(null);
  // The button that was pressed is gone after a save or removal; focus lands on what happened.
  React.useEffect(() => { if (notice) noticeRef.current?.focus(); }, [notice]);
  const [result, setResult] = React.useState<ExtractResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const byField = new Map(facts.map((f) => [f.field, f]));
  const recorded = facts.length;

  if (mode === "unavailable") {
    return <section aria-labelledby="company-details" className="company-section">
      <h2 id="company-details" className="company-heading">Company details</h2>
      <p role="alert" className="company-error">Your company profile could not be loaded just now, so nothing is shown and
        nothing can be changed. Reload the page to try again.</p>
    </section>;
  }

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
      <p className="meta">{recorded} of {PROFILE_FIELDS.length} recorded. A detail that is not recorded is never assumed.</p>
      {notice && <p role="status" className="company-notice" tabIndex={-1} ref={noticeRef}>{notice}</p>}
      <ul className="company-list company-facts">
        {PROFILE_FIELDS.map((field) => <FactRow key={field} field={field} fact={byField.get(field)} facts={facts} save={save} onNotice={setNotice} />)}
      </ul>
      {mode === "server"
        ? <p className="meta">Saved as your firm&rsquo;s company profile: everyone in your firm sees the same details,
            and Calendar and your questions use them unless you change them there. None of them is checked against
            the MCA register.</p>
        : <p className="meta">Saved in this browser only. Placedon does not keep company details yet, so colleagues on
            other computers will not see them, and they are not yet sent with your questions. None of them is
            checked against the MCA register.</p>}
      {movable.length > 0 && <div className="company-move">
        <p className="text-body text-fg">{movable.length} {movable.length === 1 ? "detail was" : "details were"} saved in this
          browser before your firm&rsquo;s profile existed.</p>
        <button type="button" className="company-button" onClick={async () => {
          const problem = await save(movable, `${movable.length} moved from this browser`);
          setNotice(problem ?? "Moved to your company profile.");
        }}>Move them to the company profile</button>
      </div>}
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
      {result?.ok && <McaReview key={result.uploadedOn + result.facts.length} result={result} current={facts} save={save}
        onSaved={(m) => { setResult(null); formRef.current?.reset(); setNotice(m); }} />}
    </section>
  </>;
}
