"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../app/actions";

const initial: LoginState = { error: null };

/** The workspace passcode: the prototype gate, and the fallback once accounts exist. */
export function LoginForm({ compact = false, next }: { compact?: boolean; next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const errorId = compact ? "passcode-alt-error" : "passcode-error";
  return (
    <form action={action} className="auth-form" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="auth-field">
        <label htmlFor={compact ? "passcode-alt" : "passcode"}>Workspace passcode</label>
        <input
          id={compact ? "passcode-alt" : "passcode"}
          name="passcode"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state.error ? errorId : undefined}
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      {state.error ? (
        <p className="auth-error" id={errorId} role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
