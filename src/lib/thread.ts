/**
 * Pure helpers for the /app conversation thread. No React, no I/O, so they are testable
 * on Node's own runner.
 *
 * The thread never authors a legal sentence: it only regroups what `parseAnswer` already
 * parsed from the served prose, so the same provision cited by two sentences shows as one
 * numbered source instead of two.
 */
import type { CitedSentence, EnvelopeCitation, EnvelopeStatus, SourceReport } from "./gateway/types";

export type StatusKind =
  | "answered"
  | "partial"
  | "lawyer"
  | "refused"
  | "clarify"
  | "queued"
  | "failed"
  | "pending";

/** The one-line status above an answer. Words carry the state; colour never does. */
export function statusLabel(kind: StatusKind): string {
  switch (kind) {
    case "answered":
      return "Answered from held law";
    case "partial":
      return "Partly answered";
    case "lawyer":
      return "A lawyer needs to decide this";
    case "refused":
      return "Not answered";
    case "clarify":
      return "Which question did you mean?";
    case "queued":
      return "Queued — the reply has not arrived yet";
    case "failed":
      return "Did not arrive — this is not a refusal";
    case "pending":
      return "Reading the held law…";
  }
}

/** A FAILED turn's register: a known, non-retryable summary block gets its own title and no
 *  retry; everything else stays the transport register, which a retry may fix. */
export function failedRegister(unavailable?: { readonly reason: string; readonly retryable: boolean }): {
  title: string | null;
  retryable: boolean;
} {
  if (unavailable && unavailable.retryable === false) return { title: "Document summarization unavailable", retryable: false };
  return { title: null, retryable: true };
}

/** The first line a reader sees when a summary cannot run, by the backend's stated reason.
 *  Each says what happened and that nothing was sent or changed; the backend's own text
 *  follows it unaltered. An unknown reason gets the general line, never a guessed cause. */
export function summaryUnavailableLead(reason: string | undefined): string {
  switch (reason) {
    case "NO_PERMITTED_PROVIDER":
      return "Summaries are switched off in this workspace: no model approved for client documents is set up. Nothing was sent and your document is unchanged.";
    case "PROVIDER_REFUSED_ACCESS":
      return "The model approved for client documents refused this workspace's account, so no summary was made. Your document is unchanged.";
    default:
      return "A summary cannot be made in this workspace at the moment. Your document is unchanged.";
  }
}

/** `answer_envelope.v1` status → the screen's register. FAILED is transport-only by schema. */
export function envelopeKind(status: EnvelopeStatus): StatusKind {
  switch (status) {
    case "ANSWERED":
      return "answered";
    case "PARTIAL":
      return "partial";
    case "NEEDS_LAWYER":
      return "lawyer";
    case "ABSTAINED":
      return "refused";
    case "NEEDS_CLARIFICATION":
      return "clarify";
    case "FAILED":
      return "failed";
  }
}

/**
 * NOTHING_TRACED: the model answered but no sentence byte-traced to a provision. The
 * retrieved provisions are still shown — as an openable "provisions found" list, their
 * verbatim text via `citation.get` — but never as served passages, because a model
 * shortfall is not a served passage. Every other refusal keeps its own register.
 */
export function isNothingTraced(kind: StatusKind, code: string | null | undefined): boolean {
  return kind === "refused" && code === "NOTHING_TRACED";
}

/* ── citations from answer_envelope.v1 ──────────────────────────────────── */

export interface CitationGroup {
  /** 1-based number on the marker and in the Sources list. */
  readonly n: number;
  /** `<instrument>, <provision>` exactly as served, e.g. `Companies Act 2013, s.96`. */
  readonly label: string;
  /** `96` from a served `s.96`; null for any other shape. Never inferred from prose. */
  readonly section: string | null;
  readonly citations: readonly EnvelopeCitation[];
}

export interface LinkedCitations {
  readonly groups: readonly CitationGroup[];
  /** Per sentence: its group number, or null when no served citation backs its source. */
  readonly refs: readonly (number | null)[];
  /** Per sentence: the one citation id its span maps to, or null when that is not certain. */
  readonly active: readonly (string | null)[];
}

const labelOf = (c: EnvelopeCitation) => `${c.instrument}, ${c.provision}`;

/**
 * Join the parsed prose to the envelope's citations.
 *
 * The prose names a source and a char span per sentence; the envelope holds the verified
 * quotes, in the order the backend emitted them (first appearance of each distinct span).
 * Within one provision, distinct spans pair with citations IN ORDER — but only when the
 * counts match. If a citation was dropped on re-verification the pairing is unknowable, so
 * no sentence claims a particular quote; the panel then shows every quote for the source.
 */
export function linkCitations(
  sentences: readonly CitedSentence[],
  citations: readonly EnvelopeCitation[],
): LinkedCitations {
  const order: string[] = [];
  const byLabel = new Map<string, EnvelopeCitation[]>();
  for (const c of citations) {
    const label = labelOf(c);
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(c);
  }
  // Reading order first, then any citation no sentence names.
  for (const s of sentences) if (byLabel.has(s.source) && !order.includes(s.source)) order.push(s.source);
  for (const label of byLabel.keys()) if (!order.includes(label)) order.push(label);

  const spansBy = new Map<string, string[]>();
  for (const s of sentences) {
    const key = s.span ? `${s.span[0]}:${s.span[1]}` : `#${s.n}`;
    const list = spansBy.get(s.source) ?? [];
    if (!list.includes(key)) list.push(key);
    spansBy.set(s.source, list);
  }

  const refs: (number | null)[] = [];
  const active: (string | null)[] = [];
  for (const s of sentences) {
    const at = order.indexOf(s.source);
    const group = byLabel.get(s.source);
    refs.push(group ? at + 1 : null);
    const spans = spansBy.get(s.source) ?? [];
    const key = s.span ? `${s.span[0]}:${s.span[1]}` : `#${s.n}`;
    active.push(group && spans.length === group.length ? group[spans.indexOf(key)].id : null);
  }

  const groups = order.map((label, i) => {
    const cs = byLabel.get(label)!;
    const provision = cs[0].provision;
    return {
      n: i + 1,
      label,
      section: /^s\.\s*[0-9]+[A-Z]*(\([^)]*\))*$/i.test(provision)
        ? provision.replace(/^s\.\s*/i, "")
        : null,
      citations: cs,
    };
  });
  return { groups, refs, active };
}

/* ── this browser's thread list ─────────────────────────────────────────── */

/**
 * A conversation this browser started. There is no all-threads verb (`conversation.list`
 * needs a matter), so the sidebar lists only these and says so.
 */
export interface LocalThread {
  readonly id: string;
  readonly title: string;
  /** ISO time of the last turn. */
  readonly at: string;
}

const DAY_MS = 86_400_000;

/** Today (since local midnight) and the 7 days before it, newest first. Older is dropped. */
export function groupThreads(
  threads: readonly LocalThread[],
  now: Date,
): { today: LocalThread[]; previous: LocalThread[] } {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const valid = threads
    .filter(
      (t) =>
        typeof t?.id === "string" &&
        typeof t?.title === "string" &&
        !Number.isNaN(Date.parse(t?.at)),
    )
    .toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return {
    today: valid.filter((t) => Date.parse(t.at) >= midnight.getTime()),
    previous: valid.filter(
      (t) => Date.parse(t.at) < midnight.getTime() && Date.parse(t.at) >= midnight.getTime() - 7 * DAY_MS,
    ),
  };
}

/* ── the section around a quote ─────────────────────────────────────────── */

export interface ServedSection {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Split a served section into the text before the quote, the quote, and the text after.
 * Fails closed: if `text[start:end]` is not exactly the quote, nothing is marked — a
 * highlight on the wrong words would point a reader at a sentence nobody cited.
 */
export function splitSection(
  section: ServedSection | null | undefined,
  quote: string,
): { before: string; quote: string; after: string } | null {
  if (!section) return null;
  const { text, start, end } = section;
  if (start < 0 || end > text.length || start >= end) return null;
  if (text.slice(start, end) !== quote) return null;
  return { before: text.slice(0, start), quote, after: text.slice(end) };
}

export type SectionSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "quote"; readonly text: string; readonly id: string };

/**
 * One section with several cited passages marked. Ranges are sorted; one that overlaps an
 * earlier range is skipped rather than merged, so every mark is exactly one served quote.
 */
export function segmentSection(
  text: string,
  ranges: readonly { id: string; start: number; end: number }[],
): SectionSegment[] {
  const out: SectionSegment[] = [];
  let at = 0;
  for (const r of ranges.toSorted((a, b) => a.start - b.start)) {
    if (r.start < at || r.end > text.length || r.start >= r.end) continue;
    if (r.start > at) out.push({ kind: "text", text: text.slice(at, r.start) });
    out.push({ kind: "quote", text: text.slice(r.start, r.end), id: r.id });
    at = r.end;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}

/**
 * Display-only: the held text keeps the source PDF's hard line wraps, which break sentences
 * mid-phrase. A break is kept where the next line starts a new unit of the statute — a
 * sub-section "(2)", a numbered item, a "[" footnote, a proviso, explanation or illustration —
 * and becomes a space otherwise. The words are untouched; only line breaks change.
 */
export function joinWrappedLines(text: string): string {
  return text.replace(/[ \t]*\n(?!\s*(?:\(|\d|\[|Provided|Explanation|Illustration))[ \t]*/g, " ");
}

/** A friendly name for the two built-in sources; any other id shows itself. */
const SOURCE_LABEL: Record<string, string> = {
  held: "Companies Act 2013 (held corpus)",
  vault: "Your documents (vault)",
};

export interface SearchedLine {
  readonly id: string;
  readonly text: string;
}
export interface SearchedSummary {
  readonly searched: readonly SearchedLine[];
  readonly notSearched: readonly SearchedLine[];
}

/**
 * The per-source report, partitioned for display under an answer. SEARCHED_EMPTY (a search
 * ran, nothing matched) is grouped with Searched, NOT with Not searched: a source that was
 * consulted and found nothing is not the same as one that was never consulted, and the words
 * have to keep them apart — collapsing them would read silence as a finding.
 */
export function searchedSummary(report: SourceReport): SearchedSummary {
  const label = (id: string) => SOURCE_LABEL[id] ?? id;
  const searched: SearchedLine[] = [];
  const notSearched: SearchedLine[] = [];
  for (const r of report.report) {
    if (r.outcome === "NOT_SEARCHED") {
      notSearched.push({ id: r.id, text: r.reason ? `${label(r.id)} — ${r.reason}` : label(r.id) });
    } else {
      const detail = r.outcome === "SEARCHED_EMPTY"
        ? "nothing matched"
        : r.hits === undefined
          ? "matches found"
          : `${r.hits} passage${r.hits === 1 ? "" : "s"}`;
      searched.push({ id: r.id, text: `${label(r.id)} — ${detail}` });
    }
  }
  return { searched, notSearched };
}
