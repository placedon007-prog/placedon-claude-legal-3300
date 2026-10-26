import type { EngineResult } from "../engine/errors";
import type { InviteAccept } from "../gateway/types";

/**
 * Pure mapping from an `invites.accept` result to what the invite page shows. Kept apart
 * from the Server Action so it can be tested without cookies or redirects.
 *
 * An invite that cannot be used -- unknown, used, expired, or an email that already has an
 * account -- gets ONE message, so the page cannot be used to probe which it was.
 */
export const MIN_PASSWORD_LENGTH = 12; // gateway/passwords.py MIN_LENGTH
export const INVALID_INVITE_MESSAGE =
  "This invite link is not valid, has expired, or was already used. Ask your workspace admin for a new one.";
export const TRANSPORT_MESSAGE = "We could not confirm whether the invite was accepted. Try signing in first; if that fails, try the invitation again.";

export type InviteAcceptOutcome = { readonly kind: "accepted" } | { readonly kind: "error"; readonly message: string };

export function inviteAcceptOutcome(result: EngineResult<InviteAccept>): InviteAcceptOutcome {
  if (!result.ok) {
    const { status, retryAfterSeconds, detail } = result.error;
    // 429: the gateway's per-client limit refused before any work, so nothing was accepted.
    if (status === 429) {
      const wait = retryAfterSeconds ? `about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}` : "a moment";
      return { kind: "error", message: `Too many attempts from your network. Wait ${wait} and try again. This attempt was not submitted.` };
    }
    // 400: the public route answers BAD_REQUEST refusals with HTTP 400; its detail is the rule.
    if (status === 400 && detail) return { kind: "error", message: detail };
    return { kind: "error", message: TRANSPORT_MESSAGE };
  }
  if (result.data.status === "accepted") return { kind: "accepted" };
  // BAD_REQUEST carries the backend's own password rule, which is safe and useful to show.
  if (result.data.code === "BAD_REQUEST") return { kind: "error", message: result.data.detail };
  return { kind: "error", message: INVALID_INVITE_MESSAGE };
}

/** Checked before anything is sent. Null when the password may be submitted. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 4096) return "That password is too long.";
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}
