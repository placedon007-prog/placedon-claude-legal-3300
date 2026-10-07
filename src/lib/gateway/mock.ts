import "../engine/server-guard";
import { engineFail, engineOk, type EngineResult } from "../engine/errors";
import { GATEWAY_ROUTES } from "../engine/types";
import type { GatewayProvider } from "./provider";
import RECORDED from "./fixtures/conversation.json" with { type: "json" };
import { citationGetOkSchema, conversationSendOkSchema } from "./types";
import type {
  CitationGet,
  ConversationGet,
  ConversationMessage,
  ConversationSend,
  AskResponse,
  Calendar,
  CancelAck,
  Decision,
  DocumentResponse,
  DraftDiff,
  DraftExport,
  DraftRevise,
  DraftStatus,
  DraftVersion,
  DraftVersions,
  ReviewResponse,
  Run,
  RunTrace,
  TableCancel,
  TableCell,
  TableCreate,
  TableExport,
  TableStatus,
  UploadResponse,
  VaultFind,
  VaultStatus,
  VaultUpload,
  VaultVerify,
  DocumentCheck,
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

/**
 * Conversations this server process has seen. Module-level because `getGateway()` makes a
 * new MockGateway per call; a thread has to outlive one request to be re-opened.
 * ponytail: unbounded and per-process, fine for a demo with no backend; the real store is the gateway's.
 */
const THREADS = new Map<string, ConversationMessage[]>();
// Parsed, not cast: a fixture that drifted from the contract fails here, loudly.
const ANSWERED = conversationSendOkSchema.parse(RECORDED.send_answered);
const ABSTAINED = conversationSendOkSchema.parse(RECORDED.send_abstained);

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

  async conversationSend(input: {
    conversationId?: string;
    text: string;
    taskOverride?: string;
  }): Promise<EngineResult<ConversationSend>> {
    if (input.taskOverride && input.taskOverride !== "RESEARCH_QUESTION") {
      // Only research replies were recorded. Composing a DRAFT or review envelope here
      // would put text on screen that no gateway produced.
      return engineOk({
        status: "REFUSED",
        code: "NOT_RECORDED",
        detail: `The demo gateway has no recorded ${input.taskOverride} reply. Run against the real gateway (docs/RUN_LOCALLY.md) to use this.`,
      });
    }
    // Same rule as ask(): law this corpus does not hold abstains, by name.
    const recorded = /insider|sebi|lodr|data protection|dpdp|arbitration|stamp/i.test(input.text)
      ? ABSTAINED
      : ANSWERED;
    const id = input.conversationId ?? crypto.randomUUID();
    const thread = THREADS.get(id) ?? [];
    const reply: ConversationMessage = {
      message_id: crypto.randomUUID(),
      ordinal: thread.length + 1,
      role: "assistant",
      text: "",
      run_id: recorded.run_id ?? null,
      envelope: recorded.envelope,
    };
    THREADS.set(id, [
      ...thread,
      { message_id: crypto.randomUUID(), ordinal: thread.length, role: "user", text: input.text },
      reply,
    ]);
    return engineOk({ ...recorded, conversation_id: id, message_id: reply.message_id });
  }

  async conversationGet(conversationId: string): Promise<EngineResult<ConversationGet>> {
    const messages = THREADS.get(conversationId);
    if (!messages) {
      return engineOk({
        status: "REFUSED",
        code: "NOT_FOUND",
        detail: `no conversation '${conversationId}' for this tenant`,
      });
    }
    const title = messages[0]?.text.slice(0, 60) ?? "";
    return engineOk({ conversation: { conversation_id: conversationId, title }, messages });
  }

  async citationGet(input: {
    citationId: string;
    conversationId: string;
  }): Promise<EngineResult<CitationGet>> {
    const raw = (RECORDED.citations as Record<string, unknown>)[input.citationId];
    const hit = raw === undefined ? undefined : citationGetOkSchema.parse(raw);
    return engineOk(
      hit ?? {
        status: "REFUSED",
        code: "NOT_FOUND",
        detail: `no citation '${input.citationId}' in conversation '${input.conversationId}'`,
      },
    );
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

  /* ── vault ──────────────────────────────────────────────────────────────── */

  /**
   * Uploaded documents, in memory. Stateful so the file list can show a state PER FILE:
   * a mock that returned one canned document could not demonstrate PENDING beside
   * INGESTED, and "PENDING is not INGESTED" is the whole point of that column.
   */
  private readonly vault = new Map<
    string,
    { name: string; state: string; sha256: string; text: string }
  >([
    [
      "a".repeat(64),
      {
        name: "mutual-nda.txt",
        state: "INGESTED",
        sha256: "a".repeat(64),
        text: "This Agreement shall be governed by the laws of India.",
      },
    ],
    [
      "b".repeat(64),
      {
        name: "supply-agreement.pdf",
        state: "PENDING",
        sha256: "b".repeat(64),
        text: "",
      },
    ],
    [
      "c".repeat(64),
      { name: "scanned-deed.pdf", state: "CANNOT_READ", sha256: "c".repeat(64), text: "" },
    ],
  ]);

  async vaultUpload(input: {
    name: string;
    text: string;
    matterId?: string;
  }): Promise<EngineResult<VaultUpload>> {
    const id = `mock-${this.vault.size}-${"d".repeat(50)}`.slice(0, 64);
    this.vault.set(id, {
      name: input.name,
      // PENDING, not INGESTED. Nothing is searchable until a worker has read it, and a
      // mock that said INGESTED immediately would teach the screen the wrong shape.
      state: "PENDING",
      sha256: id,
      text: input.text,
    });
    return engineOk({
      document_id: id,
      sha256: id,
      name: input.name,
      state: "PENDING",
      queued: true,
      note:
        "Queued for ingestion. PENDING is not INGESTED: nothing in this document is " +
        "searchable until a worker has read it.",
    });
  }

  async vaultStatus(input?: { documentId?: string }): Promise<EngineResult<VaultStatus>> {
    if (input?.documentId) {
      const one = this.vault.get(input.documentId);
      if (!one) {
        return engineOk({
          documents: 0,
          by_state: {},
          deleted: 0,
          unsearchable: 0,
          note: "no such document in this firm's vault",
        });
      }
      return engineOk({
        documents: 1,
        by_state: { [one.state]: 1 },
        deleted: 0,
        unsearchable: one.state === "INGESTED" ? 0 : 1,
        note: `${one.name} is ${one.state}.`,
        document_id: input.documentId,
        name: one.name,
        state: one.state,
      });
    }
    const by: Record<string, number> = {};
    for (const d of this.vault.values()) by[d.state] = (by[d.state] ?? 0) + 1;
    const unsearchable = [...this.vault.values()].filter(
      (d) => d.state !== "INGESTED",
    ).length;
    return engineOk({
      documents: this.vault.size,
      by_state: by,
      deleted: 0,
      unsearchable,
      note:
        `${this.vault.size} document(s). ${unsearchable} cannot be searched — they are ` +
        "PENDING or CANNOT_READ, and a search answers from the rest.",
    });
  }

  async vaultFind(input: {
    query: string;
    limit?: number;
  }): Promise<EngineResult<VaultFind>> {
    const q = input.query.toLowerCase().trim();
    const searchable = [...this.vault.entries()].filter(
      ([, d]) => d.state === "INGESTED",
    );
    const hits = searchable
      .filter(([, d]) => q.length > 2 && d.text.toLowerCase().includes(q.split(" ")[0]))
      .slice(0, input.limit ?? 10)
      .map(([id, d]) => ({
        document_id: id,
        name: d.name,
        score: 1.42,
        quote: d.text,
        matter_id: null,
      }));
    const unsearchable = this.vault.size - searchable.length;
    return engineOk({
      hits,
      searched_documents: searchable.length,
      searched_chunks: searchable.length,
      unsearchable,
      note:
        hits.length > 0
          ? `${hits.length} passage(s) across ${searchable.length} searchable document(s).`
          : `no passage matched. ${unsearchable} document(s) could not be looked at, so ` +
            "this is not 'no document matches'.",
      scope: "tenant",
      scope_note: "searched the whole firm's vault, not one matter.",
    });
  }

  async vaultVerify(input: {
    documentId: string;
  }): Promise<EngineResult<VaultVerify>> {
    const one = this.vault.get(input.documentId);
    if (!one) {
      return engineOk({
        status: "REFUSED" as const,
        code: "NOT_FOUND",
        detail: "no such document in this firm's vault",
      });
    }
    // One line per CHECK. A single real/fake badge would collapse "the bytes are gone"
    // and "the bytes are there and hash to something else", which are different problems
    // with different remedies.
    return engineOk({
      document_id: input.documentId,
      matches: one.state !== "CANNOT_READ",
      stored_sha256: one.sha256,
      computed_sha256:
        one.state === "CANNOT_READ" ? "e".repeat(64) : one.sha256,
      checks: [
        {
          name: "the record exists",
          result: "PASS",
          detail: "a row for this document is in this firm's vault",
        },
        {
          name: "the bytes are present",
          result: one.state === "CANNOT_READ" ? "FAIL" : "PASS",
          detail:
            one.state === "CANNOT_READ"
              ? "the file store has no object under this key"
              : "the file store returned the object",
        },
        {
          name: "the bytes hash to their key",
          result: one.state === "CANNOT_READ" ? "NOT RUN" : "PASS",
          detail:
            one.state === "CANNOT_READ"
              ? "not run: there were no bytes to hash"
              : "sha256 of the stored bytes equals the key they are stored under",
        },
      ],
      note:
        "Each check is reported on its own line. A single badge would make 'the bytes " +
        "are gone' and 'the bytes changed' the same answer.",
    });
  }

  async documentCheck(input: {
    documentId: string;
    asOf?: string;
    renewable?: boolean;
    supersededBy?: string;
    revokedOn?: string;
  }): Promise<EngineResult<DocumentCheck>> {
    const one = this.vault.get(input.documentId);
    if (!one) {
      return engineOk({
        status: "REFUSED" as const,
        code: "NOT_FOUND",
        detail: "no such document in this firm's vault",
      });
    }
    const asOf = input.asOf || new Date().toISOString().slice(0, 10);

    // CANNOT_READ: there is nothing to verify, so no check is run and no judgement is
    // recorded. The backend returns VERIFY_FAILED here, and the point is that it blames
    // the read, not the document.
    if (one.state === "CANNOT_READ") {
      return engineOk({
        status: "REFUSED" as const,
        code: "VERIFY_FAILED",
        detail:
          "the stored bytes could not be read as a signed PDF, so nothing was verified " +
          "and no check was recorded. That is a failure of the read, not a finding about " +
          "the document.",
      });
    }

    // ── verification: one line per check ──────────────────────────────────
    // Two checks need a trust list / a network lookup this deployment does not make, so
    // they are NOT_CHECKED and a genuine document reports INCOMPLETE_VERIFICATION — never
    // COMPLETE — which is the honest state today.
    const checks = [
      { name: "the PDF carries a cryptographic signature", field: "signature",
        result: "PASS", detail: "a signature was parsed from the document" },
      { name: "the signed bytes are unchanged since signing", field: "byte_coverage",
        result: "PASS", detail: "every byte is covered by the signature; nothing was appended" },
      { name: "the signing certificate chains to a trusted root", field: "chain",
        result: "NOT_CHECKED",
        detail: "NOT CHECKED: this deployment holds no CCA trust list to chain against" },
      { name: "the certificate was not revoked", field: "revocation",
        result: "NOT_CHECKED",
        detail: "NOT CHECKED: OCSP and CRL lookups are network calls and this ran offline" },
    ];
    const verification = {
      overall: "INCOMPLETE_VERIFICATION",
      checks,
      sentence:
        "Signed, and the signed bytes are unchanged. The certificate chain and revocation " +
        "were not checked, so verification is INCOMPLETE rather than COMPLETE.",
    };

    // ── validity → action, in the backend's own order (doc_validity.act) ──
    // revoked_on and superseded_by are SUPPLIED facts; everything else is NOT_DETERMINED,
    // because no registry says which document class expires under which provision and this
    // deployment will not take a validity period from a caller.
    let validity;
    let action;
    if (input.revokedOn) {
      validity = {
        status: "REVOKED", as_of: asOf, document_date: null, expires_on: null,
        in_force: false,
        reason: `withdrawn on ${input.revokedOn}, a date you supplied; a renewal cannot bring the authority back`,
        body: null, law_held: null, citation: "", working: "",
      };
      action = {
        action: "REPLACE", renew_by: null,
        reason: "the authority is gone as of the revocation date, so a fresh instrument is needed",
      };
    } else if (input.supersededBy) {
      validity = {
        status: "SUPERSEDED", as_of: asOf, document_date: null, expires_on: null,
        in_force: false,
        reason: `a later instrument of the same kind (${input.supersededBy}) replaced it, which you supplied`,
        body: null, law_held: null, citation: "", working: "",
      };
      action = {
        action: "REMOVE", renew_by: null,
        reason: "remove it from the LIVE set — the archive copy stays; what replaced it is authoritative now",
      };
    } else {
      validity = {
        status: "NOT_DETERMINED", as_of: asOf, document_date: null, expires_on: null,
        in_force: false,
        reason:
          "no held rule says which provision governs this document class's expiry, and a " +
          "validity period supplied by a caller is not a provision, so the position cannot be stated",
        body: null, law_held: null, citation: "", working: "",
      };
      action = {
        action: "NEEDS_LAWYER", renew_by: null,
        reason:
          "the position could not be determined, and two verification checks were not run — " +
          "KEEP would assert we looked and found nothing wrong, and we did not look",
      };
    }

    return engineOk({
      document_id: input.documentId,
      name: one.name,
      as_of: asOf,
      verification,
      validity,
      action,
      // Append-only: the row records what we told them on this date. A check in March and a
      // check in October on the same bytes are two rows, because the answer can change.
      check_id: `mock-check-${this.vault.size}-${input.documentId.slice(0, 8)}`,
      recorded: true,
      note:
        "Three separate questions, answered separately: was it signed, is it still in " +
        "force, and what should be done. An action is never a statement that the document " +
        "is legally valid — NEEDS_LAWYER is the answer whenever a check was not run.",
    });
  }

  /* ── review tables ──────────────────────────────────────────────────────── */

  private readonly tables = new Map<
    string,
    {
      name: string;
      cells: TableCell[];
      cancelled: boolean;
      pausedBudget: boolean;
      pauseReason: string;
      notScheduled: string[];
    }
  >();

  async tableCreate(input: {
    name: string;
    documentIds: readonly string[];
    columns: readonly { name: string; kind: string; question: string }[];
  }): Promise<EngineResult<TableCreate>> {
    const gridId = `mock-grid-${this.tables.size + 1}`;
    const cells: TableCell[] = [];
    for (const d of input.documentIds) {
      for (const c of input.columns) {
        cells.push({
          document_id: d,
          column: c.name,
          state: "PENDING",
          value: "",
          quote: "",
          reason: "queued; this cell has not been run yet",
        });
      }
    }
    // A table over four cells pauses part-way, so the screen can show PAUSED_BUDGET as a
    // STATE with cells either side of it. A mock that never paused would leave that
    // branch undemonstrated and untested.
    const paused = cells.length > 4;
    const dispatched = paused ? 4 : cells.length;
    const notScheduled = paused
      ? cells.slice(dispatched).map((c) => `${gridId}:${c.document_id}:${c.column}`)
      : [];
    this.tables.set(gridId, {
      name: input.name,
      cells,
      cancelled: false,
      pausedBudget: paused,
      pauseReason: paused
        ? "daily cap reached: ₹111.67 spent + ₹4.00 reserved of ₹116.67"
        : "",
      notScheduled,
    });
    return engineOk({
      grid_id: gridId,
      name: input.name,
      cells: cells.length,
      documents: input.documentIds.length,
      columns: input.columns.length,
      scheduled: {
        grid_id: gridId,
        enqueued: cells
          .slice(0, dispatched)
          .map((c) => `${gridId}:${c.document_id}:${c.column}`),
        already_done: [],
        already_queued: [],
        cancelled: false,
        paused_budget: paused,
        pause_reason: paused
          ? "daily cap reached: ₹111.67 spent + ₹4.00 reserved of ₹116.67"
          : "",
        not_scheduled: notScheduled,
        reservations: cells.slice(0, dispatched).map((_, i) => `cell-${i}`),
      },
      cap: 500,
      // null, never 0. No cell has run, so there is no price — and a zero would claim
      // the work was free.
      estimated_cost_inr: null,
      cost_note:
        "UNPRICED: every cell is a separate model call and none has run yet. The ledger " +
        "prices each one as it happens; a figure here would be a guess wearing a " +
        "currency symbol.",
      note: "One run per cell.",
    });
  }

  private tableOr404(gridId: string) {
    return this.tables.get(gridId);
  }

  async tableStatus(input: { gridId: string }): Promise<EngineResult<TableStatus>> {
    const t = this.tableOr404(input.gridId);
    if (!t) {
      return engineFail({
        kind: "not_found",
        route: GATEWAY_ROUTES.tableStatus,
        status: 404,
        message: "No such review table.",
      });
    }
    const by: Record<string, number> = {
      FOUND: 0,
      NOT_FOUND: 0,
      NEEDS_LAWYER: 0,
      PENDING: 0,
      FAILED: 0,
    };
    for (const c of t.cells) by[c.state] = (by[c.state] ?? 0) + 1;
    const findings = by.FOUND + by.NOT_FOUND + by.NEEDS_LAWYER;
    return engineOk({
      grid_id: input.gridId,
      name: t.name,
      documents: new Set(t.cells.map((c) => c.document_id)).size,
      columns: new Set(t.cells.map((c) => c.column)).size,
      cells: t.cells.length,
      findings,
      by_state: by,
      cells_detail: t.cells,
      complete: by.PENDING === 0,
      cancelled: t.cancelled,
      note:
        "FAILED cells did not run and say nothing about the document; PENDING cells have " +
        "not been attempted. Neither is a finding.",
      spend: {
        total_inr: null,
        priced_cells: 0,
        unpriced_cells: 0,
        pending_cells: by.PENDING,
        is_lower_bound: false,
        note:
          `UNPRICED: not one of this table's ${t.cells.length} cells carries a price, so ` +
          "there is no total. A zero here would claim the work was free.",
      },
    });
  }

  async tableExport(input: { gridId: string }): Promise<EngineResult<TableExport>> {
    const t = this.tableOr404(input.gridId);
    if (!t) {
      return engineFail({
        kind: "not_found",
        route: GATEWAY_ROUTES.tableExport,
        status: 404,
        message: "No such review table.",
      });
    }
    const columns = [...new Set(t.cells.map((c) => c.column))];
    const documents = [...new Set(t.cells.map((c) => c.document_id))];
    // Every cell carries WORDS, never a blank: a blank makes "the clause is absent" and
    // "we did not read it" identical. A value a spreadsheet would run as a formula is
    // quoted, which is why the words are chosen to begin with a letter.
    const WORDS: Record<string, string> = {
      FOUND: "FOUND",
      NOT_FOUND: "NOT FOUND",
      NEEDS_LAWYER: "NEEDS LAWYER",
      PENDING: "PENDING",
      FAILED: "COULD NOT RUN",
    };
    const rows = documents.map((d) =>
      [
        d,
        ...columns.map((col) => {
          const cell = t.cells.find((c) => c.document_id === d && c.column === col);
          if (!cell) return "PENDING";
          return cell.state === "FOUND" && cell.value ? cell.value : WORDS[cell.state];
        }),
      ].join(","),
    );
    return engineOk({
      grid_id: input.gridId,
      filename: `${t.name}.csv`,
      content_type: "text/csv",
      csv: [["document", ...columns].join(","), ...rows].join("\n") + "\n",
      complete: t.cells.every((c) => c.state !== "PENDING"),
      cancelled: t.cancelled,
      findings: t.cells.filter((c) =>
        ["FOUND", "NOT_FOUND", "NEEDS_LAWYER"].includes(c.state),
      ).length,
      cells: t.cells.length,
      note:
        "Every cell carries words, never a blank: NOT FOUND, NEEDS LAWYER, PENDING and " +
        "COULD NOT RUN each read differently.",
    });
  }

  async tableCancel(input: { gridId: string }): Promise<EngineResult<TableCancel>> {
    const t = this.tableOr404(input.gridId);
    if (!t) {
      return engineFail({
        kind: "not_found",
        route: GATEWAY_ROUTES.tableCancel,
        status: 404,
        message: "No such review table.",
      });
    }
    t.cancelled = true;
    const pending = t.cells.filter((c) => c.state === "PENDING").length;
    const kept = t.cells.length - pending;
    return engineOk({
      grid_id: input.gridId,
      cancelled: true,
      findings_kept: kept,
      pending_stopped: pending,
      cells: t.cells.length,
      note:
        `${kept} answered cell(s) are KEPT and ${pending} unrun cell(s) stay PENDING. ` +
        "Cancelling stops scheduling; it does not undo work that was done, and it does " +
        "not mark unrun cells as failed.",
    });
  }

  /* ── drafts ─────────────────────────────────────────────────────────────── */

  /** Versions per draft. Stateful, so a stale `base_version` can really lose a race. */
  private readonly drafts = new Map<string, DraftVersion[]>();

  private seedDraft(draftId: string, title: string): DraftVersion[] {
    const v1: DraftVersion = {
      draft_id: draftId,
      version: 1,
      title,
      body: "The Board resolved as follows.",
      created_at: "2026-10-04T09:00:00+00:00",
      slots: [
        {
          name: "meeting_date",
          value: "2026-04-30",
          origin: "SUPPLIED",
          note: "supplied by the caller",
        },
        {
          name: "resolution_text",
          value: "that the annual accounts be adopted",
          // The word the screen marks as a suggestion. It blocks approval until a person
          // accepts it, which is why the drafts screen never shows model prose as settled.
          origin: "MODEL_SUGGESTION",
          note: "written by a model from the source run's findings; not accepted",
        },
      ],
      citations: [],
      ready: false,
      approved: false,
      approved_by: null,
      approved_at: null,
      blocking: ["resolution_text"],
    };
    const list = [v1];
    this.drafts.set(draftId, list);
    return list;
  }

  private statusOf(draftId: string, list: DraftVersion[]): DraftStatus {
    const latest = list[list.length - 1];
    return {
      draft_id: draftId,
      title: latest.title,
      kind: "board_resolution",
      versions: list.length,
      version: latest.version,
      ready_for_approval: latest.ready,
      requires_review: !latest.ready,
      blocking: latest.blocking,
      approved: latest.approved,
      approved_by: latest.approved_by,
      note: "Every save is a new version; nothing is edited in place.",
    };
  }

  async draftCreate(input: {
    title: string;
    body?: string;
    kind?: string;
  }): Promise<EngineResult<DraftStatus>> {
    const id = `mock-draft-${this.drafts.size + 1}`;
    const list = this.seedDraft(id, input.title);
    if (input.body !== undefined) list[0].body = input.body;
    return engineOk(this.statusOf(id, list));
  }

  async draftRevise(input: {
    draftId: string;
    baseVersion: number;
    title?: string;
    body?: string;
    approvedBy?: string;
  }): Promise<EngineResult<DraftRevise>> {
    const list = this.drafts.get(input.draftId) ?? this.seedDraft(input.draftId, "Draft");
    const latest = list[list.length - 1];
    // A1's optimistic lock, mirrored: a base that is not the latest is REFUSED with both
    // versions. HTTP 200 with status REFUSED — a product state, not a transport failure.
    if (input.baseVersion !== latest.version) {
      return engineOk({
        status: "REFUSED" as const,
        code: "CONFLICT" as const,
        detail:
          `this revision was based on version ${input.baseVersion}, but the draft is now ` +
          `at version ${latest.version}. Another save got there first. Re-read version ` +
          `${latest.version} and revise from it — nothing has been overwritten and ` +
          "nothing has been merged",
        draft_id: input.draftId,
        base_version: input.baseVersion,
        latest_version: latest.version,
      });
    }
    const accepted = Boolean(input.approvedBy);
    const next: DraftVersion = {
      ...latest,
      version: latest.version + 1,
      title: input.title ?? latest.title,
      body: input.body ?? latest.body,
      created_at: "2026-10-04T10:00:00+00:00",
      // Approving accepts the model's slot, which is what clears the block. A revise that
      // does not approve leaves it blocking, because nobody has read it.
      slots: accepted
        ? latest.slots.map((sl) =>
            sl.origin === "MODEL_SUGGESTION"
              ? { ...sl, origin: "SUPPLIED", note: "accepted by a reviewer" }
              : sl,
          )
        : latest.slots,
      ready: accepted,
      approved: accepted,
      approved_by: input.approvedBy ?? null,
      approved_at: accepted ? "2026-10-04T10:00:00+00:00" : null,
      blocking: accepted ? [] : latest.blocking,
    };
    list.push(next);
    return engineOk(this.statusOf(input.draftId, list));
  }

  async draftVersions(input: {
    draftId: string;
  }): Promise<EngineResult<DraftVersions>> {
    const list = this.drafts.get(input.draftId) ?? this.seedDraft(input.draftId, "Draft");
    return engineOk({
      draft_id: input.draftId,
      title: list[list.length - 1].title,
      versions: list,
    });
  }

  async draftDiff(input: {
    draftId: string;
    fromVersion?: number;
    toVersion?: number;
  }): Promise<EngineResult<DraftDiff>> {
    const list = this.drafts.get(input.draftId) ?? this.seedDraft(input.draftId, "Draft");
    const from = list.find((v) => v.version === (input.fromVersion ?? 1)) ?? list[0];
    const to =
      list.find((v) => v.version === (input.toVersion ?? list.length)) ??
      list[list.length - 1];
    const changed = from.body !== to.body;
    return engineOk({
      draft_id: input.draftId,
      from_version: from.version,
      to_version: to.version,
      text: changed
        ? [`--- v${from.version}`, `+++ v${to.version}`, "@@ -1 +1 @@", `-${from.body}`, `+${to.body}`]
        : [],
      text_changed: changed,
      slots: { added: [], removed: [], retyped: [], revalued: [] },
      newly_blocking: [],
      newly_supported:
        from.blocking.length > to.blocking.length ? from.blocking : [],
      ready_changed: from.ready !== to.ready,
      note:
        "`newly_blocking` is the change a text diff cannot show: a sentence whose words " +
        "are identical and whose support is gone.",
    });
  }

  async draftExport(input: {
    draftId: string;
    version?: number;
    format?: "text" | "docx";
  }): Promise<EngineResult<DraftExport>> {
    const list = this.drafts.get(input.draftId) ?? this.seedDraft(input.draftId, "Draft");
    const v =
      list.find((x) => x.version === (input.version ?? list.length)) ??
      list[list.length - 1];
    const warning = v.ready
      ? ""
      : "\n\nNOT APPROVABLE: " + v.blocking.join(", ") + " still needs a person.";
    return engineOk({
      draft_id: input.draftId,
      version: v.version,
      format: input.format ?? "text",
      filename: `${v.title.replace(/\s+/g, "-")}-v${v.version}.${input.format === "docx" ? "docx" : "txt"}`,
      ready_for_approval: v.ready,
      approved: v.approved,
      note:
        "An exported draft that is not approvable says so on its own face, because the " +
        "file travels away from this system.",
      text: `${v.title}\n${"=".repeat(v.title.length)}\n\n${v.body}${warning}`,
    });
  }

  /* ── calendar ───────────────────────────────────────────────────────────── */

  async calendarUpcoming(input: {
    company: Record<string, unknown>;
    anchors?: Record<string, string>;
    intervals?: Record<string, string>;
    asOf?: string;
    horizonDays?: number;
  }): Promise<EngineResult<Calendar>> {
    const asOf = input.asOf ?? "2026-10-04";
    const hasFyClose = Boolean(input.anchors?.financial_year_end);
    return engineOk({
      as_of: asOf,
      horizon_days: input.horizonDays ?? 90,
      // A date appears ONLY when the fact it is derived from was supplied.
      due: hasFyClose
        ? [
            {
              obligation_id: "CA13-S96-AGM",
              duty: "Hold the annual general meeting",
              provision: "Companies Act 2013, s.96(1)",
              state: "DUE",
              due: "2026-12-31",
              reason: "six months from the close of the financial year",
              anchor: input.anchors?.financial_year_end ?? null,
              anchor_label: "financial_year_end",
              interval: "six months",
              days_away: 88,
            },
          ]
        : [],
      // An UNKNOWN entry carries `due: null` and NAMES the missing fact. The screen shows
      // "unknown" and the fact; a guessed date is the one output this must never produce.
      unknown: [
        {
          obligation_id: "CA13-S135-CSR",
          duty: "Constitute a CSR committee, if the company crosses a CSR threshold",
          provision: "Companies Act 2013, s.135(1)",
          state: "UNKNOWN",
          due: null,
          reason:
            "missing_fact: the obligation itself is CANNOT_DETERMINE for want of a fact, " +
            "so a date would be a date for a duty we cannot say applies",
          missing: ["net_profit", "turnover"],
        },
        ...(hasFyClose
          ? []
          : [
              {
                obligation_id: "CA13-S96-AGM",
                duty: "Hold the annual general meeting",
                provision: "Companies Act 2013, s.96(1)",
                state: "UNKNOWN" as const,
                due: null,
                reason:
                  "missing_fact: the interval runs from the close of the financial year, " +
                  "and that date was not supplied",
                missing: ["financial_year_end"],
              },
            ]),
      ],
      note:
        "An entry with a missing fact is UNKNOWN and names the fact. No date here is " +
        "derived from anything that was not supplied.",
    });
  }
}
