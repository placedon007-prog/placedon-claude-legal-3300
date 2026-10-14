"use client";

import { useActionState, useState } from "react";
import { accountLoginAction, type AccountLoginState } from "../app/actions";

const initial: AccountLoginState = { error: null, notice: null };

/** Email + password. One error text for every credential failure: no account enumeration. */
export function AccountForm() {
  const [state, action, pending] = useActionState(accountLoginAction, initial);
  const [shown, setShown] = useState(false);
  return (
    <form action={action} className="auth-form" noValidate>
      <div className="auth-field">
        <label htmlFor="email">Work email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          required
          aria-describedby={state.error ? "account-error" : undefined}
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <div className="auth-field">
        <div className="auth-label-row">
          <label htmlFor="password">Password</label>
          <span className="auth-hint">Forgot it? Ask your workspace admin.</span>
        </div>
        <div className="auth-password">
          <input
            id="password"
            name="password"
            type={shown ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-describedby={state.error ? "account-error" : undefined}
            aria-invalid={state.error ? true : undefined}
          />
          <button
            type="button"
            className="auth-reveal"
            aria-pressed={shown}
            aria-controls="password"
            onClick={() => setShown((v) => !v)}
          >
            {shown ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {state.error ? (
        <p className="auth-error" id="account-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="auth-status" role="status">
          <span className="auth-status-key">Not yet available</span>
          {state.notice}
        </p>
      ) : null}
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
