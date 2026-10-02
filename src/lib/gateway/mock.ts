import "../engine/server-guard";
import { engineFail, engineOk, type EngineResult } from "../engine/errors";
import { GATEWAY_ROUTES } from "../engine/types";
import type { GatewayProvider } from "./provider";
import type {
  AskResponse,
  CancelAck,
  Decision,
  DocumentResponse,
  ReviewResponse,
  Run,
  RunTrace,
  UploadResponse,
} from "./types";

/**
 * Fixtures shaped exactly like the gateway's real answers, so the prototype runs and
 * demos with no backend and so the tests never touch a network or bill a model.
 *
 * Every string here is copied from a REAL recorded run against
 * `azure:llama-3-3-70b` (backend `reports/gateway_served_models_2026-09-29.md`) — not
 * composed. A fixture that invents a statutory sentence would put a fabricated provision
 * on a screen, which is the one thing this product may never do.
 */
const ANSWER_S96 = `[1 of 4 sentence(s) the model wrote did not trace to admitted evidence and are not part of this summary. They are preserved in full below.]

1. Not more than fifteen months shall elapse between the date of one annual general meeting of a company and that of the next.
   — Companies Act 2013, s.96 [226:348]
2. The first annual general meeting shall be held within a period of nine months from the date of closing of the first financial year of the company.
   — Companies Act 2013, s.96 [409:524]
3. The Registrar may extend the time within which any annual general meeting, other than the first annual general meeting, shall be held, by a period not exceeding three months.
   — Companies Act 2013, s.96 [845:1043]`;

const RUN_ASK = "5e0bd4d5-e114-49a8-8f76-ee348d5f3dd9";
const RUN_REVIEW = "142ca24e-6960-4a5f-a6b8-272a5e964301";


/**
 * A REAL `review_document` reply, recorded 2026-09-30 by running the ICSI specimen minutes
 * through `gateway/verbs._review_document` with a 49-day entry lag. Not composed: the ROC
 * orders in `precedent` are real adjudications and inventing one would put a fabricated
 * penalty on a screen.
 */
const DOCUMENT_MINUTES: DocumentResponse = {
    doc_type: "minutes",
    status: "ANSWERED",
    code: null,
    note: "Every finding cites Secretarial Standards and a real ROC adjudication order. A NEEDS_BOOK item is not a defect and not a pass: it is a property of the physical minutes book that no reader of a file can decide.",
    meeting_kind: "board",
    requires_review: true,
    checks_run: 12,
    defect_count: 1,
    needs_human_count: 3,
    findings: [
      {
        rule_id: "T1.6a",
        status: "PASS",
        source: "SS-1 7.1.x / SS-2 17.2.2.1",
        defect: "Serial number of the meeting not stated in the minutes",
        quoted_span: "Meeting No: 14",
        precedent: "Sunima Trading P Ltd, ROC UP-I, 13.07.2026 — Rs 45,000; Merino Shelters, 15.05.2026",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.6b",
        status: "PASS",
        source: "SS-2 17.2.2.1(o) / SS-1 equivalent",
        defect: "Time of commencement of the meeting not recorded",
        quoted_span: "The Meeting commenced at 11:00 a.m.",
        precedent: "Rashi Steel and Power, ROC Chhattisgarh, 24.03.2026 & 07.04.2026; Triveni Nidhi, 04.09.2024",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.6c",
        status: "PASS",
        source: "SS-2 17.2.2.1(o) / SS-1 equivalent",
        defect: "Time of conclusion of the meeting not recorded",
        quoted_span: "The Meeting concluded at 12:30 p.m.",
        precedent: "Rashi Steel and Power, ROC Chhattisgarh, 24.03.2026 & 07.04.2026; Triveni Nidhi, 04.09.2024",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.7",
        status: "PASS",
        source: "SS-1 7.6",
        defect: "Place at which the minutes were signed not recorded",
        quoted_span: "Place: Bengaluru",
        precedent: "Wind World (India) Ltd, ROC Goa/Daman & Diu, 2024; Sany Heavy Industry, 17.05.2024",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.4a",
        status: "PASS",
        source: "SS-1 7.5.2 / SS-2 17.4.2 r/w R.25(1)(b)",
        defect: "Date of entry of the minutes in the Minutes Book not recorded",
        quoted_span: "entered in",
        precedent: "Harsh Gathani Enterprise, ROC Ahmedabad, 24.06.2025; Sen Hon Lee, 13.10.2025",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.4b",
        status: "DEFECT",
        source: "R.25(1)(b), SS-1 7.5.2 / SS-2 17.4.2",
        defect: "Minutes entered 49 days after the meeting (limit 30)",
        quoted_span: "meeting 2026-04-01 -> entry 2026-05-20",
        precedent: "Trouw Nutrition India, 22.10.2024 — Rs 21.35 lakh; Tamilnad Mercantile Bank, 182-day delay",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.5",
        status: "PASS",
        source: "SS-1 7.6",
        defect: "Minutes signed by another director on behalf of the Chairman",
        quoted_span: "no 'on behalf of' signature found",
        precedent: "Landomus Realty Ventures, ROC Bangalore, 31.03.2026; Dystar India, 09.09.2025",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "C.quorum",
        status: "PASS",
        source: "SS-1 7.2.2.1(e)",
        defect: "Presence of quorum not recorded",
        quoted_span: "quorum",
        precedent: "Mandatory enumerated content; SS-1 7.2.2.1",
        applies: true,
        advisory_only: false,
        needs_human: false
      },
      {
        rule_id: "T1.8",
        status: "PASS",
        source: "SS-1 7.3.2 / SS-2 17.3.2",
        defect: "Minutes not written in the third person",
        quoted_span: "no first-person usage found",
        precedent: "No penalty order found for tense alone — advisory",
        applies: true,
        advisory_only: true,
        needs_human: false
      },
      {
        rule_id: "T1.1",
        status: "NEEDS_BOOK",
        source: "SS-1 7.1.4 / SS-2 17.1.4",
        defect: "Minutes book pages not consecutively numbered across the whole book",
        quoted_span: "physical minutes book not inspected",
        precedent: "Rosmerta Technologies, ROC Delhi, 07.10.2025 — numbering restarted each FY; ~24 of 68 orders",
        applies: true,
        advisory_only: false,
        needs_human: true
      },
      {
        rule_id: "T1.2",
        status: "NEEDS_BOOK",
        source: "SS-1 7.6.2",
        defect: "Chairman did not initial every page of the minutes",
        quoted_span: "physical minutes book not inspected",
        precedent: "Chartered Mercantile Mutual Benefits, ROC Kanpur, 10.02.2026; Rashi Steel, 24.03.2026",
        applies: true,
        advisory_only: false,
        needs_human: true
      },
      {
        rule_id: "T1.3",
        status: "NEEDS_BOOK",
        source: "SS-1 7.1.4",
        defect: "Blank pages not scored out and not initialled by the Chairman",
        quoted_span: "physical minutes book not inspected",
        precedent: "Madhyam Agrivet Industries, ROC Pune, 30.06.2023; Rosmerta Autotech, 09.10.2025",
        applies: true,
        advisory_only: false,
        needs_human: true
      }
    ],
};

export class MockGateway implements GatewayProvider {
  readonly name = "mock" as const;
  /** One decision per item per run, as the gateway's UNIQUE constraint enforces. */
  private readonly decided = new Set<string>();

  async ask(question: string): Promise<EngineResult<AskResponse>> {
    const q = question.toLowerCase();
    // A question reaching law this corpus does not hold refuses BY NAME, exactly as the
    // engine does. The demo must be able to show a refusal, or it demos only success.
    if (/insider|sebi|data protection|dpdp|arbitration|stamp/.test(q)) {
      return engineOk({
        status: "REFUSED",
        code: "NO_EVIDENCE",
        reason:
          "retrieval abstained: the question reaches a body of law this corpus does not hold, so no model was called.",
        provisions: [],
        dropped: 0,
        model: null,
        degraded: false,
        answer: "",
        run_id: RUN_ASK,
      });
    }
    if (/board meeting|173/.test(q)) {
      return engineOk({
        status: "REFUSED",
        code: "NOTHING_TRACED",
        reason:
          "nothing traced: all 2 sentence(s) the model wrote failed to trace to admitted evidence, so there is no summary.",
        provisions: ["Companies Act 2013, s.173"],
        dropped: 2,
        model: "azure/llama-3-3-70b",
        degraded: true,
        answer: "",
        run_id: RUN_ASK,
      });
    }
    return engineOk({
      status: "PARTIAL",
      question,
      code: null,
      provisions: ["Companies Act 2013, s.96"],
      dropped: 1,
      model: "azure/llama-3-3-70b",
      degraded: true,
      answer: ANSWER_S96,
      run_id: RUN_ASK,
    });
  }

  async reviewContract(input: {
    text: string;
    testData: boolean;
  }): Promise<EngineResult<ReviewResponse>> {
    if (!input.testData) {
      // PLAN_22 D3, reproduced faithfully: the backend refuses a document that is not
      // marked test data while the deployment region is unconfirmed.
      return engineOk({
        playbook_status: "DRAFT",
        requires_review: true,
        findings: [],
        unverified: [],
        law_not_held: [],
        run_id: null,
        model: null,
      } as ReviewResponse);
    }
    const fiveYears = /five years|5 years/i.test(input.text);
    return engineOk({
      playbook_status: "DRAFT",
      requires_review: true,
      model: "azure/llama-3-3-70b",
      clauses_in_contract: 9,
      findings: [
        {
          rule_id: "NDA-01",
          clause: "Term",
          status: fiveYears ? "DEVIATES" : "MATCHES",
          kind: "POTENTIAL_ISSUE",
          standard_text:
            "Confidentiality lasts no more than 3 years from signature.",
          rationale:
            "A longer obligation costs more to administer than it is usually worth, and is the term most often negotiated down.",
          detail: fiveYears
            ? "'five years' (5) against the standard maximum '3 years' (3)"
            : "'three years' (3) against the standard maximum '3 years' (3)",
        },
        {
          rule_id: "NDA-02",
          clause: "Governing Law",
          status: "MATCHES",
          kind: "POTENTIAL_ISSUE",
          standard_text:
            "The agreement is governed by Indian law.",
          rationale:
            "A foreign governing law makes any dispute slower and more expensive to run.",
          detail: "'India' against the accepted list ['India', 'laws of India', …]",
        },
        {
          rule_id: "NDA-04",
          clause: "Definition of Confidential Information",
          status: "MISSING",
          kind: "POTENTIAL_ISSUE",
          standard_text:
            "The agreement defines what counts as confidential information.",
          rationale:
            "Without a definition there is nothing in particular being protected.",
          detail: "the standard expects this clause and none was extracted",
        },
        {
          rule_id: "NDA-08",
          clause: "Non-Compete",
          status: "NEEDS_LAWYER",
          kind: "POTENTIAL_ISSUE",
          standard_text:
            "The agreement contains no non-compete.",
          rationale:
            "A non-compete changes what an NDA does and is easy to miss inside one; whether a particular form is acceptable is a person's call, not code's.",
          detail: "present, and not in the approved list. Code cannot decide whether this form is acceptable; a person has to look",
        },
      ],
      unverified: [],
      law_not_held: [
        {
          body: "CONTRACT1872",
          refusal:
            "Indian Contract Act, 1872 is within scope — it covers formation, consideration, free consent, void and voidable agreements, restraint of trade, remedies for breach — but nothing has been acquired, so nothing here is decided against it.",
        },
        {
          body: "ARBITRATION1996",
          refusal:
            "Arbitration and Conciliation Act, 1996 is within scope — it covers arbitration agreements, seat and venue, interim relief, enforcement of awards — but nothing has been acquired.",
        },
        {
          body: "STAMP",
          refusal:
            "Stamp duty — Indian Stamp Act, 1899 and State amendments is within scope, but no instrument has been acquired, and rates vary across 25+ States so a single national answer is wrong by construction.",
        },
      ],
      run_id: RUN_REVIEW,
    });
  }

  async run(runId: string): Promise<EngineResult<Run>> {
    if (runId === "missing") {
      return engineFail({
        kind: "not_found",
        route: GATEWAY_ROUTES.runGet,
        status: 404,
        message: "No run with that id.",
      });
    }
    return engineOk({
      id: runId,
      intent: runId === RUN_REVIEW ? "review_contract" : "research_question",
      status: "PARTIAL",
      refusal_code: null,
    });
  }

  async trace(runId: string): Promise<EngineResult<RunTrace>> {
    return engineOk({
      run_id: runId,
      steps: [
        {
          capability: "intake",
          engine_capability: null,
          status: "ANSWERED",
          model: null,
          degraded: false,
          provider: null,
          region: null,
          cost_inr: null,
          cost_note:
            "no model was called on this step, so there is nothing to price. This is not a cost of zero.",
        },
        {
          capability: "research",
          engine_capability: "law.acquisition_exposure",
          status: "PARTIAL",
          model: "azure/llama-3-3-70b",
          degraded: true,
          provider: "azure",
          region: "UAE North",
          cost_inr: 0.0735,
          cost_note:
            "priced from 852+235 tokens at https://prices.azure.com/api/retail/prices (2026-09-29)",
        },
      ],
    });
  }

  async upload(input: { text: string; name?: string }): Promise<EngineResult<UploadResponse>> {
    // The id IS the hash in the backend, so the fixture derives one rather than inventing
    // a counter: uploading the same bytes twice must look like one document here too.
    let h = 0;
    for (const ch of input.text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const sha = h.toString(16).padStart(8, "0").repeat(8).slice(0, 64);
    return engineOk({
      document_id: sha,
      sha256: sha,
      bytes: new TextEncoder().encode(input.text).length,
      stored: "memory",
      note: "held in this process only. Nothing here survives a restart.",
    });
  }

  async reviewDocument(input: {
    text: string;
    name?: string;
    meetingKind?: "board" | "general";
    meetingDate?: string;
    entryDate?: string;
  }): Promise<EngineResult<DocumentResponse>> {
    // The classifier's real behaviour, reproduced: a notice and an unidentifiable document
    // take different paths, and the mock must not make every document look like minutes.
    const t = input.text.toLowerCase();
    const isNotice =
      /notice is hereby given|notice of the|explanatory statement|proxy form|e-voting/.test(t);
    const isMinutes = /minutes of the|the meeting (commenced|concluded)|chairman/.test(t);

    if (!isNotice && !isMinutes) {
      return engineOk({
        doc_type: "unknown",
        status: "UNCLASSIFIED",
        code: "CLASSIFICATION_UNCERTAIN",
        note:
          "This document could not be identified as minutes, a notice or an outcome " +
          "filing, so no check was run against it. That is uncertainty about the " +
          "document, NOT a finding that it is free of defects: every check here is " +
          "written for a particular document type, and one run against a document " +
          "nobody has identified would be a claim about a thing we cannot name.",
        meeting_kind: input.meetingKind ?? "board",
        requires_review: true,
        checks_run: 0,
        defect_count: 0,
        needs_human_count: 0,
        findings: [],
        run_id: "mock-doc-unclassified",
      });
    }
    if (isNotice) {
      // Every minutes-only check marked not applicable, which is what the backend does.
      // A mock that let one fire would hide the bug this classifier exists to prevent.
      const findings = DOCUMENT_MINUTES.findings.map((f) =>
        f.rule_id === "T1.6a"
          ? { ...f }
          : {
              ...f,
              status: "N/A" as const,
              quoted_span: "not applicable to a document of type 'notice'",
              applies: false,
              needs_human: false,
            },
      );
      return engineOk({
        ...DOCUMENT_MINUTES,
        doc_type: "notice",
        defect_count: 0,
        needs_human_count: 0,
        findings,
        run_id: "mock-doc-notice",
      });
    }
    return engineOk({ ...DOCUMENT_MINUTES, run_id: "mock-doc-minutes" });
  }

  /** Runs this mock reports as still moving, so the poller has something to poll. */
  private readonly cancelled = new Set<string>();

  async cancel(runId: string): Promise<EngineResult<CancelAck>> {
    // The gateway refuses a second cancel and an unknown run with the SAME code, so that
    // the answer does not leak which run ids exist. The mock must refuse them the same way
    // or the screen is tested against a kinder backend than the real one.
    if (this.cancelled.has(runId)) {
      return engineFail({
        kind: "bad_request",
        route: GATEWAY_ROUTES.runCancel,
        status: 409,
        message:
          `run ${runId} has no job that is still running. A finished run is not cancelled ` +
          "retroactively — its trace is what happened.",
      });
    }
    this.cancelled.add(runId);
    return engineOk({
      status: "CANCEL_REQUESTED",
      run_id: runId,
      note:
        "the run will stop at its next step boundary. Everything already done stays in " +
        "the trace, marked CANCELLED where it stopped.",
    });
  }

  async decide(input: {
    runId: string;
    itemRef: string;
    verdict: "APPROVED" | "REJECTED";
    reason: string;
    quotedSpan: string;
  }): Promise<EngineResult<Decision>> {
    // The gateway's refusals, reproduced. A mock that accepted a one-word reason would let
    // the anti-automation-bias gate pass its tests while the real thing refused.
    const reason = input.reason.trim();
    if (reason.length < 10) {
      return engineFail({
        kind: "bad_request",
        route: GATEWAY_ROUTES.runApprove,
        status: 400,
        message:
          "a written reason of at least 10 characters is required. A decision with no " +
          "reason records that somebody clicked.",
      });
    }
    if (!input.quotedSpan.trim()) {
      return engineFail({
        kind: "bad_request",
        route: GATEWAY_ROUTES.runApprove,
        status: 400,
        message:
          "quoted_span is required: it is the text the reviewer was looking at when they " +
          "decided.",
      });
    }
    if (this.decided.has(`${input.runId}:${input.itemRef}`)) {
      return engineFail({
        kind: "bad_request",
        route: GATEWAY_ROUTES.runApprove,
        status: 409,
        message:
          `${input.itemRef} already has a decision. A reviewer changing their mind writes ` +
          "a new one against a new run; overwriting would destroy the label.",
      });
    }
    this.decided.add(`${input.runId}:${input.itemRef}`);
    return engineOk({
      status: "RECORDED",
      decision_id: `mock-${this.decided.size}`,
      run_id: input.runId,
      item_ref: input.itemRef,
      decision: input.verdict,
      reason,
      quoted_span: input.quotedSpan,
      actor_id: "00000000-0000-0000-0000-0000000000a1",
      decided_at: "2026-09-30T10:00:00+00:00",
    });
  }
}
