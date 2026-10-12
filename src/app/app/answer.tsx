"use client";

/**
 * One turn of the Ask thread: the question as a heading, then its answer.
 *
 * Registers, told apart by shape and words, never colour:
 *   answered / partial / needs a lawyer / needs clarification — prose, markers, Sources
 *   not answered — the bodies of law and why each was not answered
 *   queued — the reply has not arrived yet; that is not an empty answer
 *   did not arrive — a DASHED box, "this is not a refusal", and Try again
 *
 * This screen never authors a legal sentence. Parsed prose is re-grouped; anything that does
 * not parse is shown verbatim.
 */
import * as React from "react";
import Link from "next/link";
import { CalendarPlus, Check, Copy, History, PenLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseAnswer, type SourceReport, type ConversationArtifact, type Envelope } from "@/lib/gateway/types";
import { envelopeKind, linkCitations, searchedSummary, statusLabel, type CitationGroup, type StatusKind } from "@/lib/thread";
import { cn } from "@/lib/utils";
import type { TurnState } from "./actions";

export interface Turn {
  readonly key: string;
  readonly question: string;
  /** null while the request is in flight. */
  readonly state: TurnState | null;
  readonly request?: { text: string; tool: "research" | "draft"; fileIds: readonly string[]; sources: readonly string[]; matterId: string | null; conversationId: string | null };
}

const BODY_STATUS: Record<string, string> = {
  ANSWERED: "answered",
  NOT_HELD: "not held — no answer from this body",
  CURRENT_ONLY: "today’s text only — no dated answer",
  NEED_FACT: "a fact is missing",
  NOT_ENGAGED: "not engaged by this question",
};

/** "a b c." → "a b " and "c." — the head keeps its trailing space. */
const lead = (t: string) => t.replace(/\S+$/, "");
const tail = (t: string) => t.match(/\S+$/)?.[0] ?? "";

export function TurnView({
  turn,
  onRetry,
  retryDisabled = false,
  onOpenSource,
  onDraft,
}: {
  turn: Turn;
  onRetry: () => void;
  retryDisabled?: boolean;
  onOpenSource: (group: CitationGroup, activeId: string | null, conversationId: string) => void;
  onDraft: () => void;
}) {
  const s = turn.state;
  return (
    <section aria-labelledby={`q-${turn.key}`} className="group/turn flex flex-col gap-3">
      <h2 id={`q-${turn.key}`} className="text-title font-semibold tracking-[-0.01em] text-fg">
        {turn.question}
      </h2>
      {s === null ? (
        <div aria-busy="true" aria-live="polite">
          <StatusLine kind="pending" />
        </div>
      ) : s.phase === "invalid" ? (
        <p className="text-body text-fg-2">{s.message}</p>
      ) : s.phase === "failed" ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-dashed border-fg p-4">
          <StatusLine kind="failed" />
          <p className="text-read text-fg">
            {s.error.status === 429 || s.error.status === 503
              ? "The service is busy. Your question is kept here; try again shortly. A retry uses the same request, so it will not start duplicate work."
              : "The connection was interrupted. Your question is kept here. Try again to recover the same request."}
          </p>
          <p className="text-caption text-fg-3">{s.error.retryAfterSeconds ? `Try again in about ${s.error.retryAfterSeconds} seconds.` : "This does not decide your legal question."}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="min-h-11 rounded-lg border border-fg px-4 text-body font-medium text-fg transition-colors duration-150 hover:bg-wash-2 disabled:cursor-wait disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : s.phase === "refused" ? (
        <div className="flex flex-col gap-2">
          <StatusLine kind="refused" extra={s.code} />
          <p className="text-read text-fg">{s.detail}</p>
        </div>
      ) : s.phase === "queued" ? (
        <div className="flex flex-col gap-2">
          <StatusLine kind="queued" />
          <p className="text-read text-fg-2">
            Your request is saved. The answer will appear here when the work finishes.
            {s.note ? ` ${s.note}` : ""}
          </p>
          {s.runId ? <RunLink runId={s.runId} /> : null}
        </div>
      ) : (
        <Answered envelope={s.envelope} conversationId={s.conversationId} draftId={s.draftId}
          sources={s.sources} artifacts={s.artifacts} onRetry={turn.request ? onRetry : undefined} retryDisabled={retryDisabled} onOpenSource={onOpenSource} onDraft={onDraft} />
      )}
    </section>
  );
}

function Answered({
  envelope,
  conversationId,
  draftId,
  sources,
  artifacts,
  onRetry,
  retryDisabled,
  onOpenSource,
  onDraft,
}: {
  envelope: Envelope;
  conversationId: string;
  draftId: string | null;
  sources?: SourceReport;
  artifacts?: readonly ConversationArtifact[];
  onRetry?: () => void;
  retryDisabled: boolean;
  onOpenSource: (group: CitationGroup, activeId: string | null, conversationId: string) => void;
  onDraft: () => void;
}) {
  const kind = envelopeKind(envelope.status);
  const [first, ...rest] = envelope.text_blocks;
  const parsed = parseAnswer(first?.text ?? "");
  const { groups, refs, active } = linkCitations(parsed.sentences, envelope.citations);
  const open = (g: CitationGroup, id: string | null) => onOpenSource(g, id, conversationId);
  // An abstention that still carries CITED text: that text is set aside under its own label.
  // Uncited text (e.g. "See the findings.") stays in the main flow, as served.
  const setAside =
    kind === "refused" && (parsed.sentences.length > 0 || (first?.citation_ids.length ?? 0) > 0);
  const servedProse = parsed.sentences.length > 0 ? (
        <p className="max-w-[68ch] text-read text-fg">
          {parsed.sentences.map((s, i) => {
            const n = refs[i];
            const group = n === null ? null : groups[n - 1];
            return (
              <React.Fragment key={s.n}>
                {/* The last word and its marker never part across a line break. */}
                {lead(s.text)}
                <span className="whitespace-nowrap">
                  {tail(s.text)}
                  {group ? (
                    <button
                      type="button"
                      onClick={() => open(group, active[i])}
                      aria-label={`Source ${n}${group.section ? `, Section ${group.section}` : ""}`}
                      className="mx-1 inline-flex h-11 min-w-11 items-center justify-center rounded-chip border border-line-control px-1 align-middle text-caption leading-none font-medium text-fg-2 transition-colors duration-150 hover:border-fg hover:bg-fg hover:text-ground"
                    >
                      {n}
                    </button>
                  ) : null}
                </span>{" "}
              </React.Fragment>
            );
          })}
        </p>
      ) : first ? (
        // Unparsed: verbatim. A reconstruction would be this app writing law.
        <p className="max-w-[68ch] text-read whitespace-pre-wrap text-fg">{first.text}</p>
      ) : null;

  if (kind === "failed") {
    // FAILED is transport-only by the envelope's own schema: the dashed register.
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-card border border-dashed border-fg p-4">
        <StatusLine kind="failed" />
        {envelope.text_blocks.map((b, i) => (
          <p key={i} className="text-body text-fg-2">{b.text}</p>
        ))}
        {onRetry ? <button type="button" onClick={onRetry} disabled={retryDisabled} className="min-h-11 self-start rounded-chip border border-line-control px-4 text-body text-fg hover:bg-wash disabled:cursor-wait disabled:opacity-50">Start a new attempt</button>
          : <p className="text-body text-fg-2">To try again, copy your question into the composer and select its documents, sources and task again. This saved record does not include every original request setting.</p>}
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-4">
      <StatusLine
        kind={kind}
        extra={groups.length && !setAside ? `${groups.length} source${groups.length > 1 ? "s" : ""}` : undefined}
      />

      {setAside ? null : servedProse}
      {rest.map((b, i) => (
        <p key={i} className="max-w-[68ch] text-body text-fg-2">{b.text}</p>
      ))}
      {parsed.notice ? <p className="text-ui text-fg-2">{parsed.notice}</p> : null}

      {groups.length > 0 && !setAside ? <Sources groups={groups} onOpen={(g) => open(g, null)} /> : null}

      {envelope.bodies.length > 0 && kind !== "answered" ? <Bodies envelope={envelope} /> : null}

      {setAside ? (
        // The gateway can abstain and still serve traced passages (seen live 2026-10-07).
        // They are shown — hiding served text would be editing it — but never as the answer.
        <section aria-label="Passages served with this abstention" className="flex flex-col gap-2 border-t border-line pt-3">
          <h3 className="text-ui font-medium text-fg">
            Passages served with this abstention — they do not answer the question
          </h3>
          {servedProse}
          {groups.length > 0 ? <Sources groups={groups} onOpen={(g) => open(g, null)} /> : null}
        </section>
      ) : null}

      {sources ? <Searched report={sources} /> : null}
      {envelope.files.length ? <ul aria-label="Documents considered" className="space-y-1 border-t border-line pt-3 text-ui text-fg-2">
        {envelope.files.map((file) => <li key={file.file_id}>{file.name} — {file.state === "READ" ? "read" : file.state === "READING" ? "still processing" : "not read"}{file.reason ? ` · ${file.reason}` : ""}</li>)}
      </ul> : null}
      {(artifacts?.length ? artifacts : draftId ? [{ type: "draft" as const, id: draftId }] : []).map((artifact) => (
        <Link key={`${artifact.type}:${artifact.id}`} href={artifact.type === "draft" ? `/app/drafts/${encodeURIComponent(artifact.id)}` : `/app/tables?grid=${encodeURIComponent(artifact.id)}`}
          className="flex min-h-14 items-center justify-between gap-4 rounded-card border border-line-2 px-4 py-3 text-body text-fg hover:bg-wash">
          <span><span className="font-medium">{artifact.type === "draft" ? "Draft document" : "Review table"}</span><span className="ml-2 text-caption text-fg-3">{artifact.type === "draft" && "version" in artifact && artifact.version ? `Version ${artifact.version} · ` : ""}Requires review</span></span><span>Open →</span>
        </Link>
      ))}

      <ResultLine envelope={envelope} />
      <Actions envelope={envelope} onDraft={onDraft} />
    </article>
  );
}

/**
 * What the question was actually searched against — a sibling of the answer, not part of it.
 * "Searched" and "Not searched" are told apart in words (`searchedSummary`): a search that ran
 * and found nothing is not the same as a source that was never consulted, and the console must
 * not read the first as the second. Colour carries nothing here, as everywhere on this screen.
 */
function Searched({ report }: { report: SourceReport }) {
  const { searched, notSearched } = searchedSummary(report);
  return (
    <section aria-label="Sources searched" className="flex flex-col gap-1 border-t border-line pt-3 text-ui">
      <h3 className="font-medium text-fg">Sources searched</h3>
      {searched.length > 0 ? (
        <p className="text-fg-2">
          <span className="font-medium text-fg">Searched:</span>{" "}
          {searched.map((l, i) => (
            <React.Fragment key={l.id}>{i > 0 ? "; " : ""}{l.text}</React.Fragment>
          ))}
        </p>
      ) : null}
      {notSearched.length > 0 ? (
        <p className="text-fg-2">
          <span className="font-medium text-fg">Not searched:</span>{" "}
          {notSearched.map((l, i) => (
            <React.Fragment key={l.id}>{i > 0 ? "; " : ""}{l.text}</React.Fragment>
          ))}
        </p>
      ) : null}
      {report.note ? <p className="text-caption text-fg-3">{report.note}</p> : null}
      <p className="border-t border-line pt-2 text-caption text-fg-3">A source search is not evidence used in the answer by itself. Numbered citations identify the passages shown with the answer.</p>
    </section>
  );
}

function Sources({ groups, onOpen }: { groups: readonly CitationGroup[]; onOpen: (g: CitationGroup) => void }) {
  return (
    <section aria-label="Sources">
      <h3 className="mb-1 text-ui font-medium text-fg">Sources</h3>
      <ol className="divide-y divide-line border-y border-line">
        {groups.map((g) => (
          <li key={g.n}>
            <button
              type="button"
              onClick={() => onOpen(g)}
              className="flex min-h-11 w-full items-start gap-3 px-1 py-2.5 text-left transition-colors duration-150 hover:bg-wash"
            >
              <span aria-hidden className="mt-0.5 grid size-5 flex-none place-items-center rounded-[5px] border border-line-control text-[11px] font-medium text-fg-2">
                {g.n}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-semibold text-fg">{g.section ? `Section ${g.section}` : g.label}</span>
                <span className="truncate font-mono text-caption text-fg-3">
                  {g.label} · {g.citations.length} passage{g.citations.length > 1 ? "s" : ""} · sha256{" "}
                  {g.citations[0].sha256.slice(0, 12) || "not recorded"}
                </span>
              </span>
              <span className="ml-auto self-center text-caption text-fg-3">Open</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Bodies({ envelope }: { envelope: Envelope }) {
  return (
    <section aria-label="Law read" className="rounded-card border border-line-2 bg-wash p-4">
      <h3 className="text-ui font-medium text-fg">What was read, body by body</h3>
      <ul className="mt-2 flex flex-col gap-2.5">
        {envelope.bodies.map((b) => (
          <li key={b.body_id} className="text-body">
            <span className="font-medium text-fg">{b.name}</span>
            <span className="text-fg-2"> — {BODY_STATUS[b.status] ?? b.status}</span>
            <p className="mt-0.5 text-ui text-fg-2">{b.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The standing limits, one quiet line under every result. */
function ResultLine({ envelope }: { envelope: Envelope }) {
  return (
    <p className="text-caption text-fg-3">
      {envelope.task === "RESEARCH_QUESTION" ? "Research" : "Result"} as at <span className="font-mono">{envelope.as_of}</span> · Playbook DRAFT — not
      approved by a lawyer · Model region not shown in this response · Test documents only · Not legal advice
    </p>
  );
}

function Actions({ envelope, onDraft }: { envelope: Envelope; onDraft: () => void }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    const quotes = envelope.citations.map((c) => `— ${c.instrument}, ${c.provision}: “${c.quote.replace(/\s+/g, " ")}”`);
    try {
      await navigator.clipboard.writeText([...envelope.text_blocks.map((b) => b.text), "", ...quotes].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  const btn =
    "grid size-11 place-items-center rounded-lg text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg disabled:text-fg-3 disabled:hover:bg-transparent";
  return (
    // Visible on hover AND on keyboard focus within the turn; always visible on touch.
    <div className="-ml-3 flex items-center gap-0.5 opacity-100 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/turn:opacity-100 [@media(hover:hover)]:group-hover/turn:opacity-100">
      <Act label={copied ? "Copied" : "Copy answer and quotes"}>
        <button type="button" className={btn} onClick={copy} aria-label={copied ? "Copied" : "Copy answer and quotes"}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </Act>
      <Act label="Add to calendar — no verb accepts an entry yet">
        {/* aria-disabled keeps it focusable so the tooltip can say why it does nothing. */}
        <button
          type="button"
          aria-disabled="true"
          aria-label="Add to calendar — no verb accepts an entry yet"
          onClick={(e) => e.preventDefault()}
          className={cn(btn, "cursor-not-allowed text-fg-3 hover:bg-transparent hover:text-fg-3")}
        >
          <CalendarPlus className="size-4" aria-hidden />
        </button>
      </Act>
      <Act label="Draft from this">
        <button type="button" className={btn} onClick={onDraft} aria-label="Draft from this">
          <PenLine className="size-4" aria-hidden />
        </button>
      </Act>
      {envelope.run_id ? (
        <Act label="View run">
          <Link href={`/app/runs/${encodeURIComponent(envelope.run_id)}`} className={btn} aria-label="View run">
            <History className="size-4" aria-hidden />
          </Link>
        </Act>
      ) : null}
    </div>
  );
}

function Act({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function RunLink({ runId }: { runId: string }) {
  return (
    <Link href={`/app/runs/${encodeURIComponent(runId)}`} className="self-start text-body font-medium underline underline-offset-4">
      Open run <span className="font-mono text-ui">{runId.slice(0, 8)}</span>
    </Link>
  );
}

export function StatusLine({ kind, extra }: { kind: StatusKind; extra?: string }) {
  return (
    <p className="flex items-center gap-2 text-ui text-fg-2">
      <StatusIcon kind={kind} />
      <span className="font-medium text-fg">{statusLabel(kind)}</span>
      {extra ? <span className={cn(kind === "refused" && "font-mono text-caption")}>· {extra}</span> : null}
    </p>
  );
}

/** One shape per register, so the state survives greyscale, print and colour blindness. */
function StatusIcon({ kind }: { kind: StatusKind }) {
  const p = { width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": true, className: "flex-none text-fg" } as const;
  switch (kind) {
    case "answered":
      return (<svg {...p} fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M2.5 7.5l3 3 6-7" /></svg>);
    case "partial":
      return (<svg {...p}><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth={1.4} /><path d="M7 1.5a5.5 5.5 0 010 11z" fill="currentColor" /></svg>);
    case "lawyer":
      return (<svg {...p} fill="none" stroke="currentColor" strokeWidth={1.4}><circle cx="7" cy="7" r="5.5" /><path d="M7 3.5v7" /></svg>);
    case "refused":
      return (<svg {...p} fill="none" stroke="currentColor" strokeWidth={1.4}><circle cx="7" cy="7" r="5.5" /><path d="M3.2 10.8l7.6-7.6" /></svg>);
    case "clarify":
      return (<svg {...p} fill="none" stroke="currentColor" strokeWidth={1.4}><circle cx="7" cy="7" r="5.5" /><path d="M5.4 5.4a1.7 1.7 0 113 1.1c-.6.4-1.4.8-1.4 1.7M7 10.2v.1" /></svg>);
    case "queued":
      return (<svg {...p} fill="none" stroke="currentColor" strokeWidth={1.4}><circle cx="7" cy="7" r="5.5" /><path d="M7 4v3.2l2 1.3" /></svg>);
    case "failed":
      return (<svg {...p} fill="none" stroke="currentColor" strokeWidth={1.4}><path d="M1.5 5a8 8 0 0111 0M3.5 7.5a5 5 0 017 0" /><path d="M2 12L12 2" /></svg>);
    case "pending":
      return <span className="pulse-dot mr-0! flex-none" aria-hidden />;
  }
}
