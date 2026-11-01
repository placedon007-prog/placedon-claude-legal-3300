import type { ConversationMessage, RunProgress, RunStep } from "./gateway/types";
import type { Turn } from "../app/app/answer";

/** Stored message order is authoritative; request IDs retain the identity used for retries. */
export function conversationTurns(conversationId: string, messages: readonly ConversationMessage[]): Turn[] {
  const sorted = [...messages].sort((a, b) => a.ordinal - b.ordinal);
  return sorted.flatMap((m, i): Turn[] => {
    if (m.role !== "user") return [];
    const reply = sorted[i + 1]?.role === "assistant" ? sorted[i + 1] : null;
    const metadata = reply?.metadata;
    const draft = metadata?.artifacts.find((a) => a.type === "draft");
    return [{
      key: metadata?.request_id ?? m.message_id,
      question: m.text,
      state: reply?.envelope
        ? { phase: "answered", conversationId, envelope: reply.envelope, draftId: draft?.id ?? null,
            code: null, region: null, sources: metadata?.sources, artifacts: metadata?.artifacts,
            documentEvidence: metadata?.document_evidence, documentSummary: metadata?.document_summary,
            documentSummaryUnavailable: metadata?.document_summary_unavailable,
            lawAsOf: metadata?.law_as_of }
        : { phase: "queued", conversationId, runId: reply?.run_id ?? null,
            messageId: reply?.message_id, note: "", ...(reply?.progress ? { steps: reply.progress } : {}) },
    }];
  });
}

/**
 * A poll found the reply still queued. Restore the server's own progress line (sent with
 * the queued reply) instead of blanking it; a connection note from an earlier poll is
 * cleared because this poll succeeded. Fresh live steps from the poll, when the server sent
 * any, replace the previous ones; without them the last known steps stay.
 */
export function stillQueued<T extends { readonly note: string; readonly progress?: string; readonly steps?: RunProgress }>(
  state: T, steps?: RunProgress,
): T {
  return { ...state, note: state.progress ?? "", ...(steps ? { steps } : {}) };
}

/** What this browser saw when a turn was queued; the server does not store it. */
export type QueuedMemory = { readonly key: string; readonly runId: string | null;
  readonly progress: string; readonly queuedAt: number };

/**
 * Put remembered queue details back on turns rebuilt from the server. The Ask page remounts
 * its workspace when a new thread gets its id (key "new" → the conversation id), and the
 * server's copy of a queued turn has no progress line and no queue time. Matched by request
 * key, or by run id when the stored turn's key differs. Only queued turns are touched.
 */
export function restoreQueued<T extends { readonly key: string; readonly state: unknown }>(
  turns: readonly T[], memory: readonly QueuedMemory[],
): T[] {
  return turns.map((turn) => {
    const state = turn.state as { phase?: string; runId?: string | null; note?: string } | null;
    if (state?.phase !== "queued") return turn;
    const hit = memory.find((m) => m.key === turn.key || (m.runId !== null && m.runId === state.runId));
    if (!hit) return turn;
    return { ...turn, state: { ...state, progress: hit.progress, queuedAt: hit.queuedAt, note: state.note || hit.progress } };
  });
}

/** How long this browser has waited, measured here. It says nothing about server progress. */
export function waitedLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 60) return `Waiting ${total} s`;
  const minutes = Math.floor(total / 60);
  return `Waiting ${minutes} min ${String(total % 60).padStart(2, "0")} s`;
}

const POLL_FAST_MS = 1_500;
const POLL_FAST_WINDOW_MS = 60_000;
const POLL_MAX_MS = 30_000;

/**
 * Poll every 1.5 s for the first minute so a ready answer shows within ~1.5 s, then double
 * every 30 s up to a 30 s ceiling. A busy server (429/503) is waited out for at least its
 * Retry-After. Callers add jitter and pause while hidden.
 */
export function conversationPollDelay(elapsedMs: number, retryAfterSeconds?: number): number {
  const slow = Math.max(0, elapsedMs - POLL_FAST_WINDOW_MS);
  const base = elapsedMs < POLL_FAST_WINDOW_MS ? POLL_FAST_MS
    : Math.min(POLL_MAX_MS, Math.round(POLL_FAST_MS * 2 ** (1 + slow / 30_000)));
  return retryAfterSeconds ? Math.max(base, retryAfterSeconds * 1000) : base;
}

export type ProvenanceStep = Pick<RunStep, "capability" | "status" | "model" | "provider" | "region" | "cost_inr" | "cost_note">;

/** A missing price is unknown, never a zero-cost claim. */
export function executionCostLabel(cost: number | null, note: string | null): string {
  if (cost === null) return `Not priced${note ? ` — ${note}` : ""}`;
  if (cost > 0 && cost < 0.005) return "< ₹0.01";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(cost);
}

/** Keep deterministic steps out of the model list unless the run actually recorded a call. */
export function modelCalls(steps: readonly ProvenanceStep[]): readonly ProvenanceStep[] {
  return steps.filter((step) => Boolean(step.provider || step.model));
}
