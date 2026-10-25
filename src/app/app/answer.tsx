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
import { CalendarPlus, Check, Copy, GitBranch, Globe2, History, PenLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseAnswer, type SourceReport, type DocumentEvidence, type DocumentSummary, type ConversationArtifact, type Envelope } from "@/lib/gateway/types";
import { envelopeKind, isNothingTraced, linkCitations, searchedSummary, statusLabel, type CitationGroup, type StatusKind } from "@/lib/thread";
import { toCaseAnswerRenderModel } from "@/lib/case-answer";
import { TierBadge } from "@/components/ui/tier-badge";
import { cn } from "@/lib/utils";
import { executionCostLabel, modelCalls } from "@/lib/conversation";
import { loadExecutionDetails, type ExecutionDetails, type TurnState, type WebResearchState } from "./actions";
import { ResearchState } from "./web-research-result";
import { ResearchActivity } from "./research-activity";
import { DocumentEvidenceAnswer } from "./document-evidence-answer";
import { DocumentSummaryAnswer } from "./document-summary-answer";
import { shouldRenderDocumentSummary } from "@/lib/document-summary";
import { documentEvidenceLabel } from "@/lib/document-evidence";

export interface Turn {
  readonly key: string;
  readonly question: string;
  /** null while the request is in flight. */
  readonly state: TurnState | null;
  /** Public reporting is intentionally separate from the verified-law envelope. */
  readonly web?: { readonly state: WebResearchState | null; readonly mode: "GENERAL_WEB" | "CASE_DISCOVERY" };
  readonly request?: { text: string; tool: "research" | "draft"; fileIds: readonly string[]; sources: readonly string[]; matterId: string | null; conversationId: string | null };
}

const BODY_STATUS: Record<string, string> = {
  ANSWERED: "answered",
  NOT_HELD: "not held — no answer from this body",
  CURRENT_ONLY: "today’s text only — no dated answer",
  NEED_FACT: "a fact is missing",
  NOT_ENGAGED: "not engaged by this question",
};

const TRACE_SOURCE_NAMES: Record<string, string> = {
  held: "Companies Act 2013",
  vault: "Wall System",
  aws_sc_judgments: "Supreme Court judgments",
  aws_hc_judgments: "High Court judgments",
  sebi: "SEBI",
  bse: "BSE",
  nse: "NSE",
  rbi: "Reserve Bank of India",
  data_gov_in: "data.gov.in",
  egazette: "eGazette",
  indiankanoon: "Indian Kanoon",
};
const traceSourceName = (id: string) => TRACE_SOURCE_NAMES[id] ?? id;

/** "a b c." → "a b " and "c." — the head keeps its trailing space. */
const lead = (t: string) => t.replace(/\S+$/, "");
const tail = (t: string) => t.match(/\S+$/)?.[0] ?? "";

export function TurnView({
  turn,
  onRetry,
  retryDisabled = false,
  onOpenSource,
  onDraft,
  onResearchWeb,
}: {
  turn: Turn;
  onRetry: () => void;
  retryDisabled?: boolean;
  onOpenSource: (group: CitationGroup, activeId: string | null, conversationId: string) => void;
  onDraft?: () => void;
  onResearchWeb: (question: string) => void;
}) {
  const s = turn.state;
  const asksForCurrentCase = /\b(?:case|court|lawsuit|litigation|dispute)\b/i.test(turn.question)
    && /\b(?:current|latest|recent|today|news|update)\b/i.test(turn.question);
  if (turn.web) return <section aria-labelledby={`q-${turn.key}`} className="group/turn flex flex-col gap-3">
    <h2 id={`q-${turn.key}`} className="text-title font-semibold tracking-[-0.01em] text-fg">{turn.question}</h2>
    <p className="text-caption text-fg-3">Public web · {turn.web.mode === "CASE_DISCOVERY" ? "cases and reporting" : "general search"} · This result is not saved to the legal conversation.</p>
    {turn.web.state ? <ResearchState state={turn.web.state} query={turn.question} />
      : <ResearchActivity kind="web" />}
  </section>;
  return (
    <section aria-labelledby={`q-${turn.key}`} className="group/turn flex flex-col gap-3">
      <h2 id={`q-${turn.key}`} className="text-title font-semibold tracking-[-0.01em] text-fg">
        {turn.question}
      </h2>
      {s?.phase === "answered" && (s.envelope.resource === "case" || asksForCurrentCase) ? (
        <button
          type="button"
          onClick={() => onResearchWeb(turn.question)}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-chip border border-line-control px-3 text-ui font-medium text-fg hover:bg-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Globe2 className="size-4" aria-hidden /> Search public reporting for this question
        </button>
      ) : null}
      {s === null ? (
        <ResearchActivity kind="sending" />
      ) : s.phase === "invalid" ? (
        <p className="text-body text-fg-2">{s.message}</p>
      ) : s.phase === "signed_out" ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-card border border-line-2 bg-wash p-4">
          <StatusLine kind="refused" extra="SESSION ENDED" />
          <p className="text-read text-fg">Your session has ended, so this question was not sent. Sign in to continue — your draft is kept and this conversation reopens afterwards.</p>
          <Link href={`/login?next=${encodeURIComponent(turn.request?.conversationId ? `/app?c=${turn.request.conversationId}` : "/app")}`} className="min-h-11 rounded-lg border border-fg px-4 py-2 text-body font-medium text-fg transition-colors duration-150 hover:bg-wash-2">Sign in to continue</Link>
        </div>
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
          <ResearchActivity kind="queued" note={s.note} />
          {s.runId ? <RunLink runId={s.runId} /> : null}
        </div>
      ) : (
        <Answered envelope={s.envelope} conversationId={s.conversationId} draftId={s.draftId}
          code={s.code} documentEvidence={s.documentEvidence} documentSummary={s.documentSummary} sources={s.sources} artifacts={s.artifacts} onRetry={turn.request ? onRetry : undefined} retryDisabled={retryDisabled} onOpenSource={onOpenSource} onDraft={onDraft} />
      )}
      <AnswerPath turn={turn} onOpenSource={onOpenSource} />
    </section>
  );
}

/** A compact, inspectable trace of the stages represented by this turn's actual records. */
function AnswerPath({ turn, onOpenSource }: { turn: Turn; onOpenSource: (group: CitationGroup, activeId: string | null, conversationId: string) => void }) {
  const [execution, setExecution] = React.useState<ExecutionDetails | { readonly phase: "idle" | "loading" }>({ phase: "idle" });
  const executionRequest = React.useRef(false);
  const state = turn.state;
  const envelope = state?.phase === "answered" ? state.envelope : null;
  const documentEvidence = state?.phase === "answered" ? state.documentEvidence : undefined;
  const documentSummary = state?.phase === "answered" ? state.documentSummary : undefined;
  const report = state?.phase === "answered" ? state.sources : undefined;
  const citationGroups = envelope
    ? linkCitations(parseAnswer(envelope.text_blocks[0]?.text ?? "").sentences, envelope.citations).groups
    : [];
  const picked = report?.picked ?? turn.request?.sources;
  const hasScope = Boolean(report || turn.request);
  const files = envelope?.files ?? [];
  const fileCount = turn.request?.fileIds.length ?? files.length;
  const runId = envelope?.run_id ?? null;

  async function revealExecutionDetails() {
    if (!runId || executionRequest.current || execution.phase === "loaded") return;
    executionRequest.current = true;
    setExecution({ phase: "loading" });
    try {
      setExecution(await loadExecutionDetails(runId));
    } catch {
      setExecution({ phase: "unavailable", message: "Processing details could not be loaded. The answer above is unchanged." });
    } finally {
      executionRequest.current = false;
    }
  }

  const questionStatus = state === null ? "Sending" : state.phase === "invalid" || state.phase === "signed_out" ? "Not sent" : "Recorded";
  const scopeStatus = turn.request ? "Recorded" : report ? "Partly recorded" : "Not recorded";
  const searchStatus = documentEvidence || report || envelope?.searched ? "Reported" : state?.phase === "queued" ? "Waiting" : state?.phase === "failed" ? "Unknown" : "Not recorded";
  const evidenceStatus = documentSummary ? `${documentSummary.coverage.length} summarized document${documentSummary.coverage.length === 1 ? "" : "s"}` : documentEvidence ? `${documentEvidence.passages.length} document excerpts` : envelope ? `${envelope.citations.length} citations` : state?.phase === "queued" ? "Waiting" : "Not available";
  const answerStatus = state === null
    ? "Sending"
    : state.phase === "answered"
      ? state.documentEvidence ? documentEvidenceLabel(state.documentEvidence) : statusLabel(envelopeKind(state.envelope.status))
      : state.phase === "queued"
        ? statusLabel("queued")
        : state.phase === "failed"
          ? statusLabel("failed")
          : state.phase === "refused"
            ? `Declined · ${state.code}`
            : state.phase === "signed_out"
              ? "Not sent · session ended"
              : state.message;

  const searchDetails = documentEvidence
    ? `${documentEvidence.searched_document_ids.length} attached documents searched. ${documentEvidenceLabel(documentEvidence)}.`
    : report
    ? report.report.map((item) => {
        const name = traceSourceName(item.id);
        if (item.outcome === "SEARCHED_EMPTY") return `${name}: searched; no matches`;
        if (item.outcome === "NOT_SEARCHED") return `${name}: not searched${item.reason ? ` — ${item.reason}` : ""}`;
        const count = item.hits === undefined ? "" : `; ${item.hits} match${item.hits === 1 ? "" : "es"}`;
        return `${name}: searched${count}`;
      }).join(" · ") || "The gateway returned an empty source report."
    : envelope?.searched
      ? `${envelope.searched.bodies.map((body) => `${traceSourceName(body.id)}: ${body.read ? "read" : "not read"}${body.note ? ` — ${body.note}` : ""}`).join(" · ") || "No legal bodies are listed."} · As of ${envelope.searched.as_of}${envelope.searched.defaulted ? " · source scope defaulted" : ""}`
      : state?.phase === "failed"
        ? "No response was received. The backend may have accepted the request; recover the same request before sending another."
        : state?.phase === "queued"
          ? "Search outcomes will appear when the queued answer arrives."
          : "Search outcomes were not included in this turn record.";

  const scopeDetails = hasScope
    ? [
        picked ? `Selected sources: ${picked.length ? picked.map(traceSourceName).join(", ") : "none recorded"}` : "Selected sources: not recorded",
        turn.request ? `Matter: ${turn.request.matterId ? "filed matter (name not recorded on this turn)" : "unfiled workspace"}` : "Matter: not recorded on this saved turn",
        `Files selected: ${fileCount}`,
        turn.request ? `Task: ${turn.request.tool === "draft" ? "draft" : "research"}` : null,
      ].filter(Boolean).join(" · ")
    : "This saved turn does not include its original source, file, or matter selection.";

  const fileDetails = files.length
    ? files.map((file) => `${file.name}: ${file.state === "READ" ? "read" : file.state === "READING" ? "still processing" : "not read"}${file.reason ? ` — ${file.reason}` : ""}`).join(" · ")
    : fileCount > 0
      ? `${fileCount} file${fileCount === 1 ? " was" : "s were"} selected; per-file processing results are not available yet.`
      : "No file processing result is recorded for this turn.";

  const citationDetails = documentEvidence
    ? `${documentEvidence.passages.length} exact document excerpts are shown above. They are saved extraction snapshots, not statutory citations or official verification.`
    : envelope
    ? envelope.citations.length
      ? Array.from(new Set(envelope.citations.map((citation) => `${citation.instrument}${citation.provision ? `, ${citation.provision}` : ""}`))).join(" · ")
      : "The answer returned no citations. A source search alone does not show that evidence supported the answer."
    : state?.phase === "queued"
      ? "Citations are not available until the queued response arrives."
      : state?.phase === "failed"
        ? "No response arrived, so citation results are unknown."
        : "Citation details are not available for this turn.";

  const evidenceDetail = (
    <div className="space-y-2">
      <p>{citationDetails} {fileDetails}</p>
      {state?.phase === "answered" && citationGroups.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Open cited evidence">
          {citationGroups.map((group) => (
            <li key={group.n}>
              <button type="button" onClick={() => onOpenSource(group, null, state.conversationId)}
                className="min-h-11 rounded-chip border border-line-control px-3 text-caption font-medium text-fg hover:bg-wash-2">
                {group.section ? `Open Section ${group.section}` : `Open ${group.label}`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <details className="answer-path rounded-card border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-card px-3 py-2 text-ui text-fg-2 hover:bg-wash">
        <GitBranch className="size-4 flex-none" aria-hidden />
        <span className="font-medium text-fg">How this answer was built</span>
        <span className="ml-auto text-caption text-fg-3">Inspect the trace</span>
      </summary>
      <ol className="grid gap-2 border-t border-line p-3 sm:grid-cols-2">
        <TraceStage number="1" title="Question" status={questionStatus} detail={state?.phase === "failed" ? "The connection failed. The request may still be running; recover the same request before sending another." : "The question text is the input recorded for this conversation turn."} />
        <TraceStage number="2" title="Scope" status={scopeStatus} detail={scopeDetails} />
        <TraceStage number="3" title="Search" status={searchStatus} detail={searchDetails} />
        <TraceStage number="4" title="Evidence" status={evidenceStatus} detail={evidenceDetail} />
        <TraceStage number="5" title="Response" status={answerStatus} detail={envelope ? `Answer status: ${envelope.status}. As of ${envelope.as_of}.` : state?.phase === "queued" ? `Run ${state.runId ?? "not provided"} is awaiting completion.` : state?.phase === "refused" ? state.detail : state?.phase === "invalid" ? state.message : state?.phase === "signed_out" ? "Not sent — the session ended before this question reached the gateway." : state?.phase === "failed" ? "No answer was received. This is not a legal refusal." : "Waiting for the gateway response."} />
      </ol>
      <section aria-labelledby={`processing-${turn.key}`} className="border-t border-line px-3 py-3">
        <h3 id={`processing-${turn.key}`} className="text-ui font-medium text-fg">Model and processing</h3>
        {runId ? (
          <>
            {execution.phase === "idle" ? <button type="button" onClick={() => { void revealExecutionDetails(); }} className="mt-1 min-h-11 rounded-chip px-2 text-ui text-fg-2 underline underline-offset-4 hover:bg-wash-2">Show recorded details</button> : null}
            {execution.phase === "loading" ? <p role="status" className="mt-1 text-ui text-fg-3">Loading the run record…</p> : null}
            {execution.phase === "unavailable" ? <div className="mt-1 flex flex-wrap items-center gap-x-3"><p role="status" className="text-ui text-fg-2">{execution.message}</p><button type="button" onClick={() => { void revealExecutionDetails(); }} className="min-h-11 rounded-chip px-2 text-ui text-fg-2 underline underline-offset-4 hover:bg-wash-2">Try again</button></div> : null}
            {execution.phase === "loaded" ? <ExecutionTrace details={execution} /> : null}
          </>
        ) : <p className="mt-1 text-ui text-fg-2">No run trace is linked to this answer.</p>}
      </section>
      <p className="border-t border-line px-3 py-2 text-caption text-fg-3">This trace shows recorded workflow data. It does not prove that every searched source was used or that an answer is legally correct.</p>
    </details>
  );
}

function ExecutionTrace({ details }: { details: Extract<ExecutionDetails, { phase: "loaded" }> }) {
  const calls = modelCalls(details.steps);
  if (calls.length === 0) {
    return <p className="mt-1 text-ui text-fg-2">No model call was recorded for this run.</p>;
  }
  return <ul className="mt-2 grid gap-2 sm:grid-cols-2" aria-label="Recorded model calls">
    {calls.map((step, index) => <li key={`${step.capability}-${index}`} className="min-w-0 rounded-card border border-line bg-ground px-3 py-2 text-ui">
      <p className="font-medium text-fg">{step.capability}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-fg-2">
        <dt>Step status</dt><dd className="break-words">{step.status}</dd>
        <dt>Provider</dt><dd className="break-words">{step.provider ?? "Not recorded"}</dd>
        <dt>Model</dt><dd className="break-words">{step.model ?? "Not recorded"}</dd>
        <dt>Processing region</dt><dd className="break-words">{step.region ?? "Not recorded"}</dd>
        <dt>Cost</dt><dd className="break-words">{executionCostLabel(step.cost_inr, step.cost_note)}</dd>
      </dl>
    </li>)}</ul>;
}

function TraceStage({ number, title, status, detail }: { number: string; title: string; status: string; detail: React.ReactNode }) {
  return (
    <li className="min-w-0 rounded-card border border-line bg-ground">
      <details>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-ui">
          <span aria-hidden="true" className="grid size-6 flex-none place-items-center rounded-full border border-line-control font-mono text-caption">{number}</span>
          <span className="font-medium text-fg">{title}</span>
          <span className="ml-auto min-w-0 truncate text-right text-caption text-fg-3">{status}</span>
        </summary>
        <div className="break-words px-3 pb-3 text-caption leading-5 text-fg-2">{detail}</div>
      </details>
    </li>
  );
}

function Answered({
  envelope,
  conversationId,
  draftId,
  code,
  sources,
  documentEvidence,
  documentSummary,
  artifacts,
  onRetry,
  retryDisabled,
  onOpenSource,
  onDraft,
}: {
  envelope: Envelope;
  conversationId: string;
  draftId: string | null;
  code?: string | null;
  sources?: SourceReport;
  documentEvidence?: DocumentEvidence;
  documentSummary?: DocumentSummary;
  artifacts?: readonly ConversationArtifact[];
  onRetry?: () => void;
  retryDisabled: boolean;
  onOpenSource: (group: CitationGroup, activeId: string | null, conversationId: string) => void;
  onDraft?: () => void;
}) {
  if (shouldRenderDocumentSummary(documentSummary, envelope)) {
    return <DocumentSummaryAnswer summary={documentSummary} />;
  }
  if (documentEvidence) return <DocumentEvidenceAnswer evidence={documentEvidence} />;
  // A case-routed turn is never a statute answer and never an abstention: it gets its own
  // render path so the two registers can never bleed into each other on screen.
  if (envelope.resource === "case") {
    return <CaseAnswered envelope={envelope} sources={sources} />;
  }
  const kind = envelopeKind(envelope.status);
  const [first, ...rest] = envelope.text_blocks;
  const parsed = parseAnswer(first?.text ?? "");
  const { groups, refs, active } = linkCitations(parsed.sentences, envelope.citations);
  const open = (g: CitationGroup, id: string | null) => onOpenSource(g, id, conversationId);
  // An abstention that still carries CITED text: that text is set aside under its own label.
  // Uncited text (e.g. "See the findings.") stays in the main flow, as served.
  // NOTHING_TRACED: provisions were retrieved but no sentence traced to them. Show them as an
  // openable "provisions found" list with the explanation in the main flow — NOT under
  // "Passages served with this abstention", which is for an abstention that served real traced
  // passages. The model shortfall is not a served passage.
  const nothingTraced = isNothingTraced(kind, code);
  const setAside =
    kind === "refused" && !nothingTraced
    && (parsed.sentences.length > 0 || (first?.citation_ids.length ?? 0) > 0);
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

      {groups.length > 0 && !setAside ? <Sources groups={groups} title={nothingTraced ? "Provisions found — no sentence could be traced to them" : undefined} onOpen={(g) => open(g, null)} /> : null}
      {onDraft && kind === "answered" && envelope.citations.length > 0 ? <button type="button" onClick={onDraft}
        className="flex min-h-11 items-center gap-2 self-start rounded-chip border border-line-control px-3 text-ui text-fg hover:bg-wash">
        <PenLine className="size-4" aria-hidden />Create draft from latest cited answer
      </button> : null}

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
      <Actions envelope={envelope} />
    </article>
  );
}

/**
 * A case-routed turn: judgment discovery ran instead of (or alongside) the statute. This is
 * supporting authority a lawyer may want to read — never a verified statutory answer, and
 * never shown in the abstention register even when `status` is ABSTAINED. The honest-empty
 * case (no judgment matched) still shows the backend's own explanation of what was searched,
 * in this same register — not the dashed "did not arrive" box and not a dead end.
 */
function CaseAnswered({
  envelope,
  sources,
}: {
  envelope: Envelope;
  sources?: SourceReport;
}) {
  const abstained = envelope.status === "ABSTAINED";
  const { hits } = toCaseAnswerRenderModel(envelope, sources);
  const [first, ...rest] = envelope.text_blocks;
  return (
    <article className="flex flex-col gap-4">
      <p className="text-ui font-medium text-fg">
        {abstained ? "Case law search — no supporting authority found" : "Supporting authority — not a verified statutory answer"}
      </p>

      {first ? <p className="max-w-[68ch] whitespace-pre-wrap text-read text-fg">{first.text}</p> : null}
      {rest.map((b, i) => (
        <p key={i} className="max-w-[68ch] text-body text-fg-2">{b.text}</p>
      ))}

      {hits.length > 0 ? (
        <ol aria-label="Supporting authority" className="divide-y divide-line border-y border-line">
          {hits.map((hit) => (
            <li key={hit.id} className="flex min-h-11 items-start gap-3 px-1 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold text-fg">{hit.title}</span>
                <span className="text-caption text-fg-2">{hit.parties.join(" v. ")} · {hit.year} · {hit.court}</span>
              </span>
              <TierBadge tier={hit.tier} />
              {/* aria-disabled keeps it focusable so the label can say why it does nothing —
                  same pattern as the case-law console's own "Open" affordance. */}
              <button
                type="button"
                aria-disabled="true"
                aria-label={`Open ${hit.title} — not wired in this console yet`}
                onClick={(e) => e.preventDefault()}
                className="min-h-11 shrink-0 cursor-not-allowed self-center rounded-chip px-2 text-caption text-fg-3"
              >
                Open
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {envelope.bodies.length > 0 ? <Bodies envelope={envelope} /> : null}
      {sources ? <Searched report={sources} /> : null}

      <ResultLine envelope={envelope} />
      <Actions envelope={envelope} />
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

function Sources({ groups, title, onOpen }: { groups: readonly CitationGroup[]; title?: string; onOpen: (g: CitationGroup) => void }) {
  return (
    <section aria-label={title ?? "Sources"}>
      <h3 className="mb-1 text-ui font-medium text-fg">{title ?? "Sources"}</h3>
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
      {envelope.task === "RESEARCH_QUESTION" ? "Research" : "Result"} as at <span className="font-mono">{envelope.as_of}</span>
      {envelope.task === "REVIEW_CONTRACT" ? <> · Playbook DRAFT — not approved by a lawyer</> : null}
      {envelope.run_id ? <> · Recorded model and region details are in the answer trace</> : null}
      · Not legal advice
    </p>
  );
}

function Actions({ envelope }: { envelope: Envelope }) {
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
