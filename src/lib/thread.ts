/**
 * Pure helpers for the /app conversation thread. No React, no I/O, so they are testable
 * on Node's own runner.
 *
 * The thread never authors a legal sentence: it only regroups what `parseAnswer` already
 * parsed from the served prose, so the same provision cited by two sentences shows as one
 * numbered source instead of two.
 */
import type { CitedSentence, EnvelopeCitation, EnvelopeStatus } from "./gateway/types";

export interface ThreadSource {
  /** 1-based number shown on the citation chip and in the source list. */
  readonly n: number;
  /** Verbatim source label as served, e.g. `Companies Act 2013, s.96`. */
  readonly source: string;
  /** Section as parsed by `parseAnswer`, or null when the shape was unfamiliar. */
  readonly section: string | null;
  /** Every char span cited from this source, in sentence order. */
  readonly spans: readonly (readonly [number, number])[];
}

export interface GroupedSources {
  readonly sources: readonly ThreadSource[];
  /** For each sentence (same order as the input), the number of its source. */
  readonly refs: readonly number[];
}

/** Collapse sentences that cite the same source into one numbered source. */
export function groupSources(sentences: readonly CitedSentence[]): GroupedSources {
  const order: string[] = [];
  const bySource = new Map<string, { section: string | null; spans: (readonly [number, number])[] }>();
  const refs: number[] = [];
  for (const s of sentences) {
    let entry = bySource.get(s.source);
    if (!entry) {
      entry = { section: s.section, spans: [] };
      bySource.set(s.source, entry);
      order.push(s.source);
    }
    if (s.span) entry.spans.push(s.span);
    refs.push(order.indexOf(s.source) + 1);
  }
  const sources = order.map((source, i) => {
    const e = bySource.get(source)!;
    return { n: i + 1, source, section: e.section, spans: e.spans };
  });
  return { sources, refs };
}

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
