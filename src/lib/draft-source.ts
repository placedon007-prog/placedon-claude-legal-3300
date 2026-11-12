import type { Turn } from "../app/app/answer";

/**
 * The gateway drafts from its newest stored RESEARCH_QUESTION or REVIEW_CONTRACT
 * result, not the newest successful answer. Until the API accepts an explicit
 * source run, only offer a law memo when that same result is a cited law answer.
 */
export function draftableAnswerKey(turns: readonly Turn[]): string | undefined {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    // Public research is local to the UI and cannot replace a gateway draft source.
    if (turn.web) continue;
    const state = turn.state;
    // An unresolved request might already have stored a newer source result.
    if (!state || state.phase === "queued" || state.phase === "failed") return undefined;
    if (state.phase !== "answered") continue;
    const envelope = state.envelope;
    if (!envelope.run_id || !["RESEARCH_QUESTION", "REVIEW_CONTRACT"].includes(envelope.task)) continue;
    return envelope.task === "RESEARCH_QUESTION" && envelope.status === "ANSWERED"
      && envelope.resource !== "case" && envelope.citations.length > 0
      ? turn.key : undefined;
  }
  return undefined;
}
