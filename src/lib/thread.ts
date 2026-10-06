/**
 * Pure helpers for the /app conversation thread. No React, no I/O, so they are testable
 * on Node's own runner.
 *
 * The thread never authors a legal sentence: it only regroups what `parseAnswer` already
 * parsed from the served prose, so the same provision cited by two sentences shows as one
 * numbered source instead of two.
 */
import type { CitedSentence } from "./gateway/types";

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

export type StatusKind = "answered" | "partial" | "refused" | "failed" | "pending";

/** The one-line status above an answer. Words carry the state; colour never does. */
export function statusLabel(kind: StatusKind): string {
  switch (kind) {
    case "answered":
      return "Answered from held law";
    case "partial":
      return "Partly answered";
    case "refused":
      return "Not answered";
    case "failed":
      return "Did not arrive";
    case "pending":
      return "Checking the held law";
  }
}
