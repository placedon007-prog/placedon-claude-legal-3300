import { z } from "zod";

/**
 * Wire contract for the Placedon gateway `/v2` verbs, read from
 * `gateway/verbs.py` in the backend (read-only to this repo).
 *
 * Every schema is `.passthrough()`-free on purpose: an unexpected field is a contract
 * change, and a silent accept is how a UI starts rendering something nobody designed.
 * Fields the backend may omit are `.optional()` because they genuinely are.
 */

/* ── ask ──────────────────────────────────────────────────────────────────── */

/** Verdicts the pipeline produces. FAILED is a transport failure the BACKEND caught. */
export const askStatusSchema = z.enum([
  "ANSWERED",
  "PARTIAL",
  "REFUSED",
  "FAILED",
]);
export type AskStatus = z.infer<typeof askStatusSchema>;

export const askResponseSchema = z.object({
  status: askStatusSchema,
  question: z.string().optional(),
  /** Present only on REFUSED. `NO_EVIDENCE`, `NOTHING_TRACED`, `NO_MODEL`, `NO_BUDGET`. */
  code: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  provisions: z.array(z.string()).optional(),
  dropped: z.number().int().nonnegative().optional(),
  model: z.string().nullable().optional(),
  degraded: z.boolean().optional(),
  /** The served prose, with citations. Empty on a refusal. */
  answer: z.string().optional(),
  run_id: z.string().nullable().optional(),
  error: z.string().optional(),
});
export type AskResponse = z.infer<typeof askResponseSchema>;

/* ── review_contract ──────────────────────────────────────────────────────── */

export const findingStatusSchema = z.enum([
  "MATCHES",
  "DEVIATES",
  "MISSING",
  "NEEDS_LAWYER",
]);
export type FindingStatus = z.infer<typeof findingStatusSchema>;

export const findingSchema = z.object({
  rule_id: z.string(),
  clause: z.string(),
  status: findingStatusSchema,
  /** Always `POTENTIAL_ISSUE`. The backend has exactly one kind, deliberately. */
  kind: z.string(),
  /**
   * The company position, in one sentence, and why it is taken. Both are DRAFT — the
   * `playbook_status` on the response is what marks them, and there is deliberately no
   * second status for them to fall out of step with.
   *
   * Optional because a response from an older gateway does not carry them. When they are
   * absent the cell says so rather than rendering blank: an empty standard beside a
   * DEVIATES reads as "nothing to deviate from", which is not what happened.
   */
  standard_text: z.string().optional(),
  rationale: z.string().optional(),
  /**
   * The engineering note on the rule's shape. The gateway no longer sends it — NDA-02's
   * is a changelog about a false-alarm rate — and it is kept optional only so an older
   * response still parses.
   */
  why: z.string().optional(),
  /** What was compared against what. */
  detail: z.string(),
});
export type Finding = z.infer<typeof findingSchema>;

export const reviewResponseSchema = z.object({
  playbook_status: z.string(),
  requires_review: z.boolean(),
  model: z.string().nullable().optional(),
  clauses_in_contract: z.number().int().nonnegative().optional(),
  findings: z.array(findingSchema),
  unverified: z.array(z.object({ clause: z.string(), why: z.string() })),
  law_not_held: z.array(z.object({ body: z.string(), refusal: z.string() })),
  run_id: z.string().nullable().optional(),
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;


/* ── review_document ──────────────────────────────────────────────────────── */

/**
 * SS-1/SS-2 statuses. `N/A` is not a pass: it means the check does not apply to this
 * document type, which is the whole reason minutes checks stopped firing on notices.
 * `NEEDS_BOOK` is this intent's NEEDS_LAWYER — code looked and cannot decide, because the
 * fact lives in the physical minutes book.
 */
export const documentStatusSchema = z.enum(["PASS", "DEFECT", "NEEDS_BOOK", "N/A"]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const documentFindingSchema = z.object({
  rule_id: z.string(),
  status: documentStatusSchema,
  /** The Secretarial Standard the rule comes from. */
  source: z.string(),
  defect: z.string(),
  /** Verbatim from the document, or the reason it is absent. Never empty. */
  quoted_span: z.string(),
  /** A real ROC adjudication order that penalised this. */
  precedent: z.string(),
  applies: z.boolean(),
  advisory_only: z.boolean(),
  /** True for NEEDS_BOOK: a person must resolve it. */
  needs_human: z.boolean(),
});
export type DocumentFinding = z.infer<typeof documentFindingSchema>;

export const documentResponseSchema = z.object({
  doc_type: z.string(),
  /** `ANSWERED`, or `UNCLASSIFIED` when the type could not be determined. */
  status: z.string(),
  code: z.string().nullable().optional(),
  note: z.string(),
  meeting_kind: z.string().optional(),
  requires_review: z.boolean(),
  checks_run: z.number().int().nonnegative(),
  defect_count: z.number().int().nonnegative(),
  needs_human_count: z.number().int().nonnegative(),
  findings: z.array(documentFindingSchema),
  run_id: z.string().nullable().optional(),
});
export type DocumentResponse = z.infer<typeof documentResponseSchema>;

/* ── the human gate ───────────────────────────────────────────────────────── */

/**
 * The shortest reason the gateway will accept, and a `CHECK` in migration 005 besides.
 *
 * It lives here, in the wire contract, rather than in `actions.ts`: a `"use server"` module
 * may only export async functions, so a constant exported from one cannot be imported by a
 * Client Component. `tsc` does not enforce that rule — only the build does, which is how
 * this was found.
 */
export const MIN_REASON_CHARS = 10;

export const decisionSchema = z.object({
  status: z.string(),
  decision_id: z.string(),
  run_id: z.string(),
  item_ref: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string(),
  quoted_span: z.string(),
  actor_id: z.string(),
  decided_at: z.string(),
});
export type Decision = z.infer<typeof decisionSchema>;

export const cancelSchema = z.object({
  status: z.string(),
  run_id: z.string(),
  note: z.string().optional(),
});
export type CancelAck = z.infer<typeof cancelSchema>;

/**
 * A run still moving. `PLANNED` means a worker has not picked it up; `RUNNING` means one
 * has. Everything else is terminal and the screen stops polling.
 */
export const LIVE_RUN_STATUSES = ["PLANNED", "RUNNING", "AWAITING_HUMAN"] as const;
export function isLive(status: string): boolean {
  return (LIVE_RUN_STATUSES as readonly string[]).includes(status);
}

/* ── runs ─────────────────────────────────────────────────────────────────── */

export const runStepSchema = z.object({
  capability: z.string(),
  engine_capability: z.string().nullable(),
  status: z.string(),
  model: z.string().nullable(),
  degraded: z.boolean().nullable(),
  provider: z.string().nullable(),
  /** Where the model ran. `UAE North` today — PLAN_22 D3. */
  region: z.string().nullable(),
  /**
   * Rupees, or null. **Null is UNPRICED and must never be rendered as 0.** The backend
   * refuses to record 0.0 for a billed provider at all — in Python and again as a database
   * CHECK — so a zero here would mean a free provider, not a free call.
   */
  cost_inr: z.number().nullable(),
  /** Why the cost is null. Always present when `cost_inr` is null. */
  cost_note: z.string().nullable(),
});
export type RunStep = z.infer<typeof runStepSchema>;

export const runTraceSchema = z.object({
  run_id: z.string().nullable(),
  steps: z.array(runStepSchema),
});
export type RunTrace = z.infer<typeof runTraceSchema>;

export const runSchema = z.object({
  id: z.string(),
  intent: z.string(),
  status: z.string(),
  refusal_code: z.string().nullable().optional(),
  propositions: z
    .array(
      z.object({
        status: z.string(),
        source_ref: z.string().nullable(),
        span_start: z.number().nullable(),
        span_end: z.number().nullable(),
      }),
    )
    .optional(),
});
export type Run = z.infer<typeof runSchema>;

export const refusalSchema = z.object({
  status: z.literal("REFUSED"),
  code: z.string(),
  detail: z.string(),
  run_id: z.string().nullable().optional(),
});

/* ── documents.upload ─────────────────────────────────────────────────────── */

export const uploadResponseSchema = z.object({
  document_id: z.string(),
  sha256: z.string(),
  bytes: z.number().int().nonnegative(),
  stored: z.string(),
  note: z.string().optional(),
});
export type UploadResponse = z.infer<typeof uploadResponseSchema>;

/* ── the served answer, parsed ────────────────────────────────────────────── */

export interface CitedSentence {
  readonly n: number;
  readonly text: string;
  /** e.g. `Companies Act 2013, s.96` — rendered verbatim, never paraphrased. */
  readonly source: string;
  /** e.g. `96`, extracted from the source. Null when the shape is unfamiliar. */
  readonly section: string | null;
  /** Char offsets into the provision, as the backend computed them. */
  readonly span: readonly [number, number] | null;
}

export interface ParsedAnswer {
  /** The leading "[1 of 4 sentence(s) … did not trace …]" line, when present. */
  readonly notice: string | null;
  readonly sentences: readonly CitedSentence[];
  /**
   * The prose exactly as the backend served it. Rendered VERBATIM whenever
   * `sentences` is empty — a parse that fails must degrade to the real text, never to a
   * reconstruction. This app does not author legal sentences.
   */
  readonly raw: string;
}

const SENTENCE = /^\s*(\d+)\.\s+([\s\S]*?)\n\s*—\s*([^\n[]+?)(?:\s*\[(\d+):(\d+)\])?\s*$/;

/**
 * Split the served prose into its cited sentences.
 *
 * The backend returns `Summary.prose()`, not structured sentences, and this repo may not
 * change the backend. The format is stable and machine-written — `1. <text>` followed by
 * `— <source> [start:end]` — so it is parsed rather than displayed as a wall of text.
 *
 * **On any doubt it returns no sentences and the caller shows `raw`.** A partially parsed
 * citation is worse than an unparsed one: this app must never show a section number it
 * inferred.
 */
export function parseAnswer(prose: string): ParsedAnswer {
  const raw = prose ?? "";
  if (!raw.trim()) return { notice: null, sentences: [], raw };

  const noticeMatch = raw.match(/^\s*\[([^\]]+)\]\s*/);
  const notice = noticeMatch ? noticeMatch[1].trim() : null;
  const body = noticeMatch ? raw.slice(noticeMatch[0].length) : raw;

  // Blocks start at a line beginning "<n>. ". Split on that boundary only.
  const blocks = body.split(/\n(?=\s*\d+\.\s)/).filter((b) => b.trim());
  const sentences: CitedSentence[] = [];
  for (const block of blocks) {
    const m = block.match(SENTENCE);
    if (!m) return { notice, sentences: [], raw };
    const [, n, text, source, start, end] = m;
    const section = source.match(/\bs\.\s*([0-9]+[A-Z]*(?:\([^)]*\))?)/i)?.[1] ?? null;
    sentences.push({
      n: Number(n),
      text: text.trim().replace(/\s+/g, " "),
      source: source.trim(),
      section,
      span: start && end ? [Number(start), Number(end)] : null,
    });
  }
  return { notice, sentences, raw };
}

/* ── vault ────────────────────────────────────────────────────────────────── */

/**
 * Every shape below was read from a LIVE gateway on 2026-10-04, not from the verb table's
 * input list — an input signature says what to send, not what comes back. Where the live
 * system differed from what a fixture would have guessed, `docs/app-screens/README.md`
 * records it.
 */

/** A verb that decided not to act. `status: "REFUSED"` arrives with HTTP 200. */
export const verbRefusalSchema = z.object({
  status: z.literal("REFUSED"),
  code: z.string(),
  detail: z.string(),
});
export type VerbRefusal = z.infer<typeof verbRefusalSchema>;

export const vaultUploadOkSchema = z.object({
  document_id: z.string(),
  sha256: z.string(),
  name: z.string(),
  state: z.string(),
  queued: z.boolean().optional(),
  note: z.string().optional(),
});
/** Live: refuses `NO_VAULT` whenever no file store is wired. Both arms are product states. */
export const vaultUploadSchema = z.union([vaultUploadOkSchema, verbRefusalSchema]);
export type VaultUpload = z.infer<typeof vaultUploadSchema>;

export const vaultStatusSchema = z.object({
  documents: z.number().int().nonnegative(),
  by_state: z.record(z.string(), z.number().int().nonnegative()),
  deleted: z.number().int().nonnegative(),
  /** Documents a search cannot reach: PENDING or CANNOT_READ. Not "no match". */
  unsearchable: z.number().int().nonnegative(),
  note: z.string(),
  document_id: z.string().optional(),
  name: z.string().optional(),
  state: z.string().optional(),
  doc_class: z.string().optional(),
  tags: z.array(z.unknown()).optional(),
});
export type VaultStatus = z.infer<typeof vaultStatusSchema>;

export const vaultHitSchema = z.object({
  document_id: z.string(),
  name: z.string().optional(),
  score: z.number().optional(),
  quote: z.string().optional(),
  matter_id: z.string().nullable().optional(),
});

export const vaultFindSchema = z.object({
  hits: z.array(vaultHitSchema),
  searched_documents: z.number().int().nonnegative(),
  searched_chunks: z.number().int().nonnegative(),
  unsearchable: z.number().int().nonnegative(),
  note: z.string(),
  scope: z.string(),
  scope_note: z.string(),
});
export type VaultFind = z.infer<typeof vaultFindSchema>;

/**
 * One line per CHECK, never a single real/fake badge. The vault's integrity question has
 * more than one answer — the bytes may be gone, or present and hashing to something else —
 * and collapsing them into a badge throws away which.
 */
export const vaultVerifyOkSchema = z.object({
  document_id: z.string(),
  checks: z.array(
    z.object({
      name: z.string(),
      result: z.string(),
      detail: z.string().optional(),
    }),
  ).optional(),
  matches: z.boolean().optional(),
  stored_sha256: z.string().optional(),
  computed_sha256: z.string().optional(),
  note: z.string().optional(),
});
export const vaultVerifySchema = z.union([vaultVerifyOkSchema, verbRefusalSchema]);
export type VaultVerify = z.infer<typeof vaultVerifySchema>;

/* ── document.check (T3: verify → validity → action, recorded) ─────────────── */

/**
 * One verification check on its own line — signature, byte coverage, chain, revocation —
 * never a single genuine/forged badge. The two checks that need a trust list or a network
 * lookup come back NOT_CHECKED, which is why a real document reports INCOMPLETE_VERIFICATION
 * rather than COMPLETE today.
 */
export const docCheckLineSchema = z.object({
  name: z.string(),
  field: z.string().optional(),
  result: z.string(),
  detail: z.string().optional(),
});

/**
 * `document.check` answers three separate questions and keeps them separate: was it signed
 * (verification), is it still in force at `as_of` (validity), and what should be done
 * (action). `NOT_DETERMINED` validity and a `NEEDS_LAWYER` action are the common, honest
 * answers — the screen must never dress them as a clean bill. The row is append-only, so
 * `recorded` with a `check_id` means "what we told them on this date" was written down.
 */
export const documentCheckOkSchema = z.object({
  document_id: z.string(),
  name: z.string().nullable().optional(),
  as_of: z.string(),
  verification: z.object({
    overall: z.string(),
    checks: z.array(docCheckLineSchema),
    sentence: z.string(),
  }),
  validity: z.object({
    status: z.string(),
    as_of: z.string(),
    document_date: z.string().nullable().optional(),
    expires_on: z.string().nullable().optional(),
    in_force: z.boolean(),
    reason: z.string(),
    body: z.string().nullable().optional(),
    law_held: z.boolean().nullable().optional(),
    citation: z.string().optional(),
    working: z.string().optional(),
  }),
  action: z.object({
    action: z.string(),
    reason: z.string(),
    renew_by: z.string().nullable().optional(),
  }),
  check_id: z.string().nullable().optional(),
  recorded: z.boolean(),
  note: z.string().optional(),
});

/** Live: refuses NOT_FOUND / GONE / NO_VAULT / BAD_REQUEST. Each arm is a product state. */
export const documentCheckSchema = z.union([documentCheckOkSchema, verbRefusalSchema]);
export type DocumentCheck = z.infer<typeof documentCheckSchema>;
export type DocumentCheckOk = z.infer<typeof documentCheckOkSchema>;
export type DocCheckLine = z.infer<typeof docCheckLineSchema>;

/* ── review_table ─────────────────────────────────────────────────────────── */

/**
 * Cell states, live. PENDING and FAILED are **not findings** — the backend's own note says
 * so, and `findings` counts only the three that describe a document.
 */
export const cellStateSchema = z.enum([
  "FOUND",
  "NOT_FOUND",
  "NEEDS_LAWYER",
  "PENDING",
  "FAILED",
]);
export type CellState = z.infer<typeof cellStateSchema>;

export const scheduledSchema = z.object({
  grid_id: z.string(),
  enqueued: z.array(z.string()),
  already_done: z.array(z.string()),
  already_queued: z.array(z.string()),
  cancelled: z.boolean(),
  /** A1: the budget refused a cell's reservation, so scheduling stopped. A STATE. */
  paused_budget: z.boolean().optional(),
  pause_reason: z.string().optional(),
  not_scheduled: z.array(z.string()).optional(),
  reservations: z.array(z.string()).optional(),
});
export type Scheduled = z.infer<typeof scheduledSchema>;

export const tableCreateSchema = z.object({
  grid_id: z.string(),
  name: z.string(),
  cells: z.number().int(),
  documents: z.number().int(),
  columns: z.number().int(),
  scheduled: scheduledSchema,
  cap: z.number().int(),
  /** Live: null before any cell has run. UNPRICED, never 0. */
  estimated_cost_inr: z.number().nullable(),
  cost_note: z.string(),
  note: z.string().optional(),
});
export type TableCreate = z.infer<typeof tableCreateSchema>;

export const tableSpendSchema = z.object({
  total_inr: z.number().nullable(),
  priced_cells: z.number().int(),
  unpriced_cells: z.number().int(),
  pending_cells: z.number().int(),
  is_lower_bound: z.boolean(),
  note: z.string(),
});

export const tableCellSchema = z.object({
  document_id: z.string(),
  column: z.string(),
  state: cellStateSchema,
  value: z.string(),
  quote: z.string(),
  reason: z.string(),
});
export type TableCell = z.infer<typeof tableCellSchema>;

export const tableStatusSchema = z.object({
  grid_id: z.string(),
  name: z.string(),
  documents: z.number().int(),
  columns: z.number().int(),
  cells: z.number().int(),
  findings: z.number().int(),
  by_state: z.record(z.string(), z.number().int()),
  cells_detail: z.array(tableCellSchema),
  complete: z.boolean(),
  cancelled: z.boolean(),
  note: z.string(),
  spend: tableSpendSchema,
});
export type TableStatus = z.infer<typeof tableStatusSchema>;

export const tableExportSchema = z.object({
  grid_id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  csv: z.string(),
  complete: z.boolean(),
  cancelled: z.boolean(),
  findings: z.number().int(),
  cells: z.number().int(),
  note: z.string(),
});
export type TableExport = z.infer<typeof tableExportSchema>;

export const tableCancelSchema = z.object({
  grid_id: z.string(),
  cancelled: z.boolean(),
  findings_kept: z.number().int(),
  pending_stopped: z.number().int(),
  cells: z.number().int(),
  note: z.string(),
});
export type TableCancel = z.infer<typeof tableCancelSchema>;

/* ── draft ────────────────────────────────────────────────────────────────── */

/**
 * A slot's provenance. `MODEL_SUGGESTION` is why the drafts screen marks model prose as a
 * suggestion: it is the backend's own word for text a person has not accepted, and it
 * blocks approval until one does.
 */
export const slotOriginSchema = z.enum([
  "VERIFIED",
  "SUPPLIED",
  "MODEL_SUGGESTION",
  "UNKNOWN",
]);
export type SlotOrigin = z.infer<typeof slotOriginSchema>;

export const draftSlotSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
  origin: z.string().optional(),
  note: z.string().optional(),
});
export type DraftSlot = z.infer<typeof draftSlotSchema>;

export const draftStatusSchema = z.object({
  draft_id: z.string(),
  title: z.string(),
  kind: z.string().nullable().optional(),
  versions: z.number().int(),
  version: z.number().int(),
  ready_for_approval: z.boolean(),
  requires_review: z.boolean(),
  /** Slot names that block approval. Each one needs a person. */
  blocking: z.array(z.string()),
  approved: z.boolean(),
  approved_by: z.string().nullable(),
  note: z.string().optional(),
});
export type DraftStatus = z.infer<typeof draftStatusSchema>;

/**
 * A1's optimistic lock, as it arrives: HTTP **200** with `status: "REFUSED"`, carrying BOTH
 * versions. It is a product state, not a transport failure, and the screen shows both
 * numbers because "someone else saved first" without saying what to re-read is not
 * actionable.
 */
export const draftConflictSchema = z.object({
  status: z.literal("REFUSED"),
  code: z.literal("CONFLICT"),
  detail: z.string(),
  draft_id: z.string(),
  base_version: z.number().int(),
  latest_version: z.number().int(),
});
export type DraftConflict = z.infer<typeof draftConflictSchema>;

/** Any other refusal from revise — a blocked approval, a bad request. */
export const draftReviseSchema = z.union([
  draftConflictSchema,
  draftStatusSchema,
  verbRefusalSchema,
]);
export type DraftRevise = z.infer<typeof draftReviseSchema>;

export const draftVersionSchema = z.object({
  draft_id: z.string(),
  version: z.number().int(),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
  slots: z.array(draftSlotSchema),
  citations: z.array(z.unknown()),
  ready: z.boolean(),
  approved: z.boolean(),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  blocking: z.array(z.string()),
});
export type DraftVersion = z.infer<typeof draftVersionSchema>;

export const draftVersionsSchema = z.object({
  draft_id: z.string(),
  title: z.string(),
  versions: z.array(draftVersionSchema),
});
export type DraftVersions = z.infer<typeof draftVersionsSchema>;

export const draftDiffSchema = z.object({
  draft_id: z.string(),
  from_version: z.number().int(),
  to_version: z.number().int(),
  /** Unified diff, line by line. */
  text: z.array(z.string()),
  text_changed: z.boolean(),
  slots: z.object({
    added: z.array(z.unknown()),
    removed: z.array(z.unknown()),
    retyped: z.array(z.unknown()),
    revalued: z.array(z.unknown()),
  }),
  /** The change a text diff cannot show: identical words, support gone. */
  newly_blocking: z.array(z.unknown()),
  newly_supported: z.array(z.unknown()),
  ready_changed: z.boolean(),
  note: z.string().optional(),
});
export type DraftDiff = z.infer<typeof draftDiffSchema>;

export const draftExportSchema = z.object({
  draft_id: z.string(),
  version: z.number().int(),
  format: z.string(),
  filename: z.string(),
  ready_for_approval: z.boolean(),
  approved: z.boolean(),
  note: z.string().optional(),
  text: z.string().optional(),
  /** base64, for .docx. */
  content_base64: z.string().optional(),
});
export type DraftExport = z.infer<typeof draftExportSchema>;

/* ── calendar ─────────────────────────────────────────────────────────────── */

export const dueEntrySchema = z.object({
  obligation_id: z.string(),
  duty: z.string(),
  provision: z.string(),
  state: z.string(),
  due: z.string().nullable(),
  reason: z.string().optional(),
  anchor: z.string().nullable().optional(),
  anchor_label: z.string().optional(),
  interval: z.string().optional(),
  days_away: z.number().int().nullable().optional(),
});
export type DueEntry = z.infer<typeof dueEntrySchema>;

/**
 * An UNKNOWN entry names the fact it is missing and carries `due: null`. The screen renders
 * "unknown" and the missing fact — never a date. A guessed deadline is the one output this
 * product must not produce, and `missing` is what makes the absence legible instead of blank.
 */
export const unknownEntrySchema = dueEntrySchema.extend({
  due: z.null(),
  missing: z.array(z.string()),
});
export type UnknownEntry = z.infer<typeof unknownEntrySchema>;

export const calendarSchema = z.object({
  as_of: z.string(),
  horizon_days: z.number().int(),
  due: z.array(dueEntrySchema),
  unknown: z.array(unknownEntrySchema),
  note: z.string().optional(),
});
export type Calendar = z.infer<typeof calendarSchema>;

/** True when a verb answered with a refusal rather than a result. */
export function isRefusal(value: unknown): value is VerbRefusal {
  return verbRefusalSchema.safeParse(value).success;
}

/** True when revise lost an optimistic-lock race. Narrower than `isRefusal`. */
export function isConflict(value: unknown): value is DraftConflict {
  return draftConflictSchema.safeParse(value).success;
}

/* ── conversation (C2) ────────────────────────────────────────────────────── */

/**
 * `answer_envelope.v1`, read from the backend's `gateway/schemas/answer_envelope.v1.json`
 * and checked against live replies recorded on 2026-10-07 (`fixtures/conversation.json`).
 *
 * FAILED is transport-only by the schema's own definition, so the screen renders it in the
 * "did not arrive" register and never as a refusal.
 */
export const envelopeStatusSchema = z.enum([
  "ANSWERED",
  "PARTIAL",
  "NEEDS_LAWYER",
  "ABSTAINED",
  "NEEDS_CLARIFICATION",
  "FAILED",
]);
export type EnvelopeStatus = z.infer<typeof envelopeStatusSchema>;

export const envelopeCitationSchema = z.object({
  id: z.string().min(1),
  instrument: z.string().min(1),
  /** e.g. `s.96`. The only place a section number may come from. */
  provision: z.string().min(1),
  /** NULL means NOT RECORDED. The backend does not hold commencement dates per section. */
  in_force_from: z.string().nullable().optional(),
  source: z.string().min(1),
  fetched_at: z.string().min(1),
  sha256: z.string(),
  /** The verbatim span, byte-matched against the corpus before it was served. */
  quote: z.string().min(1),
});
export type EnvelopeCitation = z.infer<typeof envelopeCitationSchema>;

export const envelopeBodySchema = z.object({
  body_id: z.string(),
  name: z.string(),
  status: z.enum(["ANSWERED", "NOT_HELD", "CURRENT_ONLY", "NEED_FACT", "NOT_ENGAGED"]),
  note: z.string(),
});
export type EnvelopeBody = z.infer<typeof envelopeBodySchema>;

export const envelopeSchema = z.object({
  schema: z.literal("answer_envelope.v1"),
  status: envelopeStatusSchema,
  task: z.string(),
  as_of: z.string(),
  text_blocks: z.array(z.object({ text: z.string(), citation_ids: z.array(z.string()) })),
  bodies: z.array(envelopeBodySchema),
  citations: z.array(envelopeCitationSchema),
  files: z.array(
    z.object({
      file_id: z.string(),
      name: z.string(),
      state: z.enum(["READING", "READ", "CANNOT_READ"]),
      pages: z.number().int().nullable().optional(),
      reason: z.string().nullable().optional(),
    }),
  ),
  run_id: z.string().nullable().optional(),
  trace_url: z.string().nullable().optional(),
});
export type Envelope = z.infer<typeof envelopeSchema>;

/**
 * One turn. `envelope: null` with a `run_id` means the work was QUEUED and the reply has
 * not arrived — which is not an empty answer.
 */
export const conversationSendOkSchema = z.object({
  conversation_id: z.string(),
  message_id: z.string(),
  classification: z.record(z.string(), z.unknown()).optional(),
  run_id: z.string().nullable().optional(),
  envelope: envelopeSchema.nullable(),
  draft_id: z.string().optional(),
  note: z.string().optional(),
});
export const conversationSendSchema = z.union([conversationSendOkSchema, verbRefusalSchema]);
export type ConversationSend = z.infer<typeof conversationSendSchema>;
export type ConversationSendOk = z.infer<typeof conversationSendOkSchema>;

export const conversationMessageSchema = z.object({
  message_id: z.string(),
  ordinal: z.number().int(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  run_id: z.string().nullable().optional(),
  envelope: envelopeSchema.nullable().optional(),
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const conversationGetOkSchema = z.object({
  conversation: z.object({
    conversation_id: z.string(),
    title: z.string(),
    // null on the gateway's in-memory store (recorded 2026-10-07).
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  }),
  messages: z.array(conversationMessageSchema),
});
export const conversationGetSchema = z.union([conversationGetOkSchema, verbRefusalSchema]);
export type ConversationGet = z.infer<typeof conversationGetSchema>;

/** The source panel's read: the stored citation, with its quote RE-READ from the corpus. */
export const citationGetOkSchema = z.object({
  citation: envelopeCitationSchema,
  message_id: z.string(),
  /** false means the quote no longer matches the corpus, and nothing may rest on it. */
  reverified: z.boolean(),
  reverified_note: z.string(),
  /**
   * The section the quote was re-read from, with the quote's offsets in it. Served only
   * when `reverified` is true; null otherwise. Optional because older gateways lack it.
   */
  section: z
    .object({ text: z.string(), start: z.number().int(), end: z.number().int() })
    .nullable()
    .optional(),
  note: z.string().optional(),
});
export const citationGetSchema = z.union([citationGetOkSchema, verbRefusalSchema]);
export type CitationGet = z.infer<typeof citationGetSchema>;
export type CitationGetOk = z.infer<typeof citationGetOkSchema>;
