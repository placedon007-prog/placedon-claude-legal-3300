"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Briefcase, FileText, Plus } from "lucide-react";
import { PromptBox, type AttachOutcome, type ComposerTool, type DocumentLookup } from "@/components/ui/prompt-box";
import type { CitationGroup } from "@/lib/thread";
import { chosenOrDefault, toggleSource } from "@/lib/sources";
import { conversationPollDelay, conversationTurns } from "@/lib/conversation";
import { documentReadinessAction, findDocumentsAction, loadComposerContext, loadThread, sendAction, type ComposerContext, type MatterHistory, type TurnState } from "./actions";
import { vaultUploadAction } from "./vault/actions";
import { TurnView, type Turn } from "./answer";
import { SourcePanel, type OpenSource } from "./source-panel";
import { NEW_THREAD, recordActivity, rememberThread, rememberThreadSources, useThreadSources } from "./local-store";
import { MatterHistoryMenu } from "./matter-history";
import { Welcome } from "./welcome";

const INTERRUPTED: TurnState = { phase: "failed", error: { kind: "transport_error", route: "/v2/conversation/send", message: "The connection was interrupted." } };

/** Dock only when the actual space left by the navigation can hold both reading columns. */
function useDocked(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [docked, setDocked] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setDocked(entry.contentRect.width >= 1144));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return docked;
}

async function lookupDocuments(query: string): Promise<DocumentLookup> {
  const result = await findDocumentsAction(query);
  if (result.phase === "found") return { ok: true, hits: result.hits, note: "Search covers your organisation's documents. Matter access is checked when you send." };
  return { ok: false, message: result.phase === "refused" ? result.detail : "Document search is temporarily unavailable. Try again." };
}

export function AskWorkspace({ initialConversationId, initialTurns, initialMatterId = null,
  title = "New conversation", demo = false, sharedPasscode = false, initialHistory = null, loadProblem, composer: initialContext,
}: {
  initialHistory?: MatterHistory | null;
  demo?: boolean;
  sharedPasscode?: boolean;
  initialConversationId: string | null;
  initialTurns: readonly Turn[];
  initialMatterId?: string | null;
  title?: string;
  loadProblem: string | null;
  composer: ComposerContext;
}) {
  const [context, setContext] = React.useState(initialContext);
  const [conversationId, setConversationId] = React.useState(initialConversationId);
  const [turns, setTurns] = React.useState<readonly Turn[]>(initialTurns);
  const [source, setSource] = React.useState<OpenSource | null>(null);
  const [tool, setTool] = React.useState<ComposerTool>("research");
  const [matterId, setMatterId] = React.useState(initialMatterId);
  const [sending, setSending] = React.useState(false);
  const requestInFlight = React.useRef(false);
  const lifetime = React.useRef(0);
  React.useEffect(() => {
    lifetime.current += 1;
    return () => { lifetime.current += 1; };
  }, []);
  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const composerRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const docked = useDocked(workspaceRef);
  const bodies = context.sources.phase === "loaded" ? context.sources.bodies : [];
  const [storedSources, storeSources] = useThreadSources(conversationId ?? NEW_THREAD);
  const lastSources = initialTurns.findLast((turn) => turn.state?.phase === "answered" && turn.state.sources)?.state;
  const initialSources = lastSources?.phase === "answered" ? lastSources.sources?.picked : undefined;
  const chosen = chosenOrDefault(bodies, storedSources ?? initialSources);
  const activeMatter = context.matters.find((matter) => matter.matter_id === matterId);
  const queuedSignature = turns.flatMap((turn) => turn.state?.phase === "queued" ? [turn.key] : []).join(",");
  const pending = sending || Boolean(queuedSignature);
  // An interrupted response may already have created a conversation on the server.
  // Recover that exact request before allowing another write in this workspace.
  const uncertain = turns.find((turn) => turn.state?.phase === "failed");

  // Read the persisted conversation until the queued assistant message has its envelope.
  // Hidden tabs do no work; a request never overlaps the previous poll.
  React.useEffect(() => {
    if (!conversationId || !queuedSignature) return;
    let live = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.visibilityState !== "hidden") {
        try {
          const loaded = await loadThread(conversationId);
          if (live && loaded.phase === "loaded") {
            const fresh = conversationTurns(conversationId, loaded.messages);
            setTurns((current) => current.map((turn) => {
              if (turn.state?.phase !== "queued") return turn;
              const oldRun = turn.state.runId;
              const match = fresh.find((next) => next.key === turn.key || oldRun && next.state?.phase === "answered" && next.state.envelope.run_id === oldRun);
              return match?.state?.phase === "answered" ? { ...turn, state: match.state }
                : { ...turn, state: { ...turn.state, note: "" } };
            }));
          } else if (live && loaded.phase === "refused") {
            const note = loaded.code === "SESSION_EXPIRED"
              ? "Your session has ended. Sign in, then reopen this conversation to recover the answer."
              : "This conversation cannot be reopened with your current access. Reopen it after access is restored; its outcome has not been confirmed.";
            setTurns((all) => all.map((turn) => turn.state?.phase === "queued" ? { ...turn, state: { ...turn.state, note } } : turn));
            return;
          } else if (live && loaded.phase === "failed") {
            const note = loaded.error.status === 429 || loaded.error.status === 503
              ? "The service is busy. Your saved request remains queued; checking again shortly."
              : "Connection interrupted. Your saved request continues; reconnecting.";
            setTurns((all) => all.map((turn) => turn.state?.phase === "queued" ? { ...turn, state: { ...turn.state, note } } : turn));
          }
        } catch {
          if (live) setTurns((all) => all.map((turn) => turn.state?.phase === "queued" ? { ...turn, state: { ...turn.state, note: "Connection interrupted. Your saved request continues; reconnecting." } } : turn));
        }
      }
      if (live) timer = setTimeout(poll, conversationPollDelay(attempt++) + Math.floor(Math.random() * 400));
    };
    timer = setTimeout(poll, 1500);
    return () => { live = false; clearTimeout(timer); };
  }, [conversationId, queuedSignature]);

  const openSource = React.useCallback((group: CitationGroup, activeId: string | null, cid: string) => {
    setSource({ conversationId: cid, group, activeId });
  }, []);

  async function send(text: string, selectedTool: ComposerTool, fileIds: readonly string[], retry?: Turn, restart = false) {
    if (requestInFlight.current || queuedSignature) return;
    if (uncertain && (uncertain.key !== retry?.key || restart)) return;
    if (restart && !retry?.request) return;
    requestInFlight.current = true;
    const generation = lifetime.current;
    const key = restart ? crypto.randomUUID() : retry?.key ?? crypto.randomUUID();
    const request = retry?.request
      ? { ...retry.request, conversationId: restart ? conversationId : retry.request.conversationId }
      : { text, tool: selectedTool, fileIds, sources: chosen, matterId, conversationId };
    if (!retry || restart) recordActivity(new Date());
    setSending(true);
    setTurns((all) => retry && !restart ? all.map((turn) => turn.key === key ? { ...turn, state: null } : turn) : [...all, { key, question: text, state: null, request }]);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end", behavior: "instant" }));
    try {
      const state = await sendAction({ conversationId: request.conversationId, requestId: key,
        text: request.text, fileIds: request.fileIds, sources: request.sources.length ? request.sources : undefined,
        matterId: request.matterId, taskOverride: request.tool === "draft" ? "DRAFT" : undefined });
      if (lifetime.current !== generation) return;
      setTurns((all) => all.map((turn) => turn.key === key ? { ...turn, state } : turn));
      if (state.phase === "answered" || state.phase === "queued") {
        setConversationId(state.conversationId);
        setMatterId(request.matterId);
        rememberThread(state.conversationId, text);
        rememberThreadSources(state.conversationId, request.sources);
        window.history.replaceState(null, "", `/app?c=${encodeURIComponent(state.conversationId)}`);
      }
    } catch {
      if (lifetime.current === generation) setTurns((all) => all.map((turn) => turn.key === key ? { ...turn, state: INTERRUPTED } : turn));
    } finally {
      requestInFlight.current = false;
      if (lifetime.current === generation) setSending(false);
    }
  }

  async function attach(file: File): Promise<AttachOutcome> {
    const data = new FormData();
    data.set("file", file);
    data.set("name", file.name);
    if (matterId) data.set("matter_id", matterId);
    const result = await vaultUploadAction({ phase: "idle" }, data);
    if (result.phase === "uploaded") return { ok: true, id: result.documentId, state: result.state, href: `/app/document-check?doc=${encodeURIComponent(result.documentId)}` };
    return { ok: false, message: result.phase === "invalid" ? result.message : result.phase === "refused" ? result.detail : "Upload interrupted. Remove the file and try again." };
  }

  const empty = turns.length === 0;
  const input = <PromptBox onSubmit={(text, selectedTool, ids) => { void send(text, selectedTool, ids); }}
    onAttach={attach} checkDocument={documentReadinessAction} pending={pending || Boolean(uncertain)}
    canDraft={turns.some((turn) => turn.state?.phase === "answered" && ["ANSWERED", "PARTIAL"].includes(turn.state.envelope.status))}
    tool={tool} onToolChange={setTool} sources={{ bodies, failed: context.sources.phase !== "loaded" }}
    onRetrySources={() => { loadComposerContext().then(setContext).catch(() => { /* Existing visible failure remains; the draft stays in memory. */ }); }}
    chosen={chosen} onToggleSource={(id) => storeSources(toggleSource(chosen, id, bodies))}
    matters={context.matters} matterId={matterId} onMatter={setMatterId} matterLocked={Boolean(conversationId) || pending || Boolean(uncertain)}
    findDocuments={lookupDocuments} className="w-full" />;

  return <div ref={workspaceRef} className="ask-workspace flex min-h-dvh min-w-0 flex-1">
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-18 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 md:px-8">
        <div className="min-w-0 basis-full min-[480px]:flex-1 min-[480px]:basis-auto">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-caption text-fg-3"><Briefcase className="size-3.5" aria-hidden />{activeMatter?.name ?? (matterId ? "Filed matter" : "Unfiled workspace")}{conversationId ? <span>· Saved</span> : null}</p>
          <h1 className="mt-0.5 truncate text-body font-medium text-fg">{empty ? "New conversation" : title === "New conversation" ? turns[0]?.question : title}</h1>
        </div>
        <MatterHistoryMenu key={matterId ?? "unfiled"} matterId={matterId} initialHistory={initialHistory} />
        <Link href="/app/vault" className="flex min-h-11 items-center gap-2 rounded-chip px-3 text-ui text-fg-2 hover:bg-wash-2"><FileText className="size-4" aria-hidden /><span>Documents</span><ArrowUpRight className="size-3.5" aria-hidden /></Link>
        {!empty ? <a href="/app" className="flex min-h-11 items-center gap-2 rounded-chip border border-line-control px-3 text-ui text-fg"><Plus className="size-4" aria-hidden /><span>New</span></a> : null}
      </header>
      {demo ? <p role="note" className="border-b border-line bg-wash px-5 py-2 text-caption text-fg-2 md:px-8">Demo · recorded examples in a synthetic workspace. No live legal research or client data.</p> : null}
      {sharedPasscode ? <p role="note" className="border-b border-line bg-wash px-5 py-2 text-caption text-fg-2 md:px-8">Shared passcode · this session does not identify individual lawyers or enforce matter membership. Do not upload client-confidential files.</p> : null}
      {empty ? <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 pt-12 pb-[12vh]">
        {loadProblem ? <p role="status" className="max-w-[560px] rounded-card border border-line-2 bg-wash px-4 py-3 text-body text-fg-2">{loadProblem}</p> : null}
        <Welcome />
        <div className="w-full max-w-[720px]" ref={composerRef}>{input}</div>
        <p className="max-w-[560px] text-center text-ui text-fg-3">Research with exact passages. See what was searched, what was used, and what remains unanswered.</p>
      </div> : <>
        <div className="flex-1 px-4 pt-9 pb-8 md:px-8"><div className="mx-auto flex w-full max-w-[680px] flex-col gap-12">
          {turns.map((turn) => <TurnView key={turn.key} turn={turn}
            retryDisabled={pending || Boolean(uncertain && uncertain.key !== turn.key)}
            onRetry={() => { void send(turn.question, turn.request?.tool ?? "research", turn.request?.fileIds ?? [], turn, turn.state?.phase === "answered" && turn.state.envelope.status === "FAILED"); }}
            onOpenSource={openSource} onDraft={() => { setTool("draft"); composerRef.current?.querySelector("textarea")?.focus(); }} />)}
          <div ref={endRef} />
        </div></div>
        <div className="sticky bottom-0 z-10 border-t border-line bg-ground px-4 pt-4 pb-4 md:px-8"><div className="mx-auto w-full max-w-[680px]" ref={composerRef}>{input}</div>
          <p role="status" className="mx-auto mt-2 max-w-[680px] text-center text-caption text-fg-3">{sending ? "Sending your request…" : uncertain ? "Recover the interrupted request above before sending another question, or start a new conversation." : queuedSignature ? "Your request is saved while work completes." : "Answers may be incomplete. Review the cited passages before relying on them."}</p>
        </div>
      </>}
    </div>
    <SourcePanel source={source} docked={docked} onClose={() => setSource(null)} />
  </div>;
}
