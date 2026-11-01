import "../engine/server-guard";
import type { EngineResult } from "../engine/errors";
import type {
  Calendar,
  CancelAck,
  Decision,
  DocumentResponse,
  DraftDiff,
  DraftExport,
  DraftList,
  DraftRevise,
  DraftStatus,
  DraftVersions,
  ReviewResponse,
  VerbRefusal,
  Run,
  RunTrace,
  TableCancel,
  TableCreate,
  TableExport,
  TableStatus,
  UploadResponse,
  VaultFind,
  VaultStatus,
  VaultUpload,
  VaultVerify,
  DocumentCheck,
  ConversationSend,
  ConversationGet,
  CitationGet,
  MattersList,
  SourcesList,
  AuthLogin,
  InviteAccept,
  AuthLogoutOk,
  SourcesSearch,
  WebResearch,
} from "./types";

/**
 * The gateway seen by the rest of the app — one method per `/v2` verb the backend
 * actually serves. Every method returns `EngineResult`; none throw, so a transport
 * failure has no path into a data renderer and can never be shown in the abstain
 * register.
 *
 * Server-only. `getGateway()` reads the origin and the API KEY from the environment at
 * call time; a client bundle that imported this trips `server-guard` and fails loudly
 * rather than shipping the key to a browser.
 */
export interface GatewayProvider {
  readonly name: "mock" | "http";
  /**
   * Personal sign-in. No API key or session is needed — this is the pre-session verb — so
   * it is reached through `loginGateway()`, never `getGateway()`. The token in the success
   * result is a credential: it goes straight into an httpOnly cookie and is never logged.
   */
  authLogin(input: { email: string; password: string; clientAddress?: string | null }): Promise<EngineResult<AuthLogin>>;
  /** Pre-session too: accept an invite. Reached only through `loginGateway()`. */
  invitesAccept(input: { token: string; password: string; clientAddress?: string | null }): Promise<EngineResult<InviteAccept>>;
  /** Revoke the signed-in person's own backend session (accounts mode sign-out). */
  authLogout(): Promise<EngineResult<AuthLogoutOk>>;
  reviewContract(input: {
    text: string;
    name?: string;
  }): Promise<EngineResult<ReviewResponse | VerbRefusal>>;
  run(runId: string): Promise<EngineResult<Run>>;
  trace(runId: string): Promise<EngineResult<RunTrace>>;
  upload(input: { text: string; name?: string }): Promise<EngineResult<UploadResponse>>;
  /**
   * SS-1/SS-2 checks over a filing. **No `testData` flag**, and the absence is the point:
   * this intent calls no model, so nothing leaves the process and there is no residency
   * question to tick a box about.
   *
   * There is no `docType` either. The backend classifies in code, because a caller who
   * could declare "this is minutes" could turn every minutes check back on over a notice.
   */
  reviewDocument(input: {
    text: string;
    name?: string;
    meetingKind?: "board" | "general";
    meetingDate?: string;
    entryDate?: string;
  }): Promise<EngineResult<DocumentResponse>>;
  /**
   * Record one human decision on one finding. The gateway refuses a reason under 10
   * characters and refuses an empty quote — so this method cannot be used to clear a
   * review without a person having read something and said why.
   */
  decide(input: {
    runId: string;
    itemRef: string;
    verdict: "APPROVED" | "REJECTED";
    reason: string;
    quotedSpan: string;
    /** The reviewer opened the quote; the gateway refuses an approval without it. */
    quoteViewed: boolean;
  }): Promise<EngineResult<Decision>>;
  /**
   * Ask a run to stop at its next step boundary. A REQUEST, not a kill: the work already
   * done stays in the trace, marked CANCELLED where it stopped. A run that has already
   * finished is refused — its trace is what happened.
   */
  cancel(runId: string): Promise<EngineResult<CancelAck>>;

  /* ── vault ──────────────────────────────────────────────────────────────── */
  /**
   * Put a document in the vault and queue it for ingestion. **PENDING is not INGESTED** --
   * nothing is searchable until a worker has read it, and the upload state is what the
   * file list shows per file rather than a tick.
   *
   * Refuses `NO_VAULT` when the deployment has no file store. That is a product state, so
   * it comes back as `EngineResult` success with a refusal body, not as a failure.
   */
  vaultUpload(input: {
    name: string;
    text: string;
    matterId?: string;
  }): Promise<EngineResult<VaultUpload>>;
  /** One document's state and tags, or the whole vault's counts. */
  vaultStatus(input?: { documentId?: string }): Promise<EngineResult<VaultStatus>>;
  vaultList(input: import("./types").VaultListInput): Promise<EngineResult<import("./types").VaultList>>;
  vaultDocument(documentId: string): Promise<EngineResult<import("./types").VaultDocument>>;
  vaultFind(input: { query: string; limit?: number }): Promise<EngineResult<VaultFind>>;
  /**
   * Do the stored bytes still hash to the key they were stored under? Returns the checks
   * individually; the screen renders one line each and never a single real/fake badge.
   */
  vaultVerify(input: { documentId: string }): Promise<EngineResult<VaultVerify>>;
  /** Read a FAILED document again. Refused for any other state, so it never runs twice. */
  vaultRetry(input: { documentId: string }): Promise<EngineResult<import("./types").VaultRetry>>;
  /** Remove a document from this workspace (`vault.delete`). A refusal is a product state. */
  vaultDelete(input: { documentId: string }): Promise<EngineResult<import("./types").VaultDelete>>;
  /** Share an unfiled document with the firm, or stop (`vault.share`). Recorded with a reason. */
  vaultShare(input: { documentId: string; reason: string; shared: boolean }): Promise<EngineResult<import("./types").VaultShare>>;
  /** Read an MCA master-data page's text (`company_facts.extract`). Stores nothing. */
  companyFactsExtract(input: { text: string; uploadedOn: string }): Promise<EngineResult<import("./types").CompanyFactsExtract>>;
  /** The firm's company profile (`company_profile.get`). A 404 means a backend without it. */
  companyProfileGet(): Promise<EngineResult<import("./types").CompanyProfile>>;
  /** Replace the firm's company profile (`company_profile.set`). Confirmed facts only, with a reason. */
  companyProfileSet(input: { facts: readonly import("./types").CompanyProfileInput[]; reason: string }): Promise<EngineResult<import("./types").CompanyProfileSet>>;
  /**
   * The Document Check, end to end: verify a stored document, decide whether it is
   * still in force at `as_of`, and record the action a lawyer should take. A WRITE
   * verb — it appends a row to `document_checks` — so `recorded` with a `check_id`
   * means the judgement was written down, append-only. `superseded_by` and
   * `revoked_on` are facts the caller SUPPLIES; the backend never guesses them.
   */
  documentCheck(input: {
    documentId: string;
    asOf?: string;
    renewable?: boolean;
    supersededBy?: string;
    revokedOn?: string;
  }): Promise<EngineResult<DocumentCheck>>;

  /* ── review tables ──────────────────────────────────────────────────────── */
  /**
   * Documents down the side, questions across the top, one job per cell. The response's
   * `estimated_cost_inr` is **null** before any cell runs and must render UNPRICED, and
   * `scheduled.paused_budget` is the only place PAUSED_BUDGET appears -- `tableStatus`
   * does not carry it (measured live, 2026-10-04).
   */
  tableCreate(input: {
    name: string;
    documentIds: readonly string[];
    columns: readonly { name: string; kind: string; question: string }[];
  }): Promise<EngineResult<TableCreate>>;
  tableStatus(input: { gridId: string }): Promise<EngineResult<TableStatus>>;
  /** The table as CSV. Every cell carries words rather than a blank. */
  tableExport(input: { gridId: string }): Promise<EngineResult<TableExport>>;
  /** Stop scheduling. Answered cells are kept; unrun cells stay PENDING, not failed. */
  tableCancel(input: { gridId: string }): Promise<EngineResult<TableCancel>>;
  /** The firm's tables this person may open, newest first. 404 on a gateway without the verb. */
  tableList(input?: { cursor?: string; limit?: number }): Promise<EngineResult<import("./types").TableList>>;

  /* ── drafts ─────────────────────────────────────────────────────────────── */
  draftCreate(input: {
    title: string;
    body?: string;
    kind?: string;
  }): Promise<EngineResult<DraftStatus>>;
  draftList(input?: { cursor?: string; limit?: number }): Promise<EngineResult<DraftList>>;
  /**
   * Save a NEW version; never edits one. `baseVersion` is REQUIRED by the backend -- it is
   * the version this revision was based on, and if it is not the latest the save is refused
   * with a CONFLICT naming both versions rather than overwriting a colleague's work.
   */
  draftRevise(input: {
    draftId: string;
    baseVersion: number;
    title?: string;
    body?: string;
  }): Promise<EngineResult<DraftRevise>>;
  draftVersions(input: { draftId: string }): Promise<EngineResult<DraftVersions>>;
  draftDiff(input: {
    draftId: string;
    fromVersion?: number;
    toVersion?: number;
  }): Promise<EngineResult<DraftDiff>>;
  draftExport(input: {
    draftId: string;
    version?: number;
    format?: "text" | "docx";
  }): Promise<EngineResult<DraftExport>>;

  /* ── conversation (C2) ─────────────────────────────────────────────────── */
  /**
   * One turn of a thread. Intake classifies it and dispatches it to the verb that answers
   * it; the reply is an `answer_envelope.v1`, or `envelope: null` and a run_id when the work
   * was queued. A WRITE verb: it stores both messages.
   */
  conversationSend(input: {
    conversationId?: string;
    text: string;
    /** Name the task instead of letting intake classify it, e.g. `DRAFT`. */
    taskOverride?: string;
    requestId?: string;
    fileIds?: readonly string[];
    /** Provider ids from sources.list picker (held, vault, …). */
    sources?: readonly string[];
    /** File the thread to a matter. */
    matterId?: string;
    /** A past date (YYYY-MM-DD) to read the law as at. Omitted for today's law. */
    asOf?: string;
  }): Promise<EngineResult<ConversationSend>>;
  /** What a question may be searched against, generated by the gateway from its register. */
  sourcesList(): Promise<EngineResult<SourcesList>>;
  /**
   * Search sources by party or case name. `judgments` are case-law DISCOVERY candidates —
   * tier LICENSED, supporting authority, **never a verified statutory answer and never an
   * obligation**. Discovery carries no quote; the verbatim passage is read only when a
   * judgment is opened.
   */
  sourcesSearch(input: { query: string }): Promise<EngineResult<SourcesSearch>>;
  /** Explicitly consented, query-only public web answer; never includes Vault context. */
  researchWeb(input: {
    query: string;
    mode: "GENERAL_WEB" | "CASE_DISCOVERY";
    externalSearchConsent: boolean;
  }): Promise<EngineResult<WebResearch>>;
  mattersList(): Promise<EngineResult<MattersList>>;

  /* ── team ───────────────────────────────────────────────────────────────── */
  /** The caller's own account id, email and role. Read to hide what the role cannot do;
   *  the gateway still refuses (HTTP 403) whatever is not hidden. */
  authMe(): Promise<EngineResult<import("./types").AuthMe>>;
  matterCreate(input: { name: string; clientRef?: string }): Promise<EngineResult<import("./types").MatterCreate>>;
  matterMembers(matterId: string): Promise<EngineResult<import("./types").MatterMembers>>;
  /** Every access change carries a reason of at least 10 characters, recorded with it. */
  matterGrant(input: { matterId: string; actorId: string; role: "owner" | "member" | "viewer"; reason: string }): Promise<EngineResult<import("./types").MatterGrant>>;
  matterRevoke(input: { matterId: string; actorId: string; reason: string }): Promise<EngineResult<import("./types").MatterRevoke>>;
  /** The token in the answer is shown once and never stored; do not log it. */
  inviteCreate(input: { email: string; role: import("./types").AccountRole }): Promise<EngineResult<import("./types").InviteCreate>>;
  usageStatus(): Promise<EngineResult<import("./types").UsageStatus>>;
  conversationList(matterId: string): Promise<EngineResult<import("./types").ConversationList>>;
  conversationGet(conversationId: string): Promise<EngineResult<ConversationGet>>;
  /** One citation for the source panel, its quote re-read from the corpus at call time. */
  citationGet(input: {
    citationId: string;
    conversationId: string;
  }): Promise<EngineResult<CitationGet>>;

  /* ── calendar ───────────────────────────────────────────────────────────── */
  /**
   * What falls due in the next 90 days, and what cannot be dated at all. An entry whose
   * fact is missing arrives with `due: null` and the fact named -- the screen shows
   * "unknown", never a guessed date.
   */
  calendarUpcoming(input: {
    company: Record<string, unknown>;
    anchors?: Record<string, string>;
    intervals?: Record<string, string>;
    asOf?: string;
    horizonDays?: number;
  }): Promise<EngineResult<Calendar>>;
}

/** Resolve an authenticated live gateway or an explicitly isolated fixture demo. */
export async function getGateway(): Promise<GatewayProvider> {
  const { requireSession } = await import("../auth/session");
  await requireSession();
  const { gatewayConfiguration, gatewayCredential, sessionKind } = await import("../auth/config");
  const config = gatewayConfiguration();
  if (config.mode === "demo") {
    const { MockGateway } = await import("./mock");
    return new MockGateway();
  }
  const { accountSessionToken } = await import("../auth/session");
  const credential = gatewayCredential(process.env, await accountSessionToken());
  if (!credential) {
    const { redirect } = await import("next/navigation");
    return redirect("/login");
  }
  const { HttpGateway } = await import("./http");
  // A person's session that the backend rejects has ended; /session-ended clears the
  // cookie (only a route handler may) and returns them to sign-in, instead of leaving a
  // console that fails every call.
  // redirect() throws, synchronously, out of the gateway call -- Next.js handles it.
  const { redirect } = await import("next/navigation");
  return new HttpGateway(config.origin, credential,
    sessionKind() === "account" ? { onUnauthorized: () => redirect("/session-ended") } : undefined);
}

/** Only the two verbs reached before a session exists: sign-in and invite acceptance. */
export type LoginGateway = Pick<GatewayProvider, "authLogin" | "invitesAccept">;

/**
 * A gateway for the pre-session sign-in verb ONLY.
 *
 * Unlike `getGateway()` this does NOT call `requireSession()` — a person signing in has no
 * session yet, so requiring one would make sign-in impossible. It is still server-only
 * (this module imports the server guard) and still fails closed when the gateway is not
 * configured. The returned type exposes `authLogin` and nothing else, so it cannot become
 * a back door to the authenticated verbs.
 */
export async function loginGateway(): Promise<LoginGateway> {
  const { gatewayConfiguration } = await import("../auth/config");
  const config = gatewayConfiguration();
  if (config.mode === "demo") {
    const { MockGateway } = await import("./mock");
    return new MockGateway();
  }
  const { HttpGateway } = await import("./http");
  return new HttpGateway(config.origin, config.key);
}
