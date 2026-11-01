"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { waitedLabel } from "@/lib/conversation";
import type { RunProgress } from "@/lib/gateway/types";

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
export function ResearchActivity({ kind, note, since, steps }: { kind: ActivityKind; note?: string; since?: number; steps?: RunProgress }) {
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
        {steps ? <StepList steps={steps} /> : null}
        {since !== undefined && now !== null ? (
          // Outside the live region's text on purpose: a per-second change would be read aloud every second.
          <p className="mt-0.5 font-mono text-caption text-fg-3" aria-hidden="true">{waitedLabel(now - since)}</p>
        ) : null}
      </div>
    </div>
  );
}

/** The server's live steps: finished ones ticked, the running one marked as in progress. */
function StepList({ steps }: { steps: RunProgress }) {
  return (
    <ol className="mt-2 flex flex-col gap-1" aria-label="Progress">
      {steps.done.map((label) => (
        <li key={label} className="flex items-center gap-2 text-ui text-fg-2">
          <Check className="size-3.5 flex-none text-fg-2" aria-hidden />
          <span>{label}</span>
          <span className="sr-only">(done)</span>
        </li>
      ))}
      <li className="flex items-center gap-2 text-ui font-medium text-fg" aria-current="step">
        <span aria-hidden className="size-3.5 flex-none rounded-full border-2 border-line-control border-t-fg motion-safe:animate-spin" />
        <span>{steps.current}</span>
        <span className="sr-only">(in progress)</span>
      </li>
    </ol>
  );
}
