/** Review-table columns are typed one per line as `kind|name|question`. */
export const COLUMN_KINDS = ["text", "date", "amount", "yes_no"] as const;
export type ColumnKind = (typeof COLUMN_KINDS)[number];
export type Column = { kind: ColumnKind; name: string; question: string };

/**
 * Parse the column lines, or say which line is wrong and why, in words a user can act on.
 * Before this, a line without the three parts reached zod and showed
 * "Invalid input: expected string, received undefined".
 */
export function parseColumnLines(text: string): { ok: true; columns: Column[] } | { ok: false; message: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const columns: Column[] = [];
  for (const [i, line] of lines.entries()) {
    const [kind, name, ...rest] = line.split("|").map((p) => p.trim());
    const question = rest.join("|").trim();
    const where = `Column line ${i + 1} ("${line.slice(0, 60)}")`;
    if (!name || !question) {
      return { ok: false, message: `${where} needs three parts: kind|name|question, e.g. "date|Expiry|When does the agreement expire?".` };
    }
    if (!(COLUMN_KINDS as readonly string[]).includes(kind)) {
      return { ok: false, message: `${where} starts with "${kind}"; the kind must be one of ${COLUMN_KINDS.join(", ")}.` };
    }
    if (question.length < 5) return { ok: false, message: `${where} needs a question of at least 5 characters.` };
    columns.push({ kind: kind as ColumnKind, name, question });
  }
  return { ok: true, columns };
}
