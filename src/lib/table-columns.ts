/**
 * Review-table questions, as rows a person fills in: a column name, an answer type and the
 * question. The kinds are the backend's own (`checker/review_grid.py` KINDS); the labels are
 * what a lawyer reads.
 */
export const COLUMN_KINDS = ["text", "date", "amount", "yes_no", "clause"] as const;
export type ColumnKind = (typeof COLUMN_KINDS)[number];
export type Column = { kind: ColumnKind; name: string; question: string };

export const KIND_LABEL: Record<ColumnKind, string> = {
  text: "Text",
  date: "Date",
  amount: "Amount",
  yes_no: "Yes/No",
  clause: "Clause",
};

export const MAX_COLUMNS = 12;
export const MIN_QUESTION = 5;

/** Templates prefill the rows; every row stays editable. */
export const TABLE_TEMPLATES: readonly { id: string; label: string; name: string; columns: readonly Column[] }[] = [
  {
    id: "nda",
    label: "NDA basics",
    name: "NDA review",
    columns: [
      { name: "Governing law", kind: "text", question: "Which law governs this agreement?" },
      { name: "Confidentiality ends", kind: "date", question: "On what date do the confidentiality obligations end?" },
      { name: "Mutual", kind: "yes_no", question: "Are the confidentiality obligations mutual?" },
      { name: "Non-solicitation", kind: "clause", question: "What does the non-solicitation clause say?" },
    ],
  },
  {
    id: "lease",
    label: "Lease basics",
    name: "Lease review",
    columns: [
      { name: "Monthly rent", kind: "amount", question: "What is the monthly rent?" },
      { name: "Security deposit", kind: "amount", question: "What is the security deposit?" },
      { name: "Lease starts", kind: "date", question: "On what date does the lease start?" },
      { name: "Lock-in", kind: "clause", question: "What does the lock-in clause say?" },
      { name: "Renewal option", kind: "yes_no", question: "Does the tenant have an option to renew?" },
    ],
  },
];

/** Check the rows, or say which row is wrong and why, in words a person can act on. */
export function checkColumns(
  rows: readonly { kind: string; name: string; question: string }[],
): { ok: true; columns: Column[] } | { ok: false; message: string } {
  const filled = rows
    .map((r) => ({ kind: r.kind, name: r.name.trim(), question: r.question.trim() }))
    .filter((r) => r.name || r.question);
  if (!filled.length) return { ok: false, message: "Add at least one question." };
  if (filled.length > MAX_COLUMNS) return { ok: false, message: `Use at most ${MAX_COLUMNS} questions.` };
  const seen = new Set<string>();
  const columns: Column[] = [];
  for (const [i, r] of filled.entries()) {
    const where = `Question ${i + 1}`;
    if (!r.name) return { ok: false, message: `${where} needs a column name.` };
    if (r.question.length < MIN_QUESTION) return { ok: false, message: `${where} ("${r.name}") needs a question of at least ${MIN_QUESTION} characters.` };
    if (!(COLUMN_KINDS as readonly string[]).includes(r.kind)) return { ok: false, message: `${where} ("${r.name}") needs an answer type.` };
    const key = r.name.toLowerCase();
    if (seen.has(key)) return { ok: false, message: `Two questions are both called "${r.name}". Give each column its own name.` };
    seen.add(key);
    columns.push({ kind: r.kind as ColumnKind, name: r.name, question: r.question });
  }
  return { ok: true, columns };
}
