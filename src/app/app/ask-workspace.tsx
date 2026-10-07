"use client";

/**
 * Ask — the Split workspace (owner decision, 2026-10-07, Direction C).
 *
 * The thread on the left; the source panel docked on the right at 1024px and wider,
 * CLOSED until a citation is clicked (it also opens with the first cited answer). Closing
 * it gives the thread the full width. Below 1024px the panel is a bottom sheet.
 *
 * Every turn goes through `conversation.send` in a server action; the gateway key never
 * leaves the server. The thread id goes in the URL (?c=) and in this browser's list.
 */
import * as React from "react";
import { PromptBox, type AttachOutcome, type ComposerTool } from "@/components/ui/prompt-box";
import { linkCitations, type CitationGroup } from "@/lib/thread";
import { parseAnswer } from "@/lib/gateway/types";
import { sendAction } from "./actions";
import { vaultUploadAction } from "./vault/actions";
import { TurnView, type Turn } from "./answer";
import { SourcePanel, type OpenSource } from "./source-panel";
import { recordActivity, rememberThread } from "./local-store";
import { Welcome } from "./welcome";

const DOCKED = "(min-width: 1024px)";

function useDocked(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(DOCKED);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(DOCKED).matches,
    () => true,
  );
}

async function attachToWall(file: File): Promise<AttachOutcome> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("name", file.name);
  const s = await vaultUploadAction({ phase: "idle" }, fd);
  switch (s.phase) {
    case "uploaded":
      return { ok: true, href: `/app/document-check?doc=${encodeURIComponent(s.documentId)}` };
    case "refused":
      return { ok: false, message: `not stored — ${s.code}: ${s.detail}` };
    case "failed":
      return { ok: false, message: "did not arrive, so it was not stored — this is not a refusal" };
    case "invalid":
      return { ok: false, message: s.message };
    default:
      return { ok: false, message: "not stored" };
  }
}

export function AskWorkspace({
  initialConversationId,
  initialTurns,
  loadProblem,
}: {
  initialConversationId: string | null;
  initialTurns: readonly Turn[];
  /** Set when ?c= named a thread that could not be opened. */
  loadProblem: string | null;
}) {
  const [conversationId, setConversationId] = React.useState(initialConversationId);
  const [turns, setTurns] = React.useState<readonly Turn[]>(initialTurns);
  const [source, setSource] = React.useState<OpenSource | null>(null);
  const [tool, setTool] = React.useState<ComposerTool>("research");
  const [pending, startTransition] = React.useTransition();
  const autoOpened = React.useRef(initialTurns.length > 0);
  const endRef = React.useRef<HTMLDivElement>(null);
  const composerRef = React.useRef<HTMLDivElement>(null);
  const docked = useDocked();

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const openSource = React.useCallback(
    (group: CitationGroup, activeId: string | null, cid: string) =>
      setSource({ conversationId: cid, group, activeId }),
    [],
  );

  function send(text: string, chosen: ComposerTool, retryKey?: string) {
    const key = retryKey ?? crypto.randomUUID();
    // When questions are asked (day, hour, weekday) — read only by the welcome line, in
    // this browser. A retry is the same question, so it is not counted twice.
    if (!retryKey) recordActivity(new Date());
    setTurns((t) =>
      retryKey ? t.map((x) => (x.key === key ? { ...x, state: null } : x)) : [...t, { key, question: text, state: null }],
    );
    startTransition(async () => {
      const state = await sendAction({
        conversationId,
        text,
        taskOverride: chosen === "draft" ? "DRAFT" : undefined,
      });
      setTurns((t) => t.map((x) => (x.key === key ? { ...x, state } : x)));
      if (state.phase !== "answered" && state.phase !== "queued") return;

      const cid = state.conversationId;
      setConversationId(cid);
      rememberThread(cid, text);
      // The URL names the thread, without a server round-trip.
      window.history.replaceState(null, "", `/app?c=${encodeURIComponent(cid)}`);

      if (state.phase === "answered" && !autoOpened.current && docked) {
        const env = state.envelope;
        const linked = linkCitations(parseAnswer(env.text_blocks[0]?.text ?? "").sentences, env.citations);
        if (linked.groups.length) {
          autoOpened.current = true;
          setSource({ conversationId: cid, group: linked.groups[0], activeId: linked.active[0] ?? null });
        }
      }
    });
  }

  const canDraft = turns.some((t) => t.state?.phase === "answered");
  const empty = turns.length === 0;

  const composer = (
    <PromptBox
      onSubmit={(text, chosen) => send(text, chosen)}
      onAttach={attachToWall}
      pending={pending}
      canDraft={canDraft}
      tool={tool}
      onToolChange={setTool}
      className="w-full"
    />
  );

  return (
    <div className="ask-workspace flex min-h-dvh flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="sr-only">Ask</h1>
        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 pb-[12vh]">
            {loadProblem ? (
              <p role="status" className="max-w-[560px] rounded-card border border-line-2 bg-wash px-4 py-3 text-body text-fg-2">
                {loadProblem}
              </p>
            ) : null}
            <Welcome />
            <div className="w-full max-w-[720px]" ref={composerRef}>
              {composer}
            </div>
            <p className="max-w-[560px] text-center text-ui text-fg-3">
              Answers quote the exact provision, or say plainly what cannot be answered. Not legal
              advice.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 px-4 pt-10 pb-6 md:px-8">
              <div className="mx-auto flex w-full max-w-[680px] flex-col gap-12">
                {turns.map((t) => (
                  <TurnView
                    key={t.key}
                    turn={t}
                    onRetry={() => send(t.question, "research", t.key)}
                    onOpenSource={openSource}
                    onDraft={() => {
                      setTool("draft");
                      composerRef.current?.querySelector("textarea")?.focus();
                    }}
                  />
                ))}
                <div ref={endRef} />
              </div>
            </div>
            <div className="sticky bottom-0 z-10 border-t border-line bg-ground px-4 pt-4 pb-4 md:px-8">
              <div className="mx-auto w-full max-w-[680px]" ref={composerRef}>
                {composer}
              </div>
            </div>
          </>
        )}
      </div>
      <SourcePanel source={source} docked={docked} onClose={() => setSource(null)} />
    </div>
  );
}
