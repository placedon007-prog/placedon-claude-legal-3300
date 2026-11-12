/**
 * The render model for a case-routed conversation answer — `envelope.resource === "case"`.
 *
 * A case-routed turn never carries a verified statutory answer: judgment discovery found
 * (or did not find) supporting authority, and `citations` stays empty by contract. This
 * module exists so `answer.tsx` has nothing to decide on its own about where the judgments
 * live or what counts as the honest-empty case — same discipline as `case-law.ts`'s
 * `toCaseLawRenderModel`, and it reuses that module's `toCaseLawHit` so one judgment maps to
 * one shape everywhere it is shown.
 */
import type { Envelope, Judgment, SourceReport } from "./gateway/types";
import { toCaseLawHit, type CaseLawHit } from "./case-law";

/** True when this turn routed to judgment discovery instead of the statute. */
export function isCaseAnswer(envelope: Envelope): boolean {
  return envelope.resource === "case";
}

export interface CaseAnswerRenderModel {
  readonly hits: readonly CaseLawHit[];
}

/**
 * The judgments a case-routed envelope carries. The backend contract allows them on
 * `envelope.judgments` or on a sibling `sources.judgments` — the envelope is read first,
 * the sidecar `SourceReport` second, so either placement is picked up.
 */
export function toCaseAnswerRenderModel(envelope: Envelope, sources?: SourceReport): CaseAnswerRenderModel {
  const judgments: readonly Judgment[] = envelope.judgments ?? sources?.judgments ?? [];
  return { hits: judgments.map(toCaseLawHit) };
}
