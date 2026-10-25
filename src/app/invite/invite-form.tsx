"use client";

import { useActionState, useState } from "react";
import { acceptInviteAction, type InviteState } from "./actions";

const initial: InviteState = { error: null };

/** Set a password for the account an invite creates. The code is the invite's token. */
export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initial);
  const [shown, setShown] = useState(false);
  const described = state.error ? "invite-error" : undefined;
  return (
    <form action={action} className="auth-form" noValidate>
      <div className="auth-field">
        <label htmlFor="token">Invite code</label>
        <input id="token" name="token" type="text" defaultValue={token} autoComplete="off"
          spellCheck={false} required aria-describedby={described} aria-invalid={state.error ? true : undefined} />
      </div>
      <div className="auth-field">
        <div className="auth-label-row">
          <label htmlFor="password">New password</label>
          <span className="auth-hint">At least 12 characters.</span>
        </div>
        <div className="auth-password">
          <input id="password" name="password" type={shown ? "text" : "password"} autoComplete="new-password"
            minLength={12} required aria-describedby={described} aria-invalid={state.error ? true : undefined} />
          <button type="button" className="auth-reveal" aria-pressed={shown} aria-controls="password confirm"
            onClick={() => setShown((v) => !v)}>
            {shown ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="confirm">Repeat the password</label>
        <input id="confirm" name="confirm" type={shown ? "text" : "password"} autoComplete="new-password"
          minLength={12} required aria-describedby={described} aria-invalid={state.error ? true : undefined} />
      </div>
      {state.error ? <p className="auth-error" id="invite-error" role="alert">{state.error}</p> : null}
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}
