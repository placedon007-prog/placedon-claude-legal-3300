/**
 * Vault states whose stored text can be read and attached (backend 029,
 * `READABLE_VAULT_STATES`). PARTIAL is readable: every page that had a text layer is
 * there, and the pages that did not are named on the document. Client-safe: no imports.
 */
export const READABLE_VAULT_STATES: readonly string[] = ["INGESTED", "PARTIAL"];

export function isReadableVaultState(state: string | null | undefined): boolean {
  return READABLE_VAULT_STATES.includes(String(state ?? ""));
}
