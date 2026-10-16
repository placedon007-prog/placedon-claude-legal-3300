import { PlacedonMark } from "@/components/brand/placedon-mark";

type ActivityKind = "sending" | "queued" | "web";

const COPY: Record<ActivityKind, { title: string; detail: string }> = {
  sending: {
    title: "Working on your question",
    detail: "Connecting to the research workspace. Source status and any evidence will appear with the response.",
  },
  queued: {
    title: "Research in progress",
    detail: "Your request is saved. The answer will appear here when the work finishes.",
  },
  web: {
    title: "Searching public sources",
    detail: "Only this question was sent. Any returned sources will be linked with the response.",
  },
};

/** Motion is decorative; the text remains meaningful when animation is reduced or disabled. */
export function ResearchActivity({ kind, note }: { kind: ActivityKind; note?: string }) {
  const copy = COPY[kind];
  return (
    <div className="research-activity" role="status" aria-live="polite" aria-atomic="true">
      <div className="research-orbit" aria-hidden="true">
        <span className="research-orbit-track" />
        <span className="research-orbit-sweep" />
        <PlacedonMark className="research-orbit-mark" />
      </div>
      <div className="min-w-0">
        <p className="text-body font-medium text-fg">{copy.title}</p>
        <p className="mt-0.5 text-ui text-fg-2">{copy.detail}{note ? ` ${note}` : ""}</p>
      </div>
    </div>
  );
}
