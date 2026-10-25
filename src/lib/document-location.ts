/**
 * Where a quoted passage sits in a stored document, in the evidence-line form the console
 * uses (mono, beneath the quote). The page comes only from page breaks in the uploaded PDF
 * text; without one the location is the character range, said as such, never "page 1".
 */
export function passageLocation(p: { start: number; end: number; page?: number | null }): string {
  const chars = `chars ${p.start}–${p.end}`;
  return typeof p.page === "number" ? `p. ${p.page} · ${chars}` : chars;
}

/** "share_purchase_agreement" -> "share purchase agreement"; `unknown` stays unknown. */
export function documentTypeLabel(docClass: string | null | undefined): string {
  if (!docClass) return "not classified";
  return docClass === "unknown" ? "unknown — no rule matched" : docClass.replace(/_/g, " ");
}
