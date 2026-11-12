"use client";

import { useActionState } from "react";
import { calendarAction, type CalendarState } from "./actions";
import { formatProvisionReference } from "@/lib/format";
import type { DueEntry, UnknownEntry } from "@/lib/gateway/types";

const initial: CalendarState = { phase: "idle" };

/**
 * A glyph AND a word for every state, so the two are told apart with no colour. The
 * abstain-grey is reserved for UNKNOWN, which is the one state AGENTS.md allows it on.
 */
const STATE = {
  DUE: { glyph: "→", word: "DUE" },
  UNKNOWN: { glyph: "?", word: "UNKNOWN" },
} as const;

function Provision({ entry }: { entry: DueEntry | UnknownEntry }) {
  // Claim, then evidence, carried by the type. The duty and the reader-facing reference are
  // the claim: `formatProvisionReference` normalises the engine's `s.96(1)` to the form used
  // in Indian legal work, in bold serif. The engine's own string stays beneath it in mono —
  // it is the basis, it is machine-exact, and mono is what says so. Neither is paraphrased:
  // the normalisation is display-only and the raw value is shown unchanged.
  return (
    <>
      <p className="cal-duty">{entry.duty}</p>
      <p className="cal-reference section-reference">
        {formatProvisionReference(entry.provision)}
      </p>
      <p className="meta cal-provision record-reference">{entry.provision}</p>
    </>
  );
}

export function CalendarConsole() {
  const [state, action, pending] = useActionState(calendarAction, initial);

  return (
    <>
      <form action={action} className="cal-form">
        <div className="field-row">
          <div>
            <label htmlFor="company_class">Company class</label>
            <select id="company_class" name="company_class" defaultValue="private">
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="opc">One person company</option>
              <option value="section8">Section 8</option>
            </select>
          </div>
          <div>
            <label htmlFor="incorporation_date">Incorporated</label>
            <input id="incorporation_date" name="incorporation_date" type="date"
                   defaultValue="2019-06-01" required />
          </div>
        </div>

        <div className="field-row">
          <div>
            <label htmlFor="financial_year_end">Financial year end</label>
            <input id="financial_year_end" name="financial_year_end" type="date"
                   aria-describedby="fye-help" />
            <p className="meta" id="fye-help">
              Optional. Leave it blank to see what the engine does without it: the annual
              general meeting becomes UNKNOWN and names this as the fact it is missing.
            </p>
          </div>
          <div>
            <label htmlFor="as_of">As of</label>
            <input id="as_of" name="as_of" type="date" />
          </div>
        </div>

        <button type="submit" disabled={pending} className="primary">
          {pending ? "Reading…" : "What falls due"}
        </button>
      </form>

      {state.phase === "invalid" && (
        <p role="alert" className="invalid">{state.message}</p>
      )}

      {/* A transport failure, in its own register. Not an abstention, and not an unknown
          date: the gateway never answered, so there is nothing to be unknown ABOUT. */}
      {state.phase === "failed" && (
        <div role="alert" className="transport-failure">
          <h3>The gateway did not answer</h3>
          <p>{state.error.message}</p>
          <p className="meta">
            {state.error.kind} · {state.error.route}
            {state.error.status ? ` · HTTP ${state.error.status}` : ""}
          </p>
          <p className="meta">
            This is a transport failure, not a finding. Nothing above was read, and no
            obligation has been assessed either way.
          </p>
        </div>
      )}

      {state.phase === "loaded" && (
        <section className="cal-result" aria-label="Upcoming obligations">
          <p className="meta">
            {state.data.horizon_days} days from {state.data.as_of} ·{" "}
            {state.data.due.length} dated · {state.data.unknown.length} cannot be dated
          </p>

          <h3>Dated</h3>
          {state.data.due.length === 0 ? (
            <p className="cal-empty">
              Nothing in this window carries a date. That is not “nothing is due”: an
              obligation the engine cannot date is listed below, with the fact it needs.
            </p>
          ) : (
            <ul className="cal-list">
              {state.data.due.map((d) => (
                <li key={d.obligation_id} className="cal-entry">
                  <p className="cal-state">
                    <span aria-hidden="true">{STATE.DUE.glyph}</span> {STATE.DUE.word}{" "}
                    <span className="cal-date">{d.due}</span>
                  </p>
                  <Provision entry={d} />
                  {d.anchor_label && (
                    <p className="meta">
                      {d.interval} from {d.anchor_label} ({d.anchor}) — supplied by you
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3>Cannot be dated</h3>
          {state.data.unknown.length === 0 ? (
            <p className="meta">Every obligation in this window has the facts it needs.</p>
          ) : (
            <ul className="cal-list">
              {state.data.unknown.map((u) => (
                <li key={u.obligation_id} className="cal-entry cal-unknown">
                  <p className="cal-state">
                    <span aria-hidden="true">{STATE.UNKNOWN.glyph}</span>{" "}
                    {STATE.UNKNOWN.word}
                    {/* The word, where a date would otherwise be. Never a guess, never a
                        blank: a blank cell reads as "nothing is due". */}
                    <span className="cal-date cal-date-unknown">unknown</span>
                  </p>
                  <Provision entry={u} />
                  <p className="meta">
                    Missing: {u.missing.join(", ")}
                  </p>
                  <p className="meta">{u.reason}</p>
                </li>
              ))}
            </ul>
          )}

          {state.data.note && <p className="meta cal-note">{state.data.note}</p>}

          {/* On every result, per AGENTS.md. */}
          <p className="meta hosting-note">
            playbook_status DRAFT — the rules behind these obligations are not lawyer
            approved. Model hosting: UAE North; no client document may be sent there.
          </p>
        </section>
      )}
    </>
  );
}
