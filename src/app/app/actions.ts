"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { parseAnswer, type ParsedAnswer, type ReviewResponse } from "@/lib/gateway/types";
import { MIN_REASON_CHARS } from "@/lib/gateway/types";
import type { Decision, DocumentResponse } from "@/lib/gateway/types";
import type { AskResponse } from "@/lib/gateway/types";
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

export type AskState =
  | { readonly phase: "idle" }
  | { readonly phase: "answered"; readonly data: AskResponse; readonly parsed: ParsedAnswer }
  | { readonly phase: "refused"; readonly data: AskResponse }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const questionSchema = z
  .string()
  .trim()
  .min(8, "A question needs at least a few words.")
  .max(500, "Questions are capped at 500 characters.");

export async function askAction(
  _prev: AskState,
  formData: FormData,
): Promise<AskState> {
  const parsedInput = questionSchema.safeParse(formData.get("question"));
  if (!parsedInput.success) {
    return { phase: "invalid", message: parsedInput.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.ask(parsedInput.data);
  if (!result.ok) return { phase: "failed", error: result.error };

  const data = result.data;
  if (data.run_id) {
    await rememberRun({
      id: data.run_id,
      intent: "research_question",
      at: new Date().toISOString(),
      label: parsedInput.data.slice(0, 80),
    });
  }
  if (data.status === "REFUSED" || data.status === "FAILED") {
    return { phase: "refused", data };
  }
  return { phase: "answered", data, parsed: parseAnswer(data.answer ?? "") };
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
