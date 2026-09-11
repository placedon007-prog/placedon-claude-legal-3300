import "./server-guard";
import { engineOk, type EngineResult } from "./errors";
import type { EngineProvider } from "./provider";
import {
  compliancePackSchema,
  documentCheckSchema,
  eventDetailSchema,
  eventsSchema,
  healthSchema,
  instrumentAffectedSchema,
  type CompliancePack,
  type DocumentCheckResult,
  type EventDetailResponse,
  type EventsResponse,
  type Health,
  type InstrumentAffectedResponse,
} from "./types";

/**
 * Deterministic fixtures for local development, demos, and tests.
 *
 * Every fixture is parsed through the SAME zod schema the HTTP client uses, so
 * a fixture that drifts from the contract fails here, not in front of a user —
 * and swapping to the real backend is a config change, never a data-shape one.
 *
 * The content is real Companies Act, 2013 doctrine (s.96 AGM timing, s.173
 * board-meeting cadence, s.203 KMP, s.149(3) resident director) with a
 * genuine abstention: the FY2025-26 AGM outer date turns on the unsettled
 * G.S.R. 880(E) small-company threshold, so that row is APPLIES_UNDETERMINED
 * rather than a fabricated date. Nothing here invents a statutory figure.
 */

const STAMP = "2026-09-11T00:00:00Z";
const PROVENANCE = {
  benchmark_version: "bench-2026.09",
  corpus_version: "companies-act-2013@2026-09-01",
  checker_commit: "f2ebcb3",
  working_tree_dirty: false,
  law_as_of: "2026-09-01",
} as const;

function pack(): CompliancePack {
  return compliancePackSchema.parse({
    company_class: "private",
    cin: "U74999KA2021PTC145321",
    as_of: "2026-09-01",
    financial_year: "2025-26",
    generated_at: STAMP,
    provenance: PROVENANCE,
    summary: {
      not_satisfied: 1,
      undetermined: 1,
      cannot_determine: 0,
      satisfied: 2,
      not_applicable: 1,
    },
    rows: [
      {
        obligation_id: "agm-timing",
        duty: "Hold the annual general meeting within the statutory window",
        provision: "s.96(1)",
        state: "APPLIES_UNDETERMINED",
        basis:
          "The outer date depends on whether the company is a small company for FY2025-26, which turns on the revised threshold in G.S.R. 880(E) — not yet settled in the corpus.",
        missing_facts: ["small_company_status_fy2025_26"],
        blocked_by: "G.S.R. 880(E)",
        cited_spans: [
          {
            path: "companies-act-2013/s96.md",
            sha256:
              "b3f1c0d2e4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
            resolved: true,
          },
        ],
      },
      {
        obligation_id: "board-meetings",
        duty: "Hold at least four board meetings with no gap over 120 days",
        provision: "s.173(1)",
        state: "APPLIES_SATISFIED",
        basis:
          "Four board meetings are on record for FY2025-26 with the longest gap at 89 days.",
        missing_facts: [],
        blocked_by: null,
        cited_spans: [],
      },
      {
        obligation_id: "resident-director",
        duty: "At least one director resident in India for 182 days or more",
        provision: "s.149(3)",
        state: "APPLIES_NOT_SATISFIED",
        basis:
          "The sole resident director's recorded stay is 168 days, short of the 182-day floor.",
        missing_facts: [],
        blocked_by: null,
        cited_spans: [],
      },
      {
        obligation_id: "kmp-appointment",
        duty: "Appoint whole-time key managerial personnel",
        provision: "s.203(1)",
        state: "DOES_NOT_APPLY",
        basis:
          "s.203 read with Rule 8 applies to listed companies and to public companies with paid-up capital of ₹10 crore or more. This company is neither.",
        missing_facts: [],
        blocked_by: null,
        cited_spans: [],
      },
      {
        obligation_id: "annual-return",
        duty: "File the annual return within sixty days of the AGM",
        provision: "s.92(4)",
        state: "APPLIES_SATISFIED",
        basis: "MGT-7 filed 41 days after the FY2024-25 AGM.",
        missing_facts: [],
        blocked_by: null,
        cited_spans: [],
      },
    ],
    unverified: [
      {
        obligation_id: "agm-timing",
        to_settle:
          "Attest the G.S.R. 880(E) small-company threshold against the Gazette to fix the FY2025-26 AGM outer date.",
      },
    ],
    law_currency_watch: [
      {
        obligation_id: "agm-timing",
        status: "moved",
        instrument: "G.S.R. 880(E)",
        detail:
          "The small-company capital/turnover thresholds were revised; the operative date is pending Gazette attestation.",
      },
    ],
    what_this_is: [
      "A checklist of duties the Act imposes on this company profile as of the read date.",
      "Each row names its provision and the basis for the state shown.",
    ],
    what_it_is_not: [
      "Not legal advice, and not a substitute for counsel.",
      "Not a filing. Not a guarantee that undetermined rows will resolve in your favour.",
    ],
  });
}

function documentCheck(): DocumentCheckResult {
  return documentCheckSchema.parse({
    document_date: "2021-06-30",
    as_of: "2026-09-01",
    generated_at: STAMP,
    summary: { superseded: 1, cannot_verify: 1, verified: 1 },
    superseded: [
      {
        obligation_id: "small-company-threshold",
        duty: "Small-company classification",
        provision: "s.2(85)",
        was_at_document_date: "Paid-up ≤ ₹50 lakh and turnover ≤ ₹2 crore",
        is_at_read_date: "Paid-up ≤ ₹4 crore and turnover ≤ ₹40 crore",
        governed_then: "Companies Act, 2013 (as at 2021-06-30)",
        governs_now: "Companies (Specification of Definitions) Amendment",
        instrument: "G.S.R. 700(E)",
        detail:
          "The threshold was raised after the document date, so a classification made then may no longer hold.",
        reference: "G.S.R. 700(E)",
      },
    ],
    cannot_verify: [
      {
        obligation_id: "agm-timing",
        duty: "AGM outer date",
        provision: "s.96(1)",
        detail:
          "Whether the AGM timing moved between the document date and the read date turns on G.S.R. 880(E), which is not yet settled in the corpus.",
        already_open_at_document_date: false,
        reference: "G.S.R. 880(E)",
      },
    ],
    verified: [
      {
        obligation_id: "board-meetings",
        duty: "Board-meeting cadence",
        provision: "s.173(1)",
        state: "APPLIES_SATISFIED",
        basis: "Unchanged between the document date and the read date.",
      },
    ],
    what_this_is: [
      "A read of whether the law behind this document moved between its date and today.",
    ],
    what_it_is_not: [
      "Not a re-drafting of the document, and not legal advice.",
    ],
    no_model: true,
  });
}

function events(cin: string): EventsResponse {
  return eventsSchema.parse({
    cin,
    as_of: "2026-09-01",
    since: "2025-01-01",
    generated_at: STAMP,
    scope: "law_change_events_only",
    no_model: true,
    events: [EVENT_BODY],
  });
}

const EVENT_BODY = {
  id: "evt-gsr-880e-2025",
  at: "2025-12-01",
  known_at: "2025-12-03",
  kind: "LAW_CHANGE" as const,
  subtype: "threshold_revision",
  title: "Small-company thresholds revised",
  output_class: "SIGNAL" as const,
  currency_state: "moved_pending_attestation",
  obligation_id: "agm-timing",
  consequence:
    "May change the AGM outer date for companies near the small-company threshold.",
  verified_by: null,
  source: {
    instrument: "G.S.R. 880(E)",
    as_at: "2025-12-01",
    sha256: null,
    url: null,
  },
};

function eventDetail(cin: string): EventDetailResponse {
  return eventDetailSchema.parse({
    cin,
    as_of: "2026-09-01",
    scope: "law_change_events_only",
    generated_at: STAMP,
    no_model: true,
    event: EVENT_BODY,
  });
}

function instrumentAffected(fragment: string): InstrumentAffectedResponse {
  return instrumentAffectedSchema.parse({
    instrument: fragment.toUpperCase().includes("880")
      ? "G.S.R. 880(E)"
      : fragment,
    generated_at: STAMP,
    no_model: true,
    obligations: [
      {
        obligation_id: "agm-timing",
        duty: "AGM outer date",
        provision: "s.96(1)",
        detail:
          "The outer date depends on small-company status, which this instrument revises.",
      },
    ],
  });
}

function health(): Health {
  return healthSchema.parse({
    status: "ok",
    no_model: true,
    benchmark_version: PROVENANCE.benchmark_version,
    corpus_version: PROVENANCE.corpus_version,
    checker_commit: PROVENANCE.checker_commit,
  });
}

/** Fixture-backed engine. Returns, never throws; matches the wire contract exactly. */
export class MockEngineProvider implements EngineProvider {
  readonly name = "mock" as const;

  async health(): Promise<EngineResult<Health>> {
    return engineOk(health());
  }
  // The mock ignores request bodies and query/id params; a narrower signature
  // still satisfies EngineProvider (structural typing), which keeps lint clean.
  async compliancePack(): Promise<EngineResult<CompliancePack>> {
    return engineOk(pack());
  }
  async documentCheck(): Promise<EngineResult<DocumentCheckResult>> {
    return engineOk(documentCheck());
  }
  async events(cin: string): Promise<EngineResult<EventsResponse>> {
    return engineOk(events(cin));
  }
  async event(cin: string): Promise<EngineResult<EventDetailResponse>> {
    return engineOk(eventDetail(cin));
  }
  async instrumentAffected(
    fragment: string,
  ): Promise<EngineResult<InstrumentAffectedResponse>> {
    return engineOk(instrumentAffected(fragment));
  }
}
