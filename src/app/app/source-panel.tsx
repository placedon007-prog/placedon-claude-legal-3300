"use client";

/**
 * The source panel: what a lawyer opens to check a citation.
 *
 * Every quote is RE-READ through `citation.get` when the panel opens; the stored envelope is
 * not trusted for this. `reverified: false` removes the highlight and says nothing may rest
 * on the quote. If the read does not arrive, the stored quote is shown and labelled as not
 * re-verified — never as verified, and never as a refusal.
 *
 * When the gateway serves the section the quotes were re-read from (`section`, only on a
 * re-verified quote), the panel shows that section once with every cited passage marked;
 * each mark is drawn only where `text[start:end]` is exactly the quote. Otherwise it shows
 * the passages alone and says so. `in_force_from: null` is "not recorded", never a date.
 */
import * as React from "react";
import { Check, Copy, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnvelopeCitation } from "@/lib/gateway/types";
import { joinWrappedLines, segmentSection, splitSection, type CitationGroup } from "@/lib/thread";
import { cn } from "@/lib/utils";
import { citationAction, type CitationState } from "./actions";

export interface OpenSource {
  readonly conversationId: string;
  readonly group: CitationGroup;
  /** The citation the clicked sentence maps to, or null when that is not certain. */
  readonly activeId: string | null;
}

export function SourcePanel({
  source,
  docked,
  onClose,
}: {
  source: OpenSource | null;
  docked: boolean;
  onClose: () => void;
}) {
  if (docked) {
    if (!source) return null;
    return (
      <aside
        aria-label="Source"
        className="sticky top-0 flex h-dvh w-[440px] flex-none flex-col border-l border-line bg-ground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-200"
      >
        <PanelBody key={`${source.conversationId}:${source.group.label}`} source={source} onClose={onClose} />
      </aside>
    );
  }
  return (
    <Sheet open={source !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[85dvh] gap-0 rounded-t-[14px] p-0">
        {source ? (
          <SheetMarker>
            <PanelBody key={`${source.conversationId}:${source.group.label}`} source={source} onClose={onClose} />
          </SheetMarker>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({ source, onClose }: { source: OpenSource; onClose: () => void }) {
  const { group } = source;
  const heading = group.section ? `Section ${group.section}` : group.label;
  return (
    <>
      <header className="flex min-h-14 items-center gap-3 border-b border-line px-5 py-2">
        <span
          aria-hidden
          className="grid size-6 flex-none place-items-center rounded-chip border border-fg text-caption font-medium"
        >
          {group.n}
        </span>
        <div className="min-w-0">
          <SheetTitleOrHeading>{heading}</SheetTitleOrHeading>
          <p className="truncate font-mono text-caption text-fg-3">{group.label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto grid size-11 flex-none place-items-center rounded-full text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg"
          aria-label="Close source"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <Passages source={source} />
      </div>
    </>
  );
}

/** Every citation in the group, re-read once when the panel opens. */
function useReads(citations: readonly EnvelopeCitation[], conversationId: string) {
  const [reads, setReads] = React.useState<Record<string, CitationState>>({});
  React.useEffect(() => {
    let live = true;
    for (const c of citations) {
      citationAction({ citationId: c.id, conversationId }).then((s) => {
        if (live) setReads((r) => ({ ...r, [c.id]: s }));
      });
    }
    return () => {
      live = false;
    };
  }, [citations, conversationId]);
  return reads;
}

function Passages({ source }: { source: OpenSource }) {
  const { group } = source;
  const reads = useReads(group.citations, source.conversationId);

  // One section view when EVERY passage re-verified against the same served section and
  // each offset slices back to its quote. Anything less falls back to one card per passage.
  const ranges = group.citations.map((c) => {
    const r = reads[c.id];
    if (r?.phase !== "read" || !r.data.reverified || !r.data.section) return null;
    return splitSection(r.data.section, r.data.citation.quote)
      ? { id: c.id, start: r.data.section.start, end: r.data.section.end, text: r.data.section.text }
      : null;
  });
  const sameText = ranges.every((x) => x && x.text === ranges[0]?.text);
  const unified = ranges.length > 0 && ranges.every(Boolean) && sameText;

  if (unified) {
    const first = reads[group.citations[0].id];
    const data = first?.phase === "read" ? first.data : null;
    return (
      <SectionView
        text={ranges[0]!.text}
        ranges={ranges.map((r) => ({ id: r!.id, start: r!.start, end: r!.end }))}
        activeId={source.activeId}
        count={group.citations.length}
        citation={data?.citation ?? group.citations[0]}
      />
    );
  }
  return (
    <>
      <SheetDescriptionOrText>
        {group.citations.length === 1
          ? "The passage cited, re-read from the held corpus when this panel opened."
          : `${group.citations.length} passages cited from this provision, each re-read from the held corpus when this panel opened.`}
      </SheetDescriptionOrText>
      <ol className="mt-4 flex flex-col gap-4">
        {group.citations.map((c) => (
          <Passage key={c.id} citation={c} state={reads[c.id] ?? null} active={source.activeId === c.id} />
        ))}
      </ol>
      <p className="mt-6 border-t border-line pt-3 text-caption text-fg-3">
        Only the cited passages are shown: this gateway did not serve the section&rsquo;s full
        text with them.
      </p>
    </>
  );
}

/** The whole section, every cited passage marked, the clicked one emphasised and in view. */
function SectionView({
  text,
  ranges,
  activeId,
  count,
  citation,
}: {
  text: string;
  ranges: { id: string; start: number; end: number }[];
  activeId: string | null;
  count: number;
  citation: EnvelopeCitation;
}) {
  const activeRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center" });
  }, [activeId]);
  return (
    <>
      <SheetDescriptionOrText>
        The section as held, re-read just now. {count === 1 ? "The cited passage is" : `The ${count} cited passages are`}{" "}
        marked{count > 1 && activeId ? "; the one you opened is underlined" : ""}. Each byte-matches the held text.
      </SheetDescriptionOrText>
      {/* Display only: hard wraps from the source PDF are joined (joinWrappedLines); a new
          sub-section or proviso keeps its line. The words are the held text, unchanged. */}
      <div className="mt-4 rounded-card border border-line-2 p-4 text-read whitespace-pre-line text-fg">
        {segmentSection(text, ranges).map((seg, i) =>
          seg.kind === "text" ? (
            <React.Fragment key={i}>{joinWrappedLines(seg.text)}</React.Fragment>
          ) : (
            <mark
              key={i}
              ref={seg.id === activeId ? activeRef : undefined}
              aria-current={seg.id === activeId ? "true" : undefined}
              className={cn("text-fg", seg.id === activeId || count === 1 ? "quote-mark" : "bg-wash-2")}
            >
              {joinWrappedLines(seg.text)}
            </mark>
          ),
        )}
      </div>
      <Evidence citation={citation} />
    </>
  );
}

/* Inside a Sheet, Radix wants its own Title/Description for the dialog's name; docked, the
   panel is a plain landmark. Both render the same visible text. */
const InSheet = React.createContext(false);
function SheetTitleOrHeading({ children }: { children: React.ReactNode }) {
  const inSheet = React.useContext(InSheet);
  return inSheet ? (
    <SheetTitle className="text-body font-semibold text-fg">{children}</SheetTitle>
  ) : (
    <h2 className="text-body font-semibold text-fg">{children}</h2>
  );
}
function SheetDescriptionOrText({ children }: { children: React.ReactNode }) {
  const inSheet = React.useContext(InSheet);
  return inSheet ? (
    <SheetDescription className="text-ui text-fg-2">{children}</SheetDescription>
  ) : (
    <p className="text-ui text-fg-2">{children}</p>
  );
}
function SheetMarker({ children }: { children: React.ReactNode }) {
  return <InSheet.Provider value>{children}</InSheet.Provider>;
}

function Passage({
  citation,
  state,
  active,
}: {
  citation: EnvelopeCitation;
  state: CitationState | null;
  active: boolean;
}) {
  const ref = React.useRef<HTMLLIElement>(null);
  React.useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // The quote shown is the RE-READ one when it arrived; otherwise the stored one, labelled.
  const read = state?.phase === "read" ? state.data : null;
  const quote = read?.citation.quote ?? citation.quote;
  const verified = read?.reverified === true;
  const c = read?.citation ?? citation;

  return (
    <li
      ref={ref}
      aria-current={active ? "true" : undefined}
      className={cn("rounded-card border p-4", active ? "border-fg" : "border-line-2")}
    >
      {/* Newlines in a quote are the PDF's hard wraps, not paragraphs; the words are unchanged. */}
      <blockquote className="text-read text-fg">
        {active && verified ? <mark className="quote-mark text-fg">{quote}</mark> : quote}
      </blockquote>

      <div className="mt-3 text-ui">
        {state === null ? (
          <span className="flex items-center gap-2 text-fg-3">
            <Skeleton className="h-3 w-3 rounded-full" /> Re-reading from the corpus…
          </span>
        ) : state.phase === "read" ? (
          read!.reverified ? (
            <p className="text-fg-2">
              <Check className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
              Re-read just now: the quote byte-matches the held text.
            </p>
          ) : (
            <p className="rounded-chip border border-dashed border-fg px-2.5 py-1.5 font-medium text-fg">
              Re-read just now and it did not match. Nothing may rest on this quote.
              <span className="mt-0.5 block font-normal text-fg-2">{read!.reverified_note}</span>
            </p>
          )
        ) : state.phase === "refused" ? (
          <p className="text-fg-2">
            Not re-verified — the gateway declined ({state.code}): {state.detail}. The stored quote
            is shown.
          </p>
        ) : (
          <p className="text-fg-2">
            Not re-verified — the re-read did not arrive ({state.error.kind}). This is not a
            refusal; the stored quote is shown.
          </p>
        )}
      </div>

      <Evidence citation={c} />
    </li>
  );
}

function Evidence({ citation }: { citation: EnvelopeCitation }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(citation.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-line pt-3 font-mono text-caption text-fg-2">
      <dt className="text-fg-3">provision</dt>
      <dd>
        {citation.instrument}, {citation.provision}
      </dd>
      <dt className="text-fg-3">in force from</dt>
      <dd>{citation.in_force_from ?? "not recorded"}</dd>
      <dt className="text-fg-3">fetched</dt>
      <dd>{citation.fetched_at}</dd>
      <dt className="text-fg-3">sha256</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className="truncate" title={citation.sha256}>
          {citation.sha256 ? `${citation.sha256.slice(0, 16)}…` : "not recorded"}
        </span>
        {citation.sha256 ? (
          <button
            type="button"
            onClick={copy}
            className="grid size-8 flex-none place-items-center rounded-chip text-fg-2 hover:bg-wash-2 hover:text-fg"
            aria-label={copied ? "Copied" : "Copy the full sha256"}
          >
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          </button>
        ) : null}
      </dd>
      <dt className="text-fg-3">file</dt>
      <dd className="truncate">{citation.source}</dd>
    </dl>
  );
}
