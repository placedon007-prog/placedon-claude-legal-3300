import { z } from "zod";
/**
 * Wire contract for the Placedon legal engine, verified against `checker/api.py`
 * (bubblebee1408/placedon-law-backend @ f2ebcb3). Exactly six routes exist.
 * `/v1/company/{cin}/standing` and `/v1/ask` DO NOT EXIST — never add them here.
 */
export const ENGINE_ROUTES = {
  health: "/v1/health",
  compliancePack: "/v1/compliance-pack",
  documentCheck: "/v1/document-check",
  events: "/v1/company/{cin}/events",
  event: "/v1/company/{cin}/events/{event_id}",
  instrumentAffected: "/v1/instruments/{fragment}/affected",
} as const;
export type EngineRoute = (typeof ENGINE_ROUTES)[keyof typeof ENGINE_ROUTES];

/* ── Shared primitives ───────────────────────────────────────────────────── */

/** CIN: listing letter · 5-digit industry code · 2-letter state · 4-digit year · 3-letter ownership · 6-digit registration number. */
export const cinSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, "A 21-character CIN is required");
/** The backend stamps `generated_at` itself; its exact serialisation is not pinned, so it is not narrowed. */
const stampSchema = z.string().min(1);
const isoDate = z.iso.date();

/** Obligation row states (`checker/obligations.ROW_STATES`). DOES_NOT_APPLY (a real "no") and CANNOT_DETERMINE (an "I don't know") are never collapsed. */
export const rowStateSchema = z.enum([
  "APPLIES_SATISFIED",
  "APPLIES_NOT_SATISFIED",
  "APPLIES_UNDETERMINED",
  "DOES_NOT_APPLY",
  "CANNOT_DETERMINE",
]);
export type RowState = z.infer<typeof rowStateSchema>;
/** Event output classes (`checker/event_log.OUTPUT_CLASSES`). A SIGNAL is shown, never asserted. */
export const outputClassSchema = z.enum([
  "VERIFIED_FACT",
  "DETERMINISTIC_CONSEQUENCE",
  "SIGNAL",
]);
export type OutputClass = z.infer<typeof outputClassSchema>;
export const eventKindSchema = z.enum(["LAW_CHANGE", "COMPANY_FACT"]);
export type EventKind = z.infer<typeof eventKindSchema>;

/* ── Product answer classes ──────────────────────────────────────────────── */

/**
 * The four classes a rendered answer may carry. `abstained` is a VERIFIED PRODUCT
 * STATE: it is only ever derived from a payload the engine actually returned
 * (see the constructors below). No transport failure can produce one — an
 * `EngineError` carries none of these fields and has no path into this type.
 */
export const PRODUCT_CLASSES = [
  "verified_fact",
  "deterministic_conclusion",
  "predictive_signal",
  "abstained",
] as const;
export type ProductClass = (typeof PRODUCT_CLASSES)[number];
export type AnsweredClass = Exclude<ProductClass, "abstained">;
/** Row states that are the engine declining to answer, not answering "no". */
const ABSTAINING_ROW_STATES: readonly RowState[] = [
  "APPLIES_UNDETERMINED",
  "CANNOT_DETERMINE",
];
export function isAbstainingRowState(state: RowState): boolean {
  return ABSTAINING_ROW_STATES.includes(state);
}
export function rowProductClass(state: RowState): ProductClass {
  return isAbstainingRowState(state) ? "abstained" : "deterministic_conclusion";
}
export function eventProductClass(value: OutputClass): AnsweredClass {
  if (value === "VERIFIED_FACT") return "verified_fact";
  if (value === "DETERMINISTIC_CONSEQUENCE") return "deterministic_conclusion";
  return "predictive_signal";
}

/* ── GET /v1/health ──────────────────────────────────────────────────────── */

/** On provenance failure the three version fields are replaced by a single `provenance_error`. */
export const healthSchema = z.union([
  z.object({
    status: z.literal("ok"),
    no_model: z.literal(true),
    benchmark_version: z.string(),
    corpus_version: z.string(),
    checker_commit: z.string(),
  }),
  z.object({
    status: z.literal("ok"),
    no_model: z.literal(true),
    provenance_error: z.string(),
  }),
]);
export type Health = z.infer<typeof healthSchema>;

/* ── POST /v1/compliance-pack ────────────────────────────────────────────── */

export const companyClassSchema = z.enum(["private", "public", "opc"]);
export type CompanyClass = z.infer<typeof companyClassSchema>;
const rupees = z
  .number()
  .int("Money is whole rupees")
  .nonnegative("Money cannot be negative");
const profileFields = {
  company_class: companyClassSchema,
  incorporation_date: isoDate,
  cin: cinSchema.optional(),
  financial_year: z.string().trim().min(1).optional(),
  is_listed: z.boolean().optional(),
  is_section_8: z.boolean().optional(),
  is_holding_company: z.boolean().optional(),
  is_subsidiary_company: z.boolean().optional(),
  governed_by_special_act: z.boolean().optional(),
  director_count: z.number().int().nonnegative().optional(),
  paid_up_capital_rupees: rupees.optional(),
  turnover_rupees: rupees.optional(),
  net_worth_rupees: rupees.optional(),
  net_profit_rupees: rupees.optional(),
};
const MONEY_FIELDS = [
  "paid_up_capital_rupees",
  "turnover_rupees",
  "net_worth_rupees",
  "net_profit_rupees",
] as const;
/** Any money figure obliges `financial_year`; the backend answers 400 otherwise. */
function requireFinancialYearForMoney(
  value: Record<string, unknown>,
  ctx: z.RefinementCtx,
): void {
  if (value.financial_year) return;
  for (const field of MONEY_FIELDS)
    if (value[field] !== undefined)
      ctx.addIssue({
        code: "custom",
        path: ["financial_year"],
        message: `financial_year is required alongside ${field}`,
      });
}
export const compliancePackRequestSchema = z
  .object({
    ...profileFields,
    as_of: isoDate,
    evidence: z
      .object({
        agm_dates: z.array(isoDate).optional(),
        financial_year_end: isoDate.optional(),
        board_meetings: z.array(isoDate).optional(),
        calendar_year: z.number().int().optional(),
        aoc4_filed_on: isoDate.optional(),
        annual_return_filed_on: isoDate.optional(),
        resident_director_days: z.number().int().nonnegative().optional(),
        first_financial_year_end: isoDate.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine(requireFinancialYearForMoney);
export type CompliancePackRequest = z.input<typeof compliancePackRequestSchema>;

export const citedSpanSchema = z.object({
  path: z.string(),
  sha256: z.string(),
  resolved: z.boolean(),
});
export type CitedSpan = z.infer<typeof citedSpanSchema>;
export const obligationRowSchema = z.object({
  obligation_id: z.string(),
  duty: z.string(),
  provision: z.string(),
  state: rowStateSchema,
  basis: z.string(),
  missing_facts: z.array(z.string()).default([]),
  blocked_by: z.string().nullable(),
  cited_spans: z.array(citedSpanSchema).default([]),
});
export type ObligationRow = z.infer<typeof obligationRowSchema>;
/** `provenance` degrades to an `error`/`note` object when the version stamps cannot be read. */
export const provenanceSchema = z.union([
  z.object({
    benchmark_version: z.string(),
    corpus_version: z.string(),
    checker_commit: z.string(),
    working_tree_dirty: z.boolean(),
    law_as_of: z.string(),
  }),
  z.object({ error: z.string().optional(), note: z.string().optional() }),
]);
export type Provenance = z.infer<typeof provenanceSchema>;
/**
 * DRIFT 1 — `/v1/compliance-pack` is the one route that does NOT carry `no_model`.
 * The other five do. Do not add it here and do not read it off a pack.
 */
export const compliancePackSchema = z.object({
  company_class: z.string(),
  cin: z.string().nullable(),
  as_of: isoDate,
  financial_year: z.string().nullable(),
  generated_at: stampSchema,
  provenance: provenanceSchema,
  summary: z.object({
    not_satisfied: z.number().int().nonnegative(),
    undetermined: z.number().int().nonnegative(),
    cannot_determine: z.number().int().nonnegative(),
    satisfied: z.number().int().nonnegative(),
    not_applicable: z.number().int().nonnegative(),
  }),
  rows: z.array(obligationRowSchema),
  unverified: z
    .array(z.object({ obligation_id: z.string(), to_settle: z.string() }))
    .default([]),
  law_currency_watch: z
    .array(
      z.object({
        obligation_id: z.string(),
        status: z.string(),
        instrument: z.string(),
        detail: z.string(),
      }),
    )
    .default([]),
  what_this_is: z.array(z.string()).default([]),
  what_it_is_not: z.array(z.string()).default([]),
});
export type CompliancePack = z.infer<typeof compliancePackSchema>;

/* ── POST /v1/document-check ─────────────────────────────────────────────── */

export const documentCheckRequestSchema = z
  .object({ ...profileFields, document_date: isoDate, as_of: isoDate.optional() })
  .strict()
  .superRefine(requireFinancialYearForMoney)
  .refine(
    (value) => !value.as_of || value.document_date <= value.as_of,
    {
      path: ["document_date"],
      message: "document_date cannot fall after as_of",
    },
  );
export type DocumentCheckRequest = z.input<typeof documentCheckRequestSchema>;

export const supersededEntrySchema = z.object({
  obligation_id: z.string(),
  duty: z.string(),
  provision: z.string(),
  was_at_document_date: z.string(),
  is_at_read_date: z.string(),
  governed_then: z.string(),
  governs_now: z.string(),
  instrument: z.string(),
  detail: z.string(),
  reference: z.string().nullable(),
});
export type SupersededEntry = z.infer<typeof supersededEntrySchema>;
/**
 * DRIFT 2 — `cannot_verify[]` carries TWO shapes, not one. The documented shape
 * reports a movement that could not be settled and carries the bitemporal flag
 * `already_open_at_document_date` plus a `reference`; the second, narrower shape
 * is emitted when the obligation could not be evaluated at either date at all and
 * carries neither. Each entry is tagged with `shape` on parse so the UI must
 * discriminate before reading the bitemporal flag.
 */
export const cannotVerifyEntrySchema = z.union([
  z
    .object({
      obligation_id: z.string(),
      duty: z.string(),
      provision: z.string(),
      detail: z.string(),
      already_open_at_document_date: z.boolean(),
      reference: z.string().nullable(),
    })
    .transform((entry) => ({ shape: "movement_unverified" as const, ...entry })),
  z
    .object({
      obligation_id: z.string(),
      duty: z.string(),
      provision: z.string(),
      detail: z.string(),
    })
    .transform((entry) => ({
      shape: "evaluation_unavailable" as const,
      ...entry,
    })),
]);
export type CannotVerifyEntry = z.infer<typeof cannotVerifyEntrySchema>;
export const verifiedEntrySchema = z.object({
  obligation_id: z.string(),
  duty: z.string(),
  provision: z.string(),
  state: rowStateSchema,
  basis: z.string(),
});
export type VerifiedEntry = z.infer<typeof verifiedEntrySchema>;
export const documentCheckSchema = z.object({
  document_date: isoDate,
  as_of: isoDate,
  generated_at: stampSchema,
  summary: z.object({
    superseded: z.number().int().nonnegative(),
    cannot_verify: z.number().int().nonnegative(),
    verified: z.number().int().nonnegative(),
  }),
  superseded: z.array(supersededEntrySchema).default([]),
  cannot_verify: z.array(cannotVerifyEntrySchema).default([]),
  verified: z.array(verifiedEntrySchema).default([]),
  what_this_is: z.array(z.string()).default([]),
  what_it_is_not: z.array(z.string()).default([]),
  no_model: z.literal(true),
});
export type DocumentCheckResult = z.infer<typeof documentCheckSchema>;

/* ── GET /v1/company/{cin}/events[/{event_id}] ───────────────────────────── */

export const eventsQuerySchema = z
  .object({
    as_of: isoDate.optional(),
    since: isoDate.optional(),
    kind: z.enum(["law", "company"]).optional(),
    class: z.enum(["fact", "consequence", "signal"]).optional(),
  })
  .strict()
  .refine((value) => !value.since || !value.as_of || value.since <= value.as_of, {
    path: ["since"],
    message: "since cannot fall after as_of",
  });
export type EventsQuery = z.input<typeof eventsQuerySchema>;
export const engineEventSchema = z.object({
  id: z.string(),
  at: isoDate,
  known_at: isoDate,
  kind: eventKindSchema,
  subtype: z.string(),
  title: z.string(),
  output_class: outputClassSchema,
  currency_state: z.string(),
  obligation_id: z.string(),
  consequence: z.string(),
  /** Only a human review fills this. A null `verified_by` is why an event is a SIGNAL. */
  verified_by: z.string().nullable(),
  source: z.object({
    instrument: z.string(),
    as_at: isoDate.nullable(),
    sha256: z.string().nullable(),
    url: z.url().nullable(),
  }),
});
export type EngineEvent = z.infer<typeof engineEventSchema>;
/**
 * DRIFT 4 — this stream is NOT per-company. The `cin` is echoed back in the
 * envelope but is never used to filter: v0 serves law-change events only, and the
 * `scope` string says so. No UI may label this "this company's events", and an
 * absence here is not evidence that nothing happened to the company.
 */
export const eventsSchema = z.object({
  cin: z.string(),
  as_of: isoDate,
  since: isoDate.nullable(),
  generated_at: stampSchema,
  scope: z.string(),
  no_model: z.literal(true),
  events: z.array(engineEventSchema).default([]),
});
export type EventsResponse = z.infer<typeof eventsSchema>;
export const eventDetailSchema = z.object({
  cin: z.string(),
  as_of: isoDate.optional(),
  scope: z.string().optional(),
  generated_at: stampSchema,
  no_model: z.literal(true),
  event: engineEventSchema,
});
export type EventDetailResponse = z.infer<typeof eventDetailSchema>;

/* ── GET /v1/instruments/{fragment}/affected ─────────────────────────────── */

/** The element shape is not pinned by the contract doc; both the bare id and the expanded row are accepted. */
export const affectedObligationSchema = z.union([
  z.string(),
  z.object({
    obligation_id: z.string(),
    duty: z.string().optional(),
    provision: z.string().optional(),
    detail: z.string().optional(),
  }),
]);
export type AffectedObligation = z.infer<typeof affectedObligationSchema>;
export const instrumentAffectedSchema = z.object({
  instrument: z.string(),
  generated_at: stampSchema,
  obligations: z.array(affectedObligationSchema).default([]),
  no_model: z.literal(true),
});
export type InstrumentAffectedResponse = z.infer<
  typeof instrumentAffectedSchema
>;

/* ── Engine error bodies ─────────────────────────────────────────────────── */

/** 400 — `detail` names the exact offending field. Surface it verbatim. */
export const badRequestBodySchema = z.object({
  error: z.literal("bad_request"),
  detail: z.string(),
});
/**
 * DRIFT 3 — the event-detail 404 body carries no `routes[]`, while every other
 * 404 does. `routes` is therefore optional and a renderer must tolerate its absence.
 */
export const notFoundBodySchema = z.object({
  error: z.literal("not_found"),
  detail: z.string(),
  routes: z.array(z.string()).optional(),
});
export const engineErrorBodySchema = z.union([
  badRequestBodySchema,
  notFoundBodySchema,
]);
export type EngineErrorBody = z.infer<typeof engineErrorBodySchema>;

/* ── Abstention — derived from data, never from a failure ─────────────────── */

/**
 * An abstention Placedon may show. Every field is copied from a payload the engine
 * returned, so an abstention cannot be constructed without one. There is
 * deliberately no constructor that takes an `EngineError`.
 */
export interface Abstention {
  readonly class: "abstained";
  readonly obligation_id: string;
  readonly provision: string;
  /** The engine's own words for what it could not settle. */
  readonly basis: string;
  /** What would settle it. */
  readonly missing_facts: readonly string[];
  readonly blocked_by: string | null;
}
export function packAbstentions(pack: CompliancePack): Abstention[] {
  return pack.rows
    .filter((row) => isAbstainingRowState(row.state))
    .map((row) => ({
      class: "abstained" as const,
      obligation_id: row.obligation_id,
      provision: row.provision,
      basis: row.basis,
      missing_facts: row.missing_facts,
      blocked_by: row.blocked_by,
    }));
}
export function documentCheckAbstentions(
  result: DocumentCheckResult,
): Abstention[] {
  return result.cannot_verify.map((entry) => ({
    class: "abstained" as const,
    obligation_id: entry.obligation_id,
    provision: entry.provision,
    basis: entry.detail,
    missing_facts: [],
    blocked_by: null,
  }));
}
