/** Calendar display helpers: pure, so they are unit-tested without React. */

/**
 * A glyph AND a word for every state, so they are told apart with no colour. The
 * abstain-grey is reserved for UNKNOWN, which is the one state AGENTS.md allows it on.
 */
export const STATE = {
  DUE: { glyph: "→", word: "DUE" },
  OVERDUE: { glyph: "!", word: "OVERDUE" },
  UNKNOWN: { glyph: "?", word: "UNKNOWN" },
} as const;

/** A dated entry's state: OVERDUE when the gateway says the date has passed, else DUE. */
export function datedState(state: string): (typeof STATE)["DUE" | "OVERDUE"] {
  return state === "OVERDUE" ? STATE.OVERDUE : STATE.DUE;
}

/** "six months from financial_year_end (2026-03-31)", omitting what the gateway did not send. */
export function countedFrom(entry: { quote?: string; interval?: string; anchor_label?: string; anchor?: string | null }): string {
  const interval = entry.quote ?? entry.interval ?? "";
  const anchor = entry.anchor ? ` (${entry.anchor})` : "";
  return `${interval ? `${interval} ` : ""}from ${entry.anchor_label}${anchor}`;
}
