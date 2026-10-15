import type { SourcesSearch, Judgment } from "./gateway/types";

/**
 * One judgment as the case-law view renders it.
 *
 * `tier` is always `"LICENSED"` and `quote` is always `null` — discovery finds a case by
 * party or title/year, it does not read it, so there is nothing here to ever render as a
 * verified passage. Opening the judgment (not built yet; `openTarget` is where that would
 * point) is the only path to a quote, and that path runs through `citation.get`, same as
 * every other cited passage in this app.
 */
export interface CaseLawHit {
  readonly id: string;
  readonly title: string;
  readonly parties: readonly string[];
  readonly year: number;
  readonly date: string;
  readonly court: string;
  readonly tier: "LICENSED";
  readonly openTarget: string;
  readonly quote: null;
}

export interface CaseLawNotSearched {
  readonly sourceId: string;
  readonly detail: string;
}

/**
 * What the case-law view renders from one `sources.search` reply. `supportingOnly` is
 * always `true`: it exists so a renderer can assert the register in one place rather than
 * re-deriving "this is never an answer" at every call site.
 */
export interface CaseLawRenderModel {
  readonly query: string;
  readonly hits: readonly CaseLawHit[];
  readonly notSearched: readonly CaseLawNotSearched[];
  readonly note: string;
  readonly supportingOnly: true;
}

/** Shared with the conversation answer's case-routed render model (`case-answer.ts`), so a
 *  judgment maps to the same shape wherever it is discovered: standalone search or a
 *  case-routed answer. */
export function toCaseLawHit(judgment: Judgment): CaseLawHit {
  return {
    id: `${judgment.source_id}:${judgment.s3_key}`,
    title: judgment.title,
    parties: judgment.parties,
    year: judgment.year,
    date: judgment.date,
    court: judgment.court,
    tier: judgment.tier,
    openTarget: judgment.s3_key,
    quote: null,
  };
}

/**
 * Map a `sources.search` reply to the case-law view's render model. Pure — no network, no
 * React — so the mapping is tested on its own, the way `linkCitations` in `thread.ts` is.
 */
export function toCaseLawRenderModel(search: SourcesSearch): CaseLawRenderModel {
  return {
    query: search.query,
    hits: search.judgments.map(toCaseLawHit),
    notSearched: search.not_searched.map((n) => ({ sourceId: n.source_id, detail: n.detail })),
    note: search.note,
    supportingOnly: true,
  };
}
