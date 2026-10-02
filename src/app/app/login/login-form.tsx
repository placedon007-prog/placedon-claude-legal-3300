"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} style={{ maxWidth: "22rem" }}>
      <label htmlFor="passcode">Passcode</label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        required
        aria-describedby={state.error ? "passcode-error" : undefined}
        aria-invalid={state.error ? true : undefined}
      />
      <div className="row">
        <button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </div>
      {state.error ? (
        <p className="field-error" id="passcode-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
