"use client";

import { useActionState } from "react";
import { draftCreateAction, type DraftState } from "./actions";

const initial: DraftState = { phase: "idle" };

export function NewDraft() {
  const [state, action, pending] = useActionState(draftCreateAction, initial);
  return (
    <>
      <form action={action}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" defaultValue="Board resolution" />
        <label htmlFor="body">Opening text</label>
        <textarea id="body" name="body" rows={5}
                  defaultValue="The Board resolved as follows." />
        <button type="submit" disabled={pending} className="primary">
          {pending ? "Creating…" : "Create at version 1"}
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
