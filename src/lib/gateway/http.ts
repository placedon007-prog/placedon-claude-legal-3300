import "../engine/server-guard";
import type { z } from "zod";
import { engineFail, engineOk, type EngineResult } from "../engine/errors";
import { GATEWAY_ROUTES, type GatewayRoute } from "../engine/types";
import type { GatewayProvider } from "./provider";
import {
  askResponseSchema,
  authLoginSchema,
  inviteAcceptSchema,
  type InviteAccept,
  authLogoutOkSchema,
  type AuthLogoutOk,
  calendarSchema,
  draftDiffSchema,
  draftExportSchema,
  draftListSchema,
  draftReviseSchema,
  draftStatusSchema,
  draftVersionsSchema,
  tableCancelSchema,
  tableCreateSchema,
  tableExportSchema,
  tableStatusSchema,
  vaultFindSchema,
  vaultStatusSchema,
  vaultDocumentSchema,
  vaultListSchema,
  vaultUploadSchema,
  vaultVerifySchema,
  documentCheckSchema,
  conversationSendSchema,
  sourcesListSchema,
  sourcesSearchSchema,
  webResearchSchema,
  mattersListSchema,
  type SourcesList,
  type SourcesSearch,
  type WebResearch,
  type MattersList,
  conversationGetSchema,
  conversationListSchema,
  citationGetSchema,
  type ConversationSend,
  type ConversationGet,
  type CitationGet,
  cancelSchema,
  decisionSchema,
  documentResponseSchema,
  refusalSchema,
  reviewResponseSchema,
  verbRefusalSchema,
  runSchema,
  runTraceSchema,
  uploadResponseSchema,
  type AskResponse,
  type AuthLogin,
  type CancelAck,
  type Decision,
  type DocumentResponse,
  type ReviewResponse,
  type VerbRefusal,
  type Run,
  type RunTrace,
  type Calendar,
  type DraftDiff,
  type DraftExport,
  type DraftList,
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

  private readonly origin: string;
  private readonly key: string;
  /** Set when `key` is a person's session (accounts mode): a 401 then means the session
   *  ended -- revoked, expired, or signed out elsewhere -- and the caller ends it here too. */
  private readonly onUnauthorized?: () => void;

  constructor(origin: string, key: string, options?: { onUnauthorized?: () => void }) {
    this.origin = origin;
    this.key = key;
    this.onUnauthorized = options?.onUnauthorized;
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
    init?: { method?: "GET" | "POST"; body?: unknown; clientAddress?: string | null },
  ): Promise<EngineResult<z.infer<S>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    let text: string;
    try {
      response = await fetch(new URL(path, this.origin), {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.key}`,
          ...(init?.body ? { "content-type": "application/json" } : {}),
          // The end user's address, for the gateway's per-client sign-in lockout and rate
          // limit. The gateway believes it only because this request carries our key.
          ...(init?.clientAddress ? { "X-Placedon-Client-Address": init.clientAddress } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
      // Fetch resolves at headers. Keep the same deadline until every body byte arrives;
      // a stalled stream must not hold a server action open forever.
      text = await response.text();
    } catch (cause) {
      const aborted = controller.signal.aborted || cause instanceof Error && cause.name === "AbortError";
      return engineFail({
        kind: aborted ? "timeout" : "transport_error",
        route,
        message: aborted
          ? `The gateway did not answer within ${TIMEOUT_MS / 1000}s.`
          : "The gateway response was interrupted before it could be read.",
      });
    } finally {
      clearTimeout(timer);
    }

    let body: unknown;
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
      // 409 is the vault's CONFLICT ("these bytes are already in this workspace's vault"):
      // read as a transport failure it showed "Upload interrupted, try again", and trying
      // again could never succeed.
      const refusal = refusalSchema.safeParse(body);
      if (refusal.success && [404, 409, 503].includes(response.status)) {
        // The route's own schema first: a typed refusal (draft.revise's CONFLICT carries
        // base_version and latest_version) must keep its fields. Parsed with the generic
        // refusal schema alone they were stripped, the conflict was no longer
        // recognisable, and the console showed a bare "Refused: CONFLICT".
        // Merged onto the refusal, so a route schema that happens to accept a refusal body
        // (all-optional fields) adds what it knows without dropping `detail` or `code`.
        const typed = schema.safeParse(body);
        return engineOk((typed.success ? { ...refusal.data, ...(typed.data as object) } : refusal.data) as z.infer<S>);
      }
      const detail =
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : undefined;
      if (response.status === 401) this.onUnauthorized?.();
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
        retryAfterSeconds: Math.min(60, Math.max(1, Number(response.headers.get("retry-after")) || 5)),
        message:
          response.status === 401
            ? this.onUnauthorized
              ? "Your session has ended. Sign in again."
              : "The gateway rejected this deployment's API key."
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

  authLogin(input: { email: string; password: string; clientAddress?: string | null }): Promise<EngineResult<AuthLogin>> {
    // Public, pre-session verb. The deployment-key header `call` adds is ignored by the
    // backend for this verb; the credential is the email+password in the POST body, sent
    // over the same https/loopback-enforced origin as every other call. The password is
    // never placed in the URL, and the returned token is never logged by this module.
    return this.call(GATEWAY_ROUTES.authLogin, GATEWAY_ROUTES.authLogin, authLoginSchema, {
      method: "POST",
      body: { email: input.email, password: input.password },
      clientAddress: input.clientAddress,
    });
  }

  /** Revoke the caller's own backend session (auth.logout). Only meaningful with a session. */
  authLogout(): Promise<EngineResult<AuthLogoutOk>> {
    return this.call(GATEWAY_ROUTES.authLogout, GATEWAY_ROUTES.authLogout, authLogoutOkSchema,
      { method: "POST", body: {} });
  }

  /** Public, pre-session: spend an invite token and set the new account's password. */
  invitesAccept(input: { token: string; password: string; clientAddress?: string | null }): Promise<EngineResult<InviteAccept>> {
    return this.call(GATEWAY_ROUTES.invitesAccept, GATEWAY_ROUTES.invitesAccept, inviteAcceptSchema, {
      method: "POST",
      body: { token: input.token, password: input.password },
      clientAddress: input.clientAddress,
    });
  }

  reviewContract(input: {
    text: string;
    name?: string;
  }): Promise<EngineResult<ReviewResponse | VerbRefusal>> {
    // No `test_data`: a request's own word no longer marks a document as a fixture
    // (PLAN_22 D3), so a client contract on an unaccepted region is REFUSED, with HTTP 200.
    return this.call(
      GATEWAY_ROUTES.reviewContract,
      GATEWAY_ROUTES.reviewContract,
      reviewResponseSchema.or(verbRefusalSchema),
      { method: "POST", body: { text: input.text, name: input.name ?? "contract" } },
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

  vaultList(input: import("./types").VaultListInput): Promise<EngineResult<import("./types").VaultList>> {
    return this.call(GATEWAY_ROUTES.vaultList, GATEWAY_ROUTES.vaultList, vaultListSchema, {
      method: "POST", body: { ...(input.matterId ? { matter_id: input.matterId } : {}), query: input.query ?? "",
        limit: String(input.limit ?? 30), offset: String(input.offset ?? 0) },
    });
  }

  vaultDocument(documentId: string): Promise<EngineResult<import("./types").VaultDocument>> {
    return this.call(GATEWAY_ROUTES.vaultStatus, GATEWAY_ROUTES.vaultStatus,
      vaultDocumentSchema, { method: "POST", body: { document_id: documentId } });
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
    requestId?: string;
    fileIds?: readonly string[];
    conversationId?: string;
    text: string;
    taskOverride?: string;
    sources?: readonly string[];
    matterId?: string;
  }): Promise<EngineResult<ConversationSend>> {
    return this.call(GATEWAY_ROUTES.conversationSend, GATEWAY_ROUTES.conversationSend,
      conversationSendSchema, {
        method: "POST",
        body: {
          text: input.text,
          ...(input.requestId ? { request_id: input.requestId } : {}),
          ...(input.fileIds?.length ? { file_ids: [...input.fileIds] } : {}),
          ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
          ...(input.taskOverride ? { task_override: input.taskOverride } : {}),
          ...(input.sources ? { sources: [...input.sources] } : {}),
          ...(input.matterId ? { matter_id: input.matterId } : {}),
        },
      });
  }

  sourcesList(): Promise<EngineResult<SourcesList>> {
    return this.call(GATEWAY_ROUTES.sourcesList, GATEWAY_ROUTES.sourcesList, sourcesListSchema,
      { method: "POST", body: {} });
  }

  sourcesSearch(input: { query: string }): Promise<EngineResult<SourcesSearch>> {
    return this.call(GATEWAY_ROUTES.sourcesSearch, GATEWAY_ROUTES.sourcesSearch,
      sourcesSearchSchema, { method: "POST", body: { query: input.query } });
  }

  researchWeb(input: {
    query: string;
    mode: "GENERAL_WEB" | "CASE_DISCOVERY";
    externalSearchConsent: boolean;
  }): Promise<EngineResult<WebResearch>> {
    return this.call(GATEWAY_ROUTES.researchWeb, GATEWAY_ROUTES.researchWeb,
      webResearchSchema, { method: "POST", body: {
        query: input.query,
        mode: input.mode,
        external_search_consent: input.externalSearchConsent,
      } });
  }

  mattersList(): Promise<EngineResult<MattersList>> {
    return this.call(GATEWAY_ROUTES.mattersList, GATEWAY_ROUTES.mattersList, mattersListSchema,
      { method: "POST", body: {} });
  }

  conversationList(matterId: string): Promise<EngineResult<import("./types").ConversationList>> {
    return this.call(GATEWAY_ROUTES.conversationList, GATEWAY_ROUTES.conversationList,
      conversationListSchema, { method: "POST", body: { matter_id: matterId, limit: "50" } });
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

  draftList(input: { cursor?: string; limit?: number } = {}): Promise<EngineResult<DraftList>> {
    return this.call(GATEWAY_ROUTES.draftList, GATEWAY_ROUTES.draftList,
      draftListSchema, {
        method: "POST",
        body: {
          ...(input.cursor ? { cursor: input.cursor } : {}),
          ...(input.limit !== undefined ? { limit: String(input.limit) } : {}),
        },
      });
  }

  draftRevise(input: {
    draftId: string;
    baseVersion: number;
    title?: string;
    body?: string;
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
