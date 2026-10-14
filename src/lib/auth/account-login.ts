import type { EngineResult } from "../engine/errors";
import type { AuthLoginOk } from "../gateway/types";

/**
 * Pure mapping from an `auth.login` gateway result to what the sign-in form does or shows.
 *
 * Kept here, apart from the Server Action, so it can be unit-tested without cookies or
 * redirects, and so the one rule that matters is enforced in one place: **every credential
 * failure returns one identical message**, so sign-in cannot be used to learn which emails
 * exist or which accounts are disabled.
 */
export type AccountLoginOutcome =
  | { readonly kind: "ok"; readonly token: string; readonly expiresAt: string }
  | { readonly kind: "error"; readonly message: string };

/** One message for wrong password, unknown email, disabled account, and un-accepted invite. */
export const CREDENTIALS_MESSAGE = "Email or password is incorrect.";
/** A failure to reach sign-in is a transport state, never a statement about the credentials. */
export const TRANSPORT_MESSAGE = "Couldn't reach sign-in. Check your connection and try again.";

export function accountLoginOutcome(result: EngineResult<AuthLoginOk>): AccountLoginOutcome {
  if (result.ok) {
    return { kind: "ok", token: result.data.token, expiresAt: result.data.expires_at };
  }
  const { error } = result;
  // 401 — wrong password / unknown email / disabled / un-accepted invite. The backend
  // returns one generic failure for all four; this surfaces it as one message, no enumeration.
  if (error.status === 401) return { kind: "error", message: CREDENTIALS_MESSAGE };
  // 429 — rate limited. Name the wait when the backend gave a Retry-After.
  if (error.status === 429) {
    const secs = error.retryAfterSeconds;
    return {
      kind: "error",
      message: secs
        ? `Too many attempts. Try again in ${secs} second${secs === 1 ? "" : "s"}.`
        : "Too many attempts. Try again shortly.",
    };
  }
  // Timeout, transport error, 5xx, or a body that did not match the contract: the answer
  // never arrived. Never rendered as a refusal (AGENTS.md).
  return { kind: "error", message: TRANSPORT_MESSAGE };
}
