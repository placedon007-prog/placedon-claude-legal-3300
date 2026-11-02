import { askPastDatesEnabled, demoModeEnabled, sessionKind } from "@/lib/auth/config";
import { gateEnabled } from "@/lib/auth/session";
import type { Metadata } from "next";
import { loadComposerContext, loadMatterHistory, loadThread } from "./actions";
import { AskWorkspace } from "./ask-workspace";
import { conversationTurns } from "@/lib/conversation";
import { plainFailure } from "@/lib/plain-failure";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const composer = await loadComposerContext();
  const demo = demoModeEnabled();
  const pastDates = askPastDatesEnabled();
  // Only the passcode prototype is anonymous. A signed-in account IS identified, and its
  // matter membership is enforced, so the shared-passcode warning would be untrue there.
  const sharedPasscode = !demo && gateEnabled() && sessionKind() === "passcode";
  if (!c) {
    return <AskWorkspace key="new" demo={demo} pastDates={pastDates} sharedPasscode={sharedPasscode} initialConversationId={null} initialTurns={[]} loadProblem={null} composer={composer} />;
  }
  const loaded = await loadThread(c);
  if (loaded.phase === "loaded") {
    return (
      <AskWorkspace
        key={c}
        initialHistory={loaded.matterId ? await loadMatterHistory(loaded.matterId) : null}
        demo={demo}
        pastDates={pastDates}
        sharedPasscode={sharedPasscode}
        initialConversationId={c}
        initialTurns={conversationTurns(c, loaded.messages)}
        initialMatterId={loaded.matterId}
        title={loaded.title}
        loadProblem={null}
        composer={composer}
      />
    );
  }
  // A thread that will not open is said in words; the screen still works for a new question.
  const problem =
    loaded.phase === "refused"
      ? loaded.code === "NOT_FOUND"
        ? "That thread is not on this service — it may have been started in a different Placedon workspace. Ask a new question below."
        : `That thread could not be opened (${loaded.code}): ${loaded.detail}`
      : `That thread did not arrive. ${plainFailure(loaded.error)} This is not a refusal.`;
  return <AskWorkspace key="new" demo={demo} pastDates={pastDates} sharedPasscode={sharedPasscode} initialConversationId={null} initialTurns={[]} loadProblem={problem} composer={composer} />;
}
