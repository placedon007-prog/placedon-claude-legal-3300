/** The table states `review_table.list` and `.status` report, in words. */
export const TABLE_STATE_LABEL: Record<string, string> = {
  RUNNING: "Reading",
  COMPLETE: "All answers in",
  CANCELLED: "Stopped",
  PAUSED_BUDGET: "Paused: spending cap",
};

export function tableWhen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** A file's row label: the name the server stored, else the one this browser remembers, else its position. */
export function docLabel(
  id: string,
  index: number,
  server: Readonly<Record<string, string>> | undefined,
  local: Readonly<Record<string, string>>,
): string {
  return server?.[id]?.trim() || local[id]?.trim() || `File ${index + 1}`;
}
