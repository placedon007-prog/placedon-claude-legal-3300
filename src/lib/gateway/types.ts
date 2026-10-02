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
