import type { ConversationMessage } from "./gateway/types";
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
            region: null, sources: metadata?.sources, artifacts: metadata?.artifacts }
        : { phase: "queued", conversationId, runId: reply?.run_id ?? null,
            messageId: reply?.message_id, note: "" },
    }];
  });
}

/** Polls start promptly, then back off. Callers add jitter and pause while hidden. */
export function conversationPollDelay(attempt: number): number {
  return Math.min(30_000, 1_500 * 2 ** Math.min(Math.max(0, attempt), 5));
}
