import type { Metadata } from "next";
import { loadThread } from "./actions";
import { AskWorkspace } from "./ask-workspace";
import type { Turn } from "./answer";
import type { ConversationMessage } from "@/lib/gateway/types";

export const metadata: Metadata = { title: "Ask", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Stored messages → turns: each user message, then the assistant reply that follows it. */
function toTurns(conversationId: string, messages: readonly ConversationMessage[]): Turn[] {
  const turns: Turn[] = [];
  const sorted = messages.toSorted((a, b) => a.ordinal - b.ordinal);
  sorted.forEach((m, i) => {
    if (m.role !== "user") return;
    const reply = sorted[i + 1]?.role === "assistant" ? sorted[i + 1] : null;
    turns.push({
      key: m.message_id,
      question: m.text,
      state: !reply
        ? { phase: "queued", conversationId, runId: null, note: "" }
        : reply.envelope
          ? { phase: "answered", conversationId, envelope: reply.envelope, draftId: null }
          : { phase: "queued", conversationId, runId: reply.run_id ?? null, note: "" },
    });
  });
  return turns;
}

export default async function AskPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  if (!c) {
    return <AskWorkspace initialConversationId={null} initialTurns={[]} loadProblem={null} />;
  }
  const loaded = await loadThread(c);
  if (loaded.phase === "loaded") {
    return (
      <AskWorkspace
        initialConversationId={c}
        initialTurns={toTurns(c, loaded.messages)}
        loadProblem={null}
      />
    );
  }
  // A thread that will not open is said in words; the screen still works for a new question.
  const problem =
    loaded.phase === "refused"
      ? loaded.code === "NOT_FOUND"
        ? "That thread is not on this gateway — it may have been started against a different deployment. Ask a new question below."
        : `That thread could not be opened (${loaded.code}): ${loaded.detail}`
      : `That thread did not arrive (${loaded.error.kind}). This is not a refusal — reload to try again.`;
  return <AskWorkspace initialConversationId={null} initialTurns={[]} loadProblem={problem} />;
}
