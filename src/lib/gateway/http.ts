import "../engine/server-guard";
import type { z } from "zod";
import { engineFail, engineOk, type EngineResult } from "../engine/errors";
import { GATEWAY_ROUTES, type GatewayRoute } from "../engine/types";
import type { GatewayProvider } from "./provider";
import {
  askResponseSchema,
  calendarSchema,
  draftDiffSchema,
  draftExportSchema,
  draftReviseSchema,
  draftStatusSchema,
  draftVersionsSchema,
  tableCancelSchema,
  tableCreateSchema,
  tableExportSchema,
  tableStatusSchema,
  vaultFindSchema,
  vaultStatusSchema,
  vaultUploadSchema,
  vaultVerifySchema,
  documentCheckSchema,
  conversationSendSchema,
  conversationGetSchema,
  citationGetSchema,
  type ConversationSend,
  type ConversationGet,
  type CitationGet,
  cancelSchema,
  decisionSchema,
  documentResponseSchema,
  refusalSchema,
  reviewResponseSchema,
  runSchema,
  runTraceSchema,
  uploadResponseSchema,
  type AskResponse,
  type CancelAck,
  type Decision,
  type DocumentResponse,
  type ReviewResponse,
  type Run,
  type RunTrace,
  type Calendar,
  type DraftDiff,
  type DraftExport,
  type DraftRevise,
  type DraftStatus,
  type DraftVersions,
  type TableCancel,
  type TableCreate,
  type TableExport,
  type TableStatus,
  type UploadResponse,
  type VaultFind,
  type VaultStatus,
  type VaultUpload,
  type VaultVerify,
  type DocumentCheck,
} from "./types";

const TIMEOUT_MS = 120_000; // a live model answer, not a page load

/**
 * The real gateway over HTTP.
 *
 * The API key is sent as `Authorization: Bearer` and exists only in this module's closure.
 * It is never logged, never placed in a URL, and never returned in an error — an operator
 * message that quotes a credential is a credential in a log file.
 */
export class HttpGateway implements GatewayProvider {
  readonly name = "http" as const;

  constructor(
    private readonly origin: string,
    private readonly key: string,
  ) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`GATEWAY_URL is not a URL: ${origin}`);
    }
    const loopback =
      parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !loopback) {
      throw new Error(
        `GATEWAY_URL must be https, or loopback for local development. Got ${parsed.protocol}//${parsed.hostname}. ` +
          "An API key over plain http on a non-loopback host is a key on the wire.",
      );
    }
  }

  private async call<S extends z.ZodType>(
    route: GatewayRoute,
    path: string,
    schema: S,
    init?: { method?: "GET" | "POST"; body?: unknown },
  ): Promise<EngineResult<z.infer<S>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(new URL(path, this.origin), {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.key}`,
          ...(init?.body ? { "content-type": "application/json" } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === "AbortError";
      return engineFail({
        kind: aborted ? "timeout" : "transport_error",
        route,
        message: aborted
          ? `The gateway did not answer within ${TIMEOUT_MS / 1000}s.`
          : "The gateway could not be reached.",
      });
    } finally {
      clearTimeout(timer);
    }

    let body: unknown;
    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      return engineFail({
        kind: "schema_mismatch",
        route,
        status: response.status,
        message: "The gateway answered with something that is not JSON.",
      });
    }

    if (!response.ok) {
      // A 4xx REFUSAL from a verb is a product state, not a transport failure: the
      // pipeline decided, and the decision has a code. It is parsed, not discarded.
      const refusal = refusalSchema.safeParse(body);
      if (refusal.success && (response.status === 404 || response.status === 503)) {
        return engineOk(refusal.data as z.infer<S>);
      }
      const detail =
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : undefined;
      return engineFail({
        kind:
          response.status === 401
            ? "bad_request"
            : response.status >= 500
              ? "server_error"
              : response.status === 404
                ? "not_found"
                : "bad_request",
        route,
        status: response.status,
        message:
          response.status === 401
            ? "The gateway rejected this deployment's API key."
            : `The gateway answered ${response.status}.`,
        detail,
      });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return engineFail({
        kind: "schema_mismatch",
        route,
        status: response.status,
        message: "The gateway's answer did not match the contract this app was built to.",
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      });
    }
    return engineOk(parsed.data);
  }

  ask(question: string): Promise<EngineResult<AskResponse>> {
    return this.call(GATEWAY_ROUTES.ask, GATEWAY_ROUTES.ask, askResponseSchema, {
      method: "POST",
      body: { question },
    });
  }

  reviewContract(input: {
    text: string;
    name?: string;
    testData: boolean;
  }): Promise<EngineResult<ReviewResponse>> {
    return this.call(
      GATEWAY_ROUTES.reviewContract,
      GATEWAY_ROUTES.reviewContract,
      reviewResponseSchema,
      {
        method: "POST",
        // `test_data` is a STRING input on the verb table, and only its truthiness is
        // read. Sent as "yes" so the intent is legible in a request log.
        body: {
          text: input.text,
          name: input.name ?? "contract",
          ...(input.testData ? { test_data: "yes" } : {}),
        },
      },
    );
  }

  run(runId: string): Promise<EngineResult<Run>> {
    return this.call(
      GATEWAY_ROUTES.runGet,
      GATEWAY_ROUTES.runGet.replace("{run_id}", encodeURIComponent(runId)),
      runSchema,
    );
  }

  trace(runId: string): Promise<EngineResult<RunTrace>> {
    return this.call(
      GATEWAY_ROUTES.runTrace,
      GATEWAY_ROUTES.runTrace.replace("{run_id}", encodeURIComponent(runId)),
      runTraceSchema,
    );
  }

  upload(input: { text: string; name?: string }): Promise<EngineResult<UploadResponse>> {
    return this.call(
      GATEWAY_ROUTES.documentUpload,
      GATEWAY_ROUTES.documentUpload,
      uploadResponseSchema,
      { method: "POST", body: { text: input.text, name: input.name ?? "document" } },
    );
  }

  reviewDocument(input: {
    text: string;
    name?: string;
    meetingKind?: "board" | "general";
    meetingDate?: string;
    entryDate?: string;
  }): Promise<EngineResult<DocumentResponse>> {
    return this.call(
      GATEWAY_ROUTES.reviewDocument,
      GATEWAY_ROUTES.reviewDocument,
      documentResponseSchema,
      {
        method: "POST",
        body: {
          text: input.text,
          name: input.name ?? "document",
          meeting_kind: input.meetingKind ?? "board",
          // Omitted rather than sent empty: absent leaves the 30-day entry check
          // NEEDS_BOOK, and an empty string is a date the backend would refuse.
          ...(input.meetingDate ? { meeting_date: input.meetingDate } : {}),
          ...(input.entryDate ? { entry_date: input.entryDate } : {}),
        },
      },
    );
  }

  decide(input: {
    runId: string;
    itemRef: string;
    verdict: "APPROVED" | "REJECTED";
    reason: string;
    quotedSpan: string;
  }): Promise<EngineResult<Decision>> {
    // `runs.approve` generates `/v2/runs/approve/{run_id}` — head first, path field after.
    // NOT `/v2/runs/{run_id}/approve`, which is the shape a REST habit reaches for.
    const template =
      input.verdict === "APPROVED" ? GATEWAY_ROUTES.runApprove : GATEWAY_ROUTES.runReject;
    return this.call(
      template,
      template.replace("{run_id}", encodeURIComponent(input.runId)),
      decisionSchema,
      {
        method: "POST",
        body: {
          item_ref: input.itemRef,
          reason: input.reason,
          quoted_span: input.quotedSpan,
        },
      },
    );
  }

  cancel(runId: string): Promise<EngineResult<CancelAck>> {
    return this.call(
      GATEWAY_ROUTES.runCancel,
      GATEWAY_ROUTES.runCancel.replace("{run_id}", encodeURIComponent(runId)),
      cancelSchema,
      { method: "POST", body: {} },
    );
  }

  /* ── vault ──────────────────────────────────────────────────────────────── */

  vaultUpload(input: {
    name: string;
    text: string;
    matterId?: string;
  }): Promise<EngineResult<VaultUpload>> {
    return this.call(GATEWAY_ROUTES.vaultUpload, GATEWAY_ROUTES.vaultUpload,
      vaultUploadSchema, {
        method: "POST",
        body: {
          name: input.name,
          text: input.text,
          ...(input.matterId ? { matter_id: input.matterId } : {}),
        },
      });
  }

  vaultStatus(input?: { documentId?: string }): Promise<EngineResult<VaultStatus>> {
    return this.call(GATEWAY_ROUTES.vaultStatus, GATEWAY_ROUTES.vaultStatus,
      vaultStatusSchema, {
        method: "POST",
        body: input?.documentId ? { document_id: input.documentId } : {},
      });
  }

  vaultFind(input: { query: string; limit?: number }): Promise<EngineResult<VaultFind>> {
    return this.call(GATEWAY_ROUTES.vaultFind, GATEWAY_ROUTES.vaultFind, vaultFindSchema, {
      method: "POST",
      // `limit` is a STRING input on the verb table, like every other scalar there.
      body: {
        query: input.query,
        ...(input.limit ? { limit: String(input.limit) } : {}),
      },
    });
  }

  vaultVerify(input: { documentId: string }): Promise<EngineResult<VaultVerify>> {
    return this.call(GATEWAY_ROUTES.vaultVerify, GATEWAY_ROUTES.vaultVerify,
      vaultVerifySchema, { method: "POST", body: { document_id: input.documentId } });
  }

  conversationSend(input: {
    conversationId?: string;
    text: string;
    taskOverride?: string;
  }): Promise<EngineResult<ConversationSend>> {
    return this.call(GATEWAY_ROUTES.conversationSend, GATEWAY_ROUTES.conversationSend,
      conversationSendSchema, {
        method: "POST",
        body: {
          text: input.text,
          ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
          ...(input.taskOverride ? { task_override: input.taskOverride } : {}),
        },
      });
  }

  conversationGet(conversationId: string): Promise<EngineResult<ConversationGet>> {
    return this.call(
      GATEWAY_ROUTES.conversationGet,
      GATEWAY_ROUTES.conversationGet.replace("{conversation_id}", encodeURIComponent(conversationId)),
      conversationGetSchema,
    );
  }

  citationGet(input: {
    citationId: string;
    conversationId: string;
  }): Promise<EngineResult<CitationGet>> {
    return this.call(GATEWAY_ROUTES.citationGet, GATEWAY_ROUTES.citationGet,
      citationGetSchema, {
        method: "POST",
        body: { citation_id: input.citationId, conversation_id: input.conversationId },
      });
  }

  documentCheck(input: {
    documentId: string;
    asOf?: string;
    renewable?: boolean;
    supersededBy?: string;
    revokedOn?: string;
  }): Promise<EngineResult<DocumentCheck>> {
    return this.call(GATEWAY_ROUTES.documentCheck, GATEWAY_ROUTES.documentCheck,
      documentCheckSchema, {
        method: "POST",
        body: {
          document_id: input.documentId,
          ...(input.asOf ? { as_of: input.asOf } : {}),
          // `renewable` is a BOOLEAN field on the verb table; the others are strings.
          ...(input.renewable ? { renewable: true } : {}),
          ...(input.supersededBy ? { superseded_by: input.supersededBy } : {}),
          ...(input.revokedOn ? { revoked_on: input.revokedOn } : {}),
        },
      });
  }

  /* ── review tables ──────────────────────────────────────────────────────── */

  tableCreate(input: {
    name: string;
    documentIds: readonly string[];
    columns: readonly { name: string; kind: string; question: string }[];
  }): Promise<EngineResult<TableCreate>> {
    return this.call(GATEWAY_ROUTES.tableCreate, GATEWAY_ROUTES.tableCreate,
      tableCreateSchema, {
        method: "POST",
        body: {
          name: input.name,
          document_ids: [...input.documentIds],
          columns: input.columns.map((c) => ({
            name: c.name,
            kind: c.kind,
            question: c.question,
          })),
        },
      });
  }

  tableStatus(input: { gridId: string }): Promise<EngineResult<TableStatus>> {
    return this.call(GATEWAY_ROUTES.tableStatus, GATEWAY_ROUTES.tableStatus,
      tableStatusSchema, { method: "POST", body: { grid_id: input.gridId } });
  }

  tableExport(input: { gridId: string }): Promise<EngineResult<TableExport>> {
    return this.call(GATEWAY_ROUTES.tableExport, GATEWAY_ROUTES.tableExport,
      tableExportSchema, { method: "POST", body: { grid_id: input.gridId } });
  }

  tableCancel(input: { gridId: string }): Promise<EngineResult<TableCancel>> {
    return this.call(GATEWAY_ROUTES.tableCancel, GATEWAY_ROUTES.tableCancel,
      tableCancelSchema, { method: "POST", body: { grid_id: input.gridId } });
  }

  /* ── drafts ─────────────────────────────────────────────────────────────── */

  draftCreate(input: {
    title: string;
    body?: string;
    kind?: string;
  }): Promise<EngineResult<DraftStatus>> {
    return this.call(GATEWAY_ROUTES.draftCreate, GATEWAY_ROUTES.draftCreate,
      draftStatusSchema, {
        method: "POST",
        body: {
          title: input.title,
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.kind ? { kind: input.kind } : {}),
        },
      });
  }

  draftRevise(input: {
    draftId: string;
    baseVersion: number;
    title?: string;
    body?: string;
    approvedBy?: string;
  }): Promise<EngineResult<DraftRevise>> {
    return this.call(GATEWAY_ROUTES.draftRevise, GATEWAY_ROUTES.draftRevise,
      draftReviseSchema, {
        method: "POST",
        body: {
          draft_id: input.draftId,
          // REQUIRED by the backend. Sent as a string because every scalar on the verb
          // table is one; the handler parses it and refuses a non-number by name.
          base_version: String(input.baseVersion),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.approvedBy ? { approved_by: input.approvedBy } : {}),
        },
      });
  }

  draftVersions(input: { draftId: string }): Promise<EngineResult<DraftVersions>> {
    return this.call(GATEWAY_ROUTES.draftVersions, GATEWAY_ROUTES.draftVersions,
      draftVersionsSchema, { method: "POST", body: { draft_id: input.draftId } });
  }

  draftDiff(input: {
    draftId: string;
    fromVersion?: number;
    toVersion?: number;
  }): Promise<EngineResult<DraftDiff>> {
    return this.call(GATEWAY_ROUTES.draftDiff, GATEWAY_ROUTES.draftDiff, draftDiffSchema, {
      method: "POST",
      body: {
        draft_id: input.draftId,
        ...(input.fromVersion ? { from_version: String(input.fromVersion) } : {}),
        ...(input.toVersion ? { to_version: String(input.toVersion) } : {}),
      },
    });
  }

  draftExport(input: {
    draftId: string;
    version?: number;
    format?: "text" | "docx";
  }): Promise<EngineResult<DraftExport>> {
    return this.call(GATEWAY_ROUTES.draftExport, GATEWAY_ROUTES.draftExport,
      draftExportSchema, {
        method: "POST",
        body: {
          draft_id: input.draftId,
          ...(input.version ? { version: String(input.version) } : {}),
          ...(input.format ? { format: input.format } : {}),
        },
      });
  }

  /* ── calendar ───────────────────────────────────────────────────────────── */

  calendarUpcoming(input: {
    company: Record<string, unknown>;
    anchors?: Record<string, string>;
    intervals?: Record<string, string>;
    asOf?: string;
    horizonDays?: number;
  }): Promise<EngineResult<Calendar>> {
    return this.call(GATEWAY_ROUTES.calendarUpcoming, GATEWAY_ROUTES.calendarUpcoming,
      calendarSchema, {
        method: "POST",
        body: {
          company: input.company,
          ...(input.anchors ? { anchors: input.anchors } : {}),
          ...(input.intervals ? { intervals: input.intervals } : {}),
          ...(input.asOf ? { as_of: input.asOf } : {}),
          ...(input.horizonDays ? { horizon_days: String(input.horizonDays) } : {}),
        },
      });
  }
}
