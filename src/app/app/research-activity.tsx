"use client";

import * as React from "react";
import { waitedLabel } from "@/lib/conversation";

type ActivityKind = "sending" | "queued" | "web";
const TICK_MS = 1000;

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

/** Motion is decorative; the text remains meaningful when animation is reduced or disabled. */
export function ResearchActivity({ kind, note, since }: { kind: ActivityKind; note?: string; since?: number }) {
  const copy = COPY[kind];
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (since === undefined) return;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [since]);
  return (
    <div className="research-activity" role="status" aria-live="polite" aria-atomic="true">
      <div className="research-book" aria-hidden="true">
        <span className="research-book-cover" />
        <span className="research-book-left"><i /><i /><i /></span>
        <span className="research-book-right"><i /><i /><i /></span>
        <span className="research-book-leaf"><i /><i /></span>
        <span className="research-book-spine" />
      </div>
      <div className="min-w-0">
        <p className="text-body font-medium text-fg">{copy.title}</p>
        <p className="mt-0.5 text-ui text-fg-2">{copy.detail}{note ? ` ${note}` : ""}</p>
        {since !== undefined && now !== null ? (
          // Outside the live region's text on purpose: a per-second change would be read aloud every second.
          <p className="mt-0.5 font-mono text-caption text-fg-3" aria-hidden="true">{waitedLabel(now - since)}</p>
        ) : null}
      </div>
    </div>
  );
}
