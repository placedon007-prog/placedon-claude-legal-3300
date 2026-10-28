/**
 * Which documents a follow-up question is about. The gateway answers each message only from
 * the file_ids sent WITH it, so a follow-up with none searched the law alone — and a question
 * about "the termination clause" then got a confident answer from the Companies Act. The
 * composer keeps the last question's documents attached, visibly and removably; this finds
 * them for a reopened thread, from what the answers themselves recorded.
 */
export type ThreadDocument = { readonly id: string; readonly name: string };

type AnsweredDocs = {
  readonly phase?: string;
  readonly documentEvidence?: { readonly documents?: readonly { readonly document_id: string; readonly name: string }[] } | null;
  readonly documentSummary?: { readonly coverage?: readonly { readonly document_id: string; readonly name: string }[] } | null;
};

/** The documents of the latest answered turn; [] when that turn used none. */
export function threadDocuments(turns: readonly { readonly state: unknown }[]): ThreadDocument[] {
  for (let i = turns.length - 1; i >= 0; i--) {
    const state = turns[i].state as AnsweredDocs | null;
    if (state?.phase !== "answered") continue;
    const rows = [...(state.documentEvidence?.documents ?? []), ...(state.documentSummary?.coverage ?? [])];
    const seen = new Map<string, ThreadDocument>();
    for (const row of rows) if (!seen.has(row.document_id)) seen.set(row.document_id, { id: row.document_id, name: row.name });
    return [...seen.values()];
  }
  return [];
}
