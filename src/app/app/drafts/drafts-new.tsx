"use client";

import { useActionState } from "react";
import { draftCreateAction, type DraftState } from "./actions";

const initial: DraftState = { phase: "idle" };

export function NewDraft() {
  const [state, action, pending] = useActionState(draftCreateAction, initial);
  return (
    <>
      <form action={action}>
        <label htmlFor="title">Draft title</label>
        <input id="title" name="title" type="text" required minLength={3} maxLength={200}
               placeholder="For example, board resolution" />
        <label htmlFor="body">Starting text <span className="meta">(optional)</span></label>
        <textarea id="body" name="body" rows={6} maxLength={100_000}
                  placeholder="Paste or write the text you want to work on." />
        <button type="submit" disabled={pending} className="primary">
          {pending ? "Creating…" : "Create draft"}
        </button>
      </form>
      {state.phase === "invalid" && (
        <p role="alert" className="invalid">{state.message}</p>
      )}
      {state.phase === "failed" && (
        <div role="alert" className="transport-failure">
          <h3>The gateway did not answer</h3>
          <p>{state.error.message}</p>
          <p className="meta">
            {state.error.kind} · {state.error.route}
          </p>
          <p className="meta">No draft was created.</p>
        </div>
      )}
    </>
  );
}
