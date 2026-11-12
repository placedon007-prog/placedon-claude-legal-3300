"use client";

import { useActionState, useId, useState } from "react";
import { decideAction, type DecisionState } from "./actions";
import { MIN_REASON_CHARS } from "@/lib/gateway/types";

const initial: DecisionState = { phase: "idle" };

/**
 * The human gate on ONE finding.
 *
 * Goddard et al. (JAMIA 2012) measured automation bias: a reviewer shown a machine's answer
 * under-checks it. PLAN_23 §1.8 turns that into a rule, and this component is where the rule
 * is a control rather than a sentence in a document:
 *
 *   1. **The quote must be opened.** Approve and Reject stay disabled until the reviewer has
 *      expanded the exact text the finding was decided on. Not a nag — the buttons do not
 *      work.
 *   2. **A reason must be typed.** At least `MIN_REASON_CHARS`, checked here, again in the
 *      Server Action, and a third time by the gateway, which has it as a database CHECK too.
 *      Three layers because a control that a disabled JS engine bypasses is not a gate.
 *   3. **There is no approve-all.** Deliberately, and this comment is the note to whoever is
 *      later asked for one: a page-clearing control converts the gate into a rubber stamp
 *      and records the result as a considered approval. One finding, one decision, one
 *      reason.
 *
 * What is stored is the LABEL: the verdict, the reviewer, the time, and the span they had
 * open. PLAN_23 rule 5 — every human decision is stored as labelled data, because a
 * reviewer's judgement is the scarcest input this system has.
 */
export function ReviewGate({
  runId,
  itemRef,
  quotedSpan,
  label,
}: {
  runId: string | null | undefined;
  itemRef: string;
  quotedSpan: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(decideAction, initial);
  const [opened, setOpened] = useState(false);
  const [reason, setReason] = useState("");
  const uid = useId();

  if (!runId) {
    return (
      <p className="meta gate-note">
        This run was not stored, so a decision on it could not be kept. A decision that is
        not stored is one that was not made.
      </p>
    );
  }

  if (state.phase === "recorded") {
    return (
      <p className="gate-done">
        <span className="mono">{state.data.decision}</span> — {state.data.reason}
        <span className="meta"> · recorded {state.data.decided_at.slice(0, 16).replace("T", " ")}</span>
      </p>
    );
  }

  const short = reason.trim().length < MIN_REASON_CHARS;
  const blocked = !opened || short || pending;

  return (
    <form action={action} className="gate">
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="item_ref" value={itemRef} />
      <input type="hidden" name="quoted_span" value={quotedSpan} />

      <details className="gate-quote" onToggle={(e) => setOpened(e.currentTarget.open)}>
        <summary>
          Read the quote{opened ? "" : " — required before deciding"}
        </summary>
        <p className="quoted">{quotedSpan}</p>
      </details>

      <label htmlFor={`${uid}-reason`}>Why, in your words</label>
      <textarea
        id={`${uid}-reason`}
        name="reason"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={`At least ${MIN_REASON_CHARS} characters. This is kept as the record of your judgement.`}
        aria-describedby={`${uid}-help`}
      />
      <p className="meta" id={`${uid}-help`}>
        {!opened
          ? "Open the quote above first."
          : short
            ? `${MIN_REASON_CHARS - reason.trim().length} more character(s) needed.`
            : `Stored against ${label}, with your name and the time.`}
      </p>

      <div className="gate-actions">
        <button type="submit" name="verdict" value="APPROVED" disabled={blocked}>
          Approve
        </button>
        <button
          type="submit"
          name="verdict"
          value="REJECTED"
          disabled={blocked}
          className="secondary"
        >
          Reject
        </button>
      </div>

      {state.phase === "invalid" ? (
        <p className="gate-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.phase === "failed" ? (
        <p className="gate-error" role="alert">
          The decision did not reach the gateway, so nothing was recorded.{" "}
          <span className="mono">{state.error.kind}</span> — {state.error.message}
        </p>
      ) : null}
    </form>
  );
}
