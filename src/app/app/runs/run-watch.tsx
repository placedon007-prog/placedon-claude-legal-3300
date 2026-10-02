"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import {
  cancelRunAction,
  pollRun,
  type CancelState,
  type RunSnapshot,
} from "../actions";

const initialCancel: CancelState = { phase: "idle" };

/** Slow enough not to hammer the gateway, fast enough that a person does not reload. */
const POLL_MS = 2000;

/**
 * Watches one run while it is still moving, and offers Cancel while it can be cancelled.
 *
 * PLAN_23 O2. A run no longer finishes inside the request that started it, so the screen
 * has to ask. Three rules this component keeps:
 *
 *   1. **Polling stops at a terminal status.** A finished run is not asked about again —
 *      an interval that keeps firing after the answer arrived is a load generator.
 *   2. **Unreachable is not refused.** A gateway that cannot be read renders as its own
 *      state, never in the abstain register, because a network fault is not a decision.
 *   3. **Cancel disappears when there is nothing to cancel.** The gateway refuses a cancel
 *      on a finished run, and offering a button that is always refused teaches a reviewer
 *      the screen is lying to them.
 */
export function RunWatch({ initial }: { initial: RunSnapshot }) {
  const [snap, setSnap] = useState<RunSnapshot>(initial);
  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelRunAction,
    initialCancel,
  );
  const tick = useCallback(async () => {
    const next = await pollRun(initial.id);
    setSnap(next);
  }, [initial.id]);

  useEffect(() => {
    if (!snap.live) return;                 // terminal: nothing left to ask about
    // No ref guarding this: the effect's own dependency on `snap.live` tears the interval
    // down the moment the run goes terminal, so a tick can never outlive the answer.
    const id = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(id);
  }, [snap.live, tick]);

  const done = !snap.live;

  return (
    <div className="watch">
      <p className="lede">
        {snap.status}
        {snap.refusalCode ? ` (${snap.refusalCode})` : null}
        {snap.live ? (
          <span className="meta watch-live"> · watching, refreshed every {POLL_MS / 1000}s</span>
        ) : (
          <span className="meta"> · finished; this page no longer polls</span>
        )}
      </p>

      {snap.unreachable ? (
        <p className="gate-error" role="alert">
          <strong>Not a refusal.</strong> The run could not be read, so its status here may
          be stale. <span className="mono">{snap.unreachable}</span>
        </p>
      ) : null}

      {snap.steps.length > 0 ? (
        <p className="meta">
          {snap.steps.length} step(s) so far:{" "}
          {snap.steps.map((s) => `${s.capability}=${s.status}`).join(" · ")}
        </p>
      ) : null}

      {done ? null : (
        <form action={cancelAction} className="watch-cancel">
          <input type="hidden" name="run_id" value={snap.id} />
          <button type="submit" className="secondary" disabled={cancelling}>
            {cancelling ? "Asking it to stop…" : "Cancel this run"}
          </button>
          <span className="meta">
            It stops at the next step boundary. Everything already done stays in the trace.
          </span>
        </form>
      )}

      {cancelState.phase === "requested" ? (
        <p className="gate-done">Cancellation requested — {cancelState.note}</p>
      ) : null}
      {cancelState.phase === "refused" ? (
        <p className="gate-error" role="alert">
          {cancelState.message}
        </p>
      ) : null}
      {cancelState.phase === "failed" ? (
        <p className="gate-error" role="alert">
          The cancellation did not reach the gateway, so the run may still be going.{" "}
          <span className="mono">{cancelState.error.kind}</span> —{" "}
          {cancelState.error.message}
        </p>
      ) : null}
    </div>
  );
}
