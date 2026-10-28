/**
 * Vault states whose stored text can be read and attached (backend 029,
 * `READABLE_VAULT_STATES`). PARTIAL is readable: every page that had a text layer is
 * there, and the pages that did not are named on the document. Client-safe: no imports.
 */
export const READABLE_VAULT_STATES: readonly string[] = ["INGESTED", "PARTIAL"];

export function isReadableVaultState(state: string | null | undefined): boolean {
  return READABLE_VAULT_STATES.includes(String(state ?? ""));
}

/** States that will never become readable by waiting: the file must be removed or fixed. */
const DEAD_VAULT_STATES: readonly string[] = ["CANNOT_READ", "FAILED"];

/**
 * The one line under the composer about attached files that block sending. A refused or
 * unreadable file is told so; only a file still being processed is told to wait.
 */
export function attachmentNotice(files: readonly { state: string; readiness?: string }[]): string | null {
  const dead = files.some((f) => f.state === "error" || (f.state === "stored" && DEAD_VAULT_STATES.includes(String(f.readiness ?? ""))));
  if (dead) return "A file could not be read. Remove it to send without it; its reason is shown on the file.";
  const waiting = files.some((f) => f.state !== "stored" || !isReadableVaultState(f.readiness));
  return waiting ? "A document is not ready to read. Wait for processing, or remove it to send without it." : null;
}
