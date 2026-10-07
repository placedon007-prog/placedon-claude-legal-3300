"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { isRefusal, type CitationGetOk, type ConversationMessage, type Envelope, type ReviewResponse } from "@/lib/gateway/types";
import { MIN_REASON_CHARS, isLive } from "@/lib/gateway/types";
import type { Decision, DocumentResponse } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";
import { endSession, passcodeAccepted, startSession } from "@/lib/auth/session";
import { rememberRun } from "@/lib/auth/recent-runs";
import { extractText, MAX_UPLOAD_BYTES } from "@/lib/documents";

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
      readonly draftId: string | null }
  /** The work went on the queue: the reply has not arrived, which is not an empty answer. */
  | { readonly phase: "queued"; readonly conversationId: string; readonly runId: string | null;
      readonly note: string }
  /** The verb declined before answering, by name (e.g. AS_OF_UNSUPPORTED, NO_STORE). */
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  /** The answer never arrived. Never rendered as a refusal. */
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const questionSchema = z
  .string()
  .trim()
  .min(8, "A question needs at least a few words.")
  .max(500, "Questions are capped at 500 characters.");
const idSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9-]+$/);
/** The only override the screen offers: drafting from the thread's last answer. */
const overrideSchema = z.enum(["DRAFT"]).optional();

export async function sendAction(input: {
  conversationId: string | null;
  text: string;
  taskOverride?: "DRAFT";
}): Promise<TurnState> {
  const text = questionSchema.safeParse(input.text);
  if (!text.success) return { phase: "invalid", message: text.error.issues[0].message };
  const cid = input.conversationId === null ? null : idSchema.safeParse(input.conversationId);
  if (cid && !cid.success) return { phase: "invalid", message: "That thread id is not valid." };
  const override = overrideSchema.safeParse(input.taskOverride);
  if (!override.success) return { phase: "invalid", message: "Unknown task." };

  const gateway = await getGateway();
  const result = await gateway.conversationSend({
    text: text.data,
    conversationId: cid?.data,
    taskOverride: override.data,
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
      note: data.note ?? "",
    };
  }
  return {
    phase: "answered",
    conversationId: data.conversation_id,
    envelope: data.envelope,
    draftId: data.draft_id ?? null,
  };
}

export type ThreadLoad =
  | { readonly phase: "loaded"; readonly title: string; readonly messages: readonly ConversationMessage[] }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError };

/** Re-open a stored thread. Called from the Ask page (a server component). */
export async function loadThread(conversationId: string): Promise<ThreadLoad> {
  const cid = idSchema.safeParse(conversationId);
  if (!cid.success) return { phase: "refused", code: "BAD_REQUEST", detail: "That thread id is not valid." };
  const result = await (await getGateway()).conversationGet(cid.data);
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) return { phase: "refused", code: result.data.code, detail: result.data.detail };
  return { phase: "loaded", title: result.data.conversation.title, messages: result.data.messages };
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
  if (!passcodeAccepted(submitted)) {
    // One message for a wrong passcode and for an empty one: telling them apart is the
    // first step of guessing.
    return { error: "That passcode was not accepted." };
  }
  await startSession();
  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/app/login");
}
