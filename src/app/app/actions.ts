"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { isRefusal, type SourceBody, type SourceIntegration, type SourceReport, type DocumentEvidence, type DocumentSummary, type ConversationArtifact, type CitationGetOk, type ConversationMessage, type Envelope, type ReviewResponse, type RunStep } from "@/lib/gateway/types";
import { MIN_REASON_CHARS, isLive } from "@/lib/gateway/types";
import type { Decision, DocumentResponse } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";
import { GATEWAY_ROUTES } from "@/lib/engine/types";
import { authenticatePasscode, endSession, hasSession, startAccountSession, startSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { loginGateway } from "@/lib/gateway/provider";
import { accountLoginOutcome } from "@/lib/auth/account-login";
import { rememberRun } from "@/lib/auth/recent-runs";
import { extractText, MAX_UPLOAD_BYTES } from "@/lib/documents";
import { toCaseLawRenderModel, type CaseLawRenderModel } from "@/lib/case-law";
import { sourceCatalogFailureMessage } from "@/lib/sources";
import type { WebResearch } from "@/lib/gateway/types";


/**
 * Server Actions for `/app`.
 *
 * Everything that touches the gateway lives here. No client component imports
 * `@/lib/gateway` — the API key would be inlined into the public bundle, and
 * `server-guard` would throw at build rather than let it.
 *
 * Every action returns a discriminated state. **`failure` and `refusal` are different
 * branches on purpose**: a refusal is a product answer the pipeline decided on and carries
 * a code; a failure means the answer never arrived. Rendering the second in the abstain
 * register is the defect AGENTS.md names, so the types do not allow it.
 */

/** One turn of the Ask thread, as the screen renders it. */
export type TurnState =
  /** The gateway answered with an envelope (any status, including ABSTAINED). */
  | { readonly phase: "answered"; readonly conversationId: string; readonly envelope: Envelope;
      readonly draftId: string | null;
      readonly sources?: SourceReport;
      readonly documentEvidence?: DocumentEvidence;
      readonly documentSummary?: DocumentSummary;
      readonly artifacts?: readonly ConversationArtifact[];
      /** The refusal/failure code the gateway returned beside the envelope (NO_MODEL,
       *  NOTHING_TRACED, NO_EVIDENCE…), so the screen can tell a model shortfall from an
       *  abstention. Null when none. */
      readonly code: string | null;
      /** Where the model that wrote it ran, from the run's own trace; null if not stated. */
      readonly region: string | null }
  /** The work went on the queue: the reply has not arrived, which is not an empty answer. */
  | { readonly phase: "queued"; readonly conversationId: string; readonly runId: string | null;
      readonly note: string; readonly messageId?: string }
  /** The verb declined before answering, by name (e.g. AS_OF_UNSUPPORTED, NO_STORE). */
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  /** The answer never arrived. Never rendered as a refusal. */
  | { readonly phase: "failed"; readonly error: EngineError }
  /** The session had ended before the request could be sent. Not an answer and not a refusal:
   *  it is an auth state the client recovers from by routing to sign-in and restoring the
   *  draft afterwards, never by printing "sign in" into the thread as if it were the reply. */
  | { readonly phase: "signed_out" }
  | { readonly phase: "invalid"; readonly message: string };

const questionSchema = z
  .string()
  .trim()
  .min(8, "A question needs at least a few words.")
  .max(8000, "Questions are capped at 8,000 characters.");
const idSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9-]+$/);
/** The only override the screen offers: drafting from the thread's last answer. */
const overrideSchema = z.enum(["DRAFT"]).optional();

const sourcesInputSchema = z.array(z.string().regex(/^[A-Za-z0-9_]{1,40}$/)).max(40).optional();

export async function sendAction(input: {
  conversationId: string | null;
  requestId: string;
  fileIds?: readonly string[];
  text: string;
  taskOverride?: "DRAFT";
  /** Source ids from sources.list; the gateway refuses an unknown one by name. */
  sources?: readonly string[];
  matterId?: string | null;
}): Promise<TurnState> {
  if (!(await hasSession())) return { phase: "signed_out" };
  const request = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).safeParse(input.requestId);
  if (!request.success) return { phase: "invalid", message: "This request could not be identified. Reload and try again." };
  const files = z.array(idSchema).max(20).safeParse(input.fileIds ? [...input.fileIds] : []);
  if (!files.success) return { phase: "invalid", message: "Choose up to 20 valid documents." };
  const text = questionSchema.safeParse(input.text);
  if (!text.success) return { phase: "invalid", message: text.error.issues[0].message };
  const cid = input.conversationId === null ? null : idSchema.safeParse(input.conversationId);
  if (cid && !cid.success) return { phase: "invalid", message: "That thread id is not valid." };
  const override = overrideSchema.safeParse(input.taskOverride);
  if (!override.success) return { phase: "invalid", message: "Unknown task." };
  const sources = sourcesInputSchema.safeParse(input.sources ? [...input.sources] : undefined);
  if (!sources.success) return { phase: "invalid", message: "Those sources are not valid ids." };
  const matter = input.matterId ? idSchema.safeParse(input.matterId) : null;
  if (matter && !matter.success) return { phase: "invalid", message: "That matter id is not valid." };

  const gateway = await getGateway();
  const result = await gateway.conversationSend({
    text: text.data,
    requestId: request.data,
    fileIds: files.data,
    conversationId: cid?.data,
    taskOverride: override.data,
    sources: sources.data,
    matterId: matter?.data,
  });
  if (!result.ok) return { phase: "failed", error: result.error };
  const data = result.data;
  if (isRefusal(data)) return { phase: "refused", code: data.code, detail: data.detail };

  if (data.run_id) {
    await rememberRun({
      id: data.run_id,
      intent: override.data === "DRAFT" ? "draft" : "conversation",
      at: new Date().toISOString(),
      label: text.data.slice(0, 80),
    });
  }
  if (data.envelope === null) {
    return {
      phase: "queued",
      conversationId: data.conversation_id,
      runId: data.run_id ?? null,
      messageId: data.message_id,
      note: data.note ?? "",
    };
  }
  return {
    phase: "answered",
    conversationId: data.conversation_id,
    envelope: data.envelope,
    draftId: data.draft_id ?? null,
    code: data.code ?? null,
    region: null,
    sources: data.metadata?.sources ?? data.sources,
    documentEvidence: data.metadata?.document_evidence ?? data.document_evidence,
    documentSummary: data.metadata?.document_summary ?? data.document_summary,
    artifacts: data.metadata?.artifacts ?? [
      ...(data.draft_id ? [{ type: "draft" as const, id: data.draft_id, version: data.version }] : []),
      ...(data.grid_id ? [{ type: "review_table" as const, id: data.grid_id }] : []),
    ],
  };
}

export type DocumentsState =
  | { readonly phase: "found"; readonly hits: readonly { id: string; name: string }[]; readonly note: string }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError };

/** "@" in the composer: Wall System documents matching what was typed (vault.find). */
export async function findDocumentsAction(query: string): Promise<DocumentsState> {
  if (!(await hasSession())) return { phase: "refused", code: "SESSION_EXPIRED", detail: "Sign in to search documents." };
  const q = z.string().trim().min(3).max(120).safeParse(query);
  if (!q.success) return { phase: "found", hits: [], note: "" };
  const result = await (await getGateway()).vaultFind({ query: q.data, limit: 8 });
  if (!result.ok) return { phase: "failed", error: result.error };
  const data = result.data;
  if (isRefusal(data)) return { phase: "refused", code: data.code, detail: data.detail };
  const seen = new Set<string>();
  const hits = data.hits
    .filter((h) => (seen.has(h.document_id) ? false : (seen.add(h.document_id), true)))
    .map((h) => ({ id: h.document_id, name: h.name ?? h.document_id.slice(0, 12) }));
  return { phase: "found", hits, note: data.scope_note || data.note };
}

export type CaseLawSearchState =
  /** The gateway answered. `found` always, even with zero judgments — an empty list is a
   *  result, not a failure, and the model says so via `hits.length`. */
  | { readonly phase: "found"; readonly model: CaseLawRenderModel }
  /** The answer never arrived. Never rendered as "no case found" — that is a different claim. */
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const caseLawQuerySchema = z
  .string()
  .trim()
  .min(2, "Enter a party or case name.")
  .max(200, "Case-law search is capped at 200 characters.");

/**
 * Case-law discovery: `sources.search`, by party or case name, never by legal topic. The
 * reply is a `judgments` list — tier LICENSED, supporting authority, never a verified
 * statutory answer — mapped by the pure `toCaseLawRenderModel` so the UI has nothing to
 * decide on its own. A transport failure returns `failed`, never an abstention: discovery
 * has no abstain state to begin with, and a failure here must not borrow one.
 */
export async function searchCaseLawAction(query: string): Promise<CaseLawSearchState> {
  if (!(await hasSession())) return { phase: "invalid", message: "Your session has ended. Sign in to continue." };
  const parsed = caseLawQuerySchema.safeParse(query);
  if (!parsed.success) return { phase: "invalid", message: parsed.error.issues[0].message };
  const result = await (await getGateway()).sourcesSearch({ query: parsed.data });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "found", model: toCaseLawRenderModel(result.data) };
}

export type WebResearchState =
  | { readonly phase: "result"; readonly result: WebResearch }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "signed_out" }
  | { readonly phase: "invalid"; readonly message: string };

/** Query-only public research. Files, matter IDs and thread history are intentionally absent. */
export async function webResearchAction(input: {
  query: string;
  mode: "GENERAL_WEB" | "CASE_DISCOVERY";
  externalSearchConsent: boolean;
}): Promise<WebResearchState> {
  if (!(await hasSession())) return { phase: "signed_out" };
  const query = z.string().trim().min(3, "Enter at least three characters.").max(800, "Search is capped at 800 characters.").safeParse(input.query);
  if (!query.success) return { phase: "invalid", message: query.error.issues[0].message };
  const mode = z.enum(["GENERAL_WEB", "CASE_DISCOVERY"]).safeParse(input.mode);
  if (!mode.success) return { phase: "invalid", message: "Choose a research type." };
  const consent = z.boolean().safeParse(input.externalSearchConsent);
  if (!consent.success) return { phase: "invalid", message: "Confirm before sending this question to the public web provider." };
  try {
    const result = await (await getGateway()).researchWeb({
      query: query.data,
      mode: mode.data,
      externalSearchConsent: consent.data,
    });
    if (!result.ok) return { phase: "failed", error: result.error };
    return { phase: "result", result: result.data };
  } catch {
    return { phase: "failed", error: {
      kind: "transport_error", message: "The research service is temporarily unavailable.",
      route: GATEWAY_ROUTES.researchWeb,
    } };
  }
}

export async function documentReadinessAction(documentId: string): Promise<{ state: string; note: string }> {
  if (!(await hasSession())) return { state: "UNKNOWN", note: "Sign in to check this document." };
  const id = idSchema.safeParse(documentId);
  if (!id.success) return { state: "CANNOT_READ", note: "This document ID is not valid." };
  const result = await (await getGateway()).vaultDocument(id.data);
  if (!result.ok) return { state: "UNKNOWN", note: "Document status is temporarily unavailable." };
  if (isRefusal(result.data)) return { state: "CANNOT_READ", note: result.data.detail };
  return { state: result.data.state, note: result.data.class_reason ?? "" };
}

export type ThreadLoad =
  | { readonly phase: "loaded"; readonly title: string; readonly matterId: string | null; readonly messages: readonly ConversationMessage[] }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError };

/** Re-open a stored thread. Called from the Ask page (a server component). */
export async function loadThread(conversationId: string): Promise<ThreadLoad> {
  if (!(await hasSession())) return { phase: "refused", code: "SESSION_EXPIRED", detail: "Sign in to open this conversation." };
  const cid = idSchema.safeParse(conversationId);
  if (!cid.success) return { phase: "refused", code: "BAD_REQUEST", detail: "That thread id is not valid." };
  const result = await (await getGateway()).conversationGet(cid.data);
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) return { phase: "refused", code: result.data.code, detail: result.data.detail };
  return { phase: "loaded", title: result.data.conversation.title, matterId: result.data.conversation.matter_id ?? null, messages: result.data.messages };
}

export type ExecutionDetails =
  | { readonly phase: "loaded"; readonly steps: readonly Pick<RunStep, "capability" | "status" | "model" | "provider" | "region" | "cost_inr" | "cost_note">[] }
  | { readonly phase: "unavailable"; readonly message: string };

/** Read only the run fields shown in the conversation's on-demand provenance panel. */
export async function loadExecutionDetails(runId: string): Promise<ExecutionDetails> {
  if (!(await hasSession())) {
    return { phase: "unavailable", message: "Sign in to view processing details." };
  }
  const id = idSchema.safeParse(runId);
  if (!id.success) return { phase: "unavailable", message: "Processing details are not available for this turn." };

  const result = await (await getGateway()).trace(id.data);
  if (!result.ok) {
    return { phase: "unavailable", message: "Processing details could not be loaded. The answer above is unchanged." };
  }
  return {
    phase: "loaded",
    steps: result.data.steps.map(({ capability, status, model, provider, region, cost_inr, cost_note }) => ({
      capability, status, model, provider, region, cost_inr, cost_note,
    })),
  };
}

export type MatterHistory =
  | { phase: "loaded"; conversations: readonly { conversation_id: string; title: string; updated_at?: string | null }[] }
  | { phase: "unavailable"; message: string };

export async function loadMatterHistory(matterId: string): Promise<MatterHistory> {
  if (!(await hasSession())) return { phase: "unavailable", message: "Sign in to open matter history." };
  const id = idSchema.safeParse(matterId);
  if (!id.success) return { phase: "unavailable", message: "Choose a valid matter." };
  const result = await (await getGateway()).conversationList(id.data);
  if (!result.ok) return { phase: "unavailable", message: "Matter history did not arrive. Close and reopen to retry." };
  if (isRefusal(result.data)) return { phase: "unavailable", message: result.data.detail };
  return { phase: "loaded", conversations: result.data.conversations };
}

export type CitationState =
  | { readonly phase: "read"; readonly data: CitationGetOk }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError };

/** The source panel's read: one citation, its quote re-read from the corpus just now. */
export async function citationAction(input: {
  citationId: string;
  conversationId: string;
}): Promise<CitationState> {
  if (!(await hasSession())) return { phase: "refused", code: "SESSION_EXPIRED", detail: "Sign in to read this source." };
  const ids = z.object({ citationId: idSchema, conversationId: idSchema }).safeParse(input);
  if (!ids.success) return { phase: "refused", code: "BAD_REQUEST", detail: "Not a citation id." };
  const result = await (await getGateway()).citationGet(ids.data);
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) return { phase: "refused", code: result.data.code, detail: result.data.detail };
  return { phase: "read", data: result.data };
}

export interface SourceDoc {
  readonly name: string;
  readonly kind: "docx" | "pdf" | "text" | "pasted";
  readonly bytes: number;
  /** The sha256 the gateway stored it under. Null when only pasted text was reviewed. */
  readonly sha256: string | null;
}

export type ReviewState =
  | { readonly phase: "idle" }
  | {
      readonly phase: "reviewed";
      readonly data: ReviewResponse;
      readonly source: SourceDoc;
    }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const contractSchema = z
  .string()
  .trim()
  .min(40, "That is too short to be a contract. Paste the full text.")
  .max(60_000, "Contracts are capped at 60,000 characters in the prototype.");

export async function reviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  if (!(await hasSession())) return { phase: "invalid", message: "Your session has ended. Sign in to continue." };
  // A FILE wins over the textarea when both are present: someone who attached a document
  // meant that document, and silently reviewing the box instead would review the wrong
  // thing while looking like it worked.
  const file = formData.get("file");
  let source: SourceDoc | null = null;
  let raw: unknown = formData.get("text");

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        phase: "invalid",
        message: `That file is larger than ${MAX_UPLOAD_BYTES / 1_048_576} MB.`,
      };
    }
    const extracted = extractText(file.name, new Uint8Array(await file.arrayBuffer()));
    if (!extracted.ok) return { phase: "invalid", message: extracted.reason };
    raw = extracted.text;
    source = {
      name: file.name,
      kind: extracted.kind,
      bytes: file.size,
      sha256: null,
    };
  }

  const text = contractSchema.safeParse(raw);
  if (!text.success) {
    return { phase: "invalid", message: text.error.issues[0].message };
  }
  // The checkbox is the operator ASSERTING this is test data. PLAN_22 D3 forbids a real
  // client contract while the deployment region is unconfirmed, and the backend refuses
  // one — this is the same statement made where a person can read it.
  if (formData.get("test_data") !== "on") {
    return {
      phase: "invalid",
      message:
        "Confirm this is a test document. The model is hosted in UAE North and no client contract may be sent there (PLAN_22 D3).",
    };
  }
  const name =
    (String(formData.get("name") ?? "").trim() || source?.name || "contract").slice(0, 80);

  const gateway = await getGateway();

  // Record the document FIRST, so the review has something to point at. The gateway
  // identifies a document by its sha256, so uploading the same bytes twice is one
  // document. An upload failure does not stop the review — the review is the answer the
  // lawyer came for, and the id is provenance.
  if (source) {
    const stored = await gateway.upload({ text: text.data, name: source.name });
    if (stored.ok) source = { ...source, sha256: stored.data.sha256 };
  }

  const result = await gateway.reviewContract({ text: text.data, name, testData: true });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (result.data.run_id) {
    await rememberRun({
      id: result.data.run_id,
      intent: "review_contract",
      at: new Date().toISOString(),
      label: name,
    });
  }
  return {
    phase: "reviewed",
    data: result.data,
    source:
      source ??
      { name, kind: "pasted", bytes: new TextEncoder().encode(text.data).length, sha256: null },
  };
}

/* ── review_document ──────────────────────────────────────────────────────── */

export type DocumentState =
  | { readonly phase: "idle" }
  | {
      readonly phase: "reviewed";
      readonly data: DocumentResponse;
      readonly source: SourceDoc;
    }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const documentSchema = z
  .string()
  .trim()
  .min(40, "That is too short to be a filing. Paste the full text.")
  .max(60_000, "Documents are capped at 60,000 characters in the prototype.");

// An empty date is absent, which is a real state — it leaves the 30-day entry check
// NEEDS_BOOK. A malformed one is a typo, and the backend refuses it rather than reporting
// "not supplied" about a date the person did supply.
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates are YYYY-MM-DD.")
  .optional();

export async function reviewDocumentAction(
  _prev: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  if (!(await hasSession())) return { phase: "invalid", message: "Your session has ended. Sign in to continue." };
  const file = formData.get("file");
  let source: SourceDoc | null = null;
  let raw: unknown = formData.get("text");

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        phase: "invalid",
        message: `That file is larger than ${MAX_UPLOAD_BYTES / 1_048_576} MB.`,
      };
    }
    const extracted = extractText(file.name, new Uint8Array(await file.arrayBuffer()));
    if (!extracted.ok) return { phase: "invalid", message: extracted.reason };
    raw = extracted.text;
    source = { name: file.name, kind: extracted.kind, bytes: file.size, sha256: null };
  }

  const text = documentSchema.safeParse(raw);
  if (!text.success) return { phase: "invalid", message: text.error.issues[0].message };

  const dates = z
    .object({ meetingDate: dateSchema, entryDate: dateSchema })
    .safeParse({
      meetingDate: String(formData.get("meeting_date") ?? "").trim() || undefined,
      entryDate: String(formData.get("entry_date") ?? "").trim() || undefined,
    });
  if (!dates.success) return { phase: "invalid", message: dates.error.issues[0].message };

  const kind = formData.get("meeting_kind") === "general" ? "general" : "board";
  const name =
    (String(formData.get("name") ?? "").trim() || source?.name || "document").slice(0, 80);

  // NO test_data tick, and its absence is the point: this intent calls no model, so
  // nothing leaves the process and there is no residency question to assert about.
  const gateway = await getGateway();
  if (source) {
    const stored = await gateway.upload({ text: text.data, name: source.name });
    if (stored.ok) source = { ...source, sha256: stored.data.sha256 };
  }

  const result = await gateway.reviewDocument({
    text: text.data,
    name,
    meetingKind: kind,
    meetingDate: dates.data.meetingDate,
    entryDate: dates.data.entryDate,
  });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (result.data.run_id) {
    await rememberRun({
      id: result.data.run_id,
      intent: "review_document",
      at: new Date().toISOString(),
      label: name,
    });
  }
  return {
    phase: "reviewed",
    data: result.data,
    source:
      source ??
      { name, kind: "pasted", bytes: new TextEncoder().encode(text.data).length, sha256: null },
  };
}

/* ── the human gate ───────────────────────────────────────────────────────── */

export type DecisionState =
  | { readonly phase: "idle" }
  | { readonly phase: "recorded"; readonly data: Decision }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

export async function decideAction(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  if (!(await hasSession())) return { phase: "invalid", message: "Your session has ended. Sign in to continue." };
  const runId = String(formData.get("run_id") ?? "").trim();
  const itemRef = String(formData.get("item_ref") ?? "").trim();
  const quotedSpan = String(formData.get("quoted_span") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const verdict = formData.get("verdict") === "APPROVED" ? "APPROVED" : "REJECTED";

  if (!runId || !itemRef) {
    return { phase: "invalid", message: "This finding cannot be identified." };
  }
  // The browser checks this too, and it is checked again here, and a third time by the
  // gateway. A control that can be bypassed with a disabled JS engine is not a gate.
  if (reason.length < MIN_REASON_CHARS) {
    return {
      phase: "invalid",
      message: `Write at least ${MIN_REASON_CHARS} characters saying why. A decision with no reason records that somebody clicked.`,
    };
  }
  if (!quotedSpan) {
    return {
      phase: "invalid",
      message: "Open the quote before deciding: the record has to say what you read.",
    };
  }

  const gateway = await getGateway();
  const result = await gateway.decide({ runId, itemRef, verdict, reason, quotedSpan });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "recorded", data: result.data };
}

/* ── the durable executor: polling and cancelling ─────────────────────────── */

export interface RunSnapshot {
  readonly id: string;
  readonly status: string;
  readonly refusalCode: string | null;
  readonly live: boolean;
  readonly steps: readonly { capability: string; status: string }[];
  /** Set when the run could not be READ. Never confused with a run that refused. */
  readonly unreachable: string | null;
}

/**
 * One poll. Returns a snapshot, never throws, and says `unreachable` when the gateway could
 * not be reached — which is a different thing from a run that finished REFUSED, and the
 * screen renders them differently.
 */
export async function pollRun(runId: string): Promise<RunSnapshot> {
  if (!(await hasSession())) return { id: runId, status: "UNKNOWN", refusalCode: null, live: false, steps: [], unreachable: "Your session has ended. Sign in to continue." };
  const gateway = await getGateway();
  const [run, trace] = await Promise.all([gateway.run(runId), gateway.trace(runId)]);
  if (!run.ok) {
    return {
      id: runId, status: "UNKNOWN", refusalCode: null, live: false, steps: [],
      unreachable: `${run.error.kind}: ${run.error.message}`,
    };
  }
  return {
    id: runId,
    status: run.data.status,
    refusalCode: run.data.refusal_code ?? null,
    live: isLive(run.data.status),
    steps: trace.ok
      ? trace.data.steps.map((s) => ({ capability: s.capability, status: s.status }))
      : [],
    unreachable: null,
  };
}

export type CancelState =
  | { readonly phase: "idle" }
  | { readonly phase: "requested"; readonly note: string }
  | { readonly phase: "refused"; readonly message: string }
  | { readonly phase: "failed"; readonly error: EngineError };

export async function cancelRunAction(
  _prev: CancelState,
  formData: FormData,
): Promise<CancelState> {
  if (!(await hasSession())) return { phase: "refused", message: "Your session has ended. Sign in to continue." };
  const runId = String(formData.get("run_id") ?? "").trim();
  if (!runId) return { phase: "refused", message: "This run cannot be identified." };
  const gateway = await getGateway();
  const r = await gateway.cancel(runId);
  if (r.ok) {
    return { phase: "requested", note: r.data.note ?? "Cancellation requested." };
  }
  // The gateway answers "already finished" and "no such run" with ONE code, so the screen
  // must not invent a distinction it deliberately does not have.
  if (r.error.status === 409 || r.error.status === 400) {
    return { phase: "refused", message: r.error.detail ?? r.error.message };
  }
  return { phase: "failed", error: r.error };
}

export type LoginState = { readonly error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const submitted = String(formData.get("passcode") ?? "");
  // Where to land after sign-in. `safeNextPath` refuses anything outside the console, so a
  // crafted `next` cannot turn the login form into an open redirect.
  const next = safeNextPath(formData.get("next")?.toString());
  const authentication = await authenticatePasscode(submitted);
  if (!authentication.accepted) {
    if (authentication.retryAfterSeconds) return {
      error: `Too many sign-in attempts. Try again in ${authentication.retryAfterSeconds} seconds.`,
    };
    if (authentication.configurationIssue) return { error: "Sign-in is not configured. Contact the workspace operator." };
    // Wrong and empty passcodes share one response; throttling never tests the passcode.
    return { error: "That passcode was not accepted." };
  }
  await startSession();
  redirect(next);
}

export type AccountLoginState = {
  readonly error: string | null;
  /** Set when the form was understood but this workspace cannot check it yet. */
  readonly notice: string | null;
};

/**
 * Email + password → the backend `auth.login` verb, SERVER-SIDE ONLY.
 *
 * Malformed input is rejected before any network call. On success the backend's session
 * token goes straight into an httpOnly cookie (never the client bundle, never a log) with
 * the backend's own expiry, and the person lands on `/app`. Every credential failure — wrong
 * password, unknown email, disabled account, un-accepted invite — returns ONE message so
 * sign-in cannot enumerate accounts; a lockout and a transport failure are distinct states.
 *
 * `loginGateway()` (not `getGateway()`) is used on purpose: `auth.login` is the pre-session
 * verb, so it must not require a session to run.
 */
export async function accountLoginAction(
  _prev: AccountLoginState,
  formData: FormData,
): Promise<AccountLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Where to land after sign-in. `safeNextPath` refuses anything outside the console, so a
  // crafted `next` cannot turn accounts-mode sign-in into an open redirect either.
  const next = safeNextPath(formData.get("next")?.toString());
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter the email address your workspace invited.", notice: null };
  }
  if (password.length === 0 || password.length > 4096) {
    return { error: "Enter your password.", notice: null };
  }

  let gateway: Awaited<ReturnType<typeof loginGateway>>;
  try {
    gateway = await loginGateway();
  } catch {
    // The gateway is not configured — a deployment fault, not a credential one.
    return { error: "Sign-in is not available right now. Try again shortly.", notice: null };
  }

  const outcome = accountLoginOutcome(await gateway.authLogin({ email, password }));
  if (outcome.kind === "error") {
    return { error: outcome.message, notice: null };
  }
  await startAccountSession(outcome.token, outcome.expiresAt);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export type ComposerContext = {
  /** sources.list `bodies`, or why they did not load. A failure is not a refusal. */
  readonly sources:
    | { readonly phase: "loaded"; readonly bodies: readonly SourceBody[]; readonly integrations: readonly SourceIntegration[] }
    | { readonly phase: "failed"; readonly kind: string; readonly status?: number; readonly message: string };
  readonly matters: readonly { matter_id: string; name: string }[];
};

/** What the composer needs before the first keystroke. Read on the server, never the client. */
export async function loadComposerContext(): Promise<ComposerContext> {
  if (!(await hasSession())) return { sources: { phase: "failed", kind: "session", message: sourceCatalogFailureMessage("session") }, matters: [] };
  let gateway: Awaited<ReturnType<typeof getGateway>>;
  try {
    gateway = await getGateway();
  } catch {
    return { sources: { phase: "failed", kind: "transport_error", message: sourceCatalogFailureMessage("transport_error") }, matters: [] };
  }
  // These reads are independent: an optional matter-list failure must not turn a healthy
  // source catalogue into a failed composer context, and one rejected read must not hide
  // the other result.
  const [sourceResult, matterResult] = await Promise.allSettled([
    gateway.sourcesList(),
    gateway.mattersList(),
  ]);
  const sources = sourceResult.status === "fulfilled" ? sourceResult.value : null;
  const matters = matterResult.status === "fulfilled" ? matterResult.value : null;
  return {
    sources: sources?.ok
      ? { phase: "loaded", bodies: sources.data.bodies, integrations: sources.data.integrations }
      : {
          phase: "failed",
          kind: sources && !sources.ok ? sources.error.kind : "transport_error",
          status: sources && !sources.ok ? sources.error.status : undefined,
          message: sourceCatalogFailureMessage(
            sources && !sources.ok ? sources.error.kind : "transport_error",
            sources && !sources.ok ? sources.error.status : undefined,
          ),
        },
    // A matters failure only hides the optional matter chip; it never blocks asking.
    matters: matters?.ok ? matters.data.matters.map(({ matter_id, name }) => ({ matter_id, name })) : [],
  };
}
