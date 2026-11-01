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
