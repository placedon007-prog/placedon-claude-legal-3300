type ActivityKind = "sending" | "queued" | "web";

const COPY: Record<ActivityKind, { title: string; detail: string }> = {
  sending: {
    title: "Working on your question",
    detail: "Connecting to the research workspace. Source status and any evidence will appear with the response.",
  },
  queued: {
    title: "Request queued",
    detail: "Your request is saved. The answer will appear here when the work finishes.",
  },
  web: {
    title: "Searching public sources",
    detail: "Only this question was sent. Any returned sources will be linked with the response.",
  },
};

/**
 * Indeterminate work indicator.
 *
 * The motion is a single hairline sweeping under the text — it says "still
 * working" and nothing else. It replaced a 56x48px 3D book with turning
 * pages: a skeuomorphic illustration that drew more attention than the
 * message beside it, and that the console's own rules rule out (motion is
 * for answering an action, not for decoration).
 *
 * The text alone is sufficient — the sweep is aria-hidden and disappears
 * entirely under prefers-reduced-motion.
 */
export function ResearchActivity({ kind, note }: { kind: ActivityKind; note?: string }) {
  const copy = COPY[kind];
  return (
    <div className="research-activity" role="status" aria-live="polite" aria-atomic="true">
      <div className="min-w-0">
        <p className="text-body font-medium text-fg">{copy.title}</p>
        <p className="mt-0.5 text-ui text-fg-2">{copy.detail}{note ? ` ${note}` : ""}</p>
        <span className="research-sweep" aria-hidden="true" />
      </div>
    </div>
  );
}
