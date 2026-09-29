import "../engine/server-guard";
import { engineFail, engineOk, type EngineResult } from "../engine/errors";
import { GATEWAY_ROUTES } from "../engine/types";
import type { GatewayProvider } from "./provider";
import type {
  AskResponse,
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

export class MockGateway implements GatewayProvider {
  readonly name = "mock" as const;

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
          why: "Confidentiality obligations running longer than three years are hard to administer and are usually negotiated down.",
          detail: fiveYears
            ? "'five years' (5) against the standard maximum '3 years' (3)"
            : "'three years' (3) against the standard maximum '3 years' (3)",
        },
        {
          rule_id: "NDA-02",
          clause: "Governing Law",
          status: "MATCHES",
          kind: "POTENTIAL_ISSUE",
          why: "An Indian counterparty agreement governed by foreign law makes enforcement slower and more expensive.",
          detail: "'India' against the accepted list ['India', 'laws of India', …]",
        },
        {
          rule_id: "NDA-04",
          clause: "Definition of Confidential Information",
          status: "MISSING",
          kind: "POTENTIAL_ISSUE",
          why: "An NDA with no definition of what is confidential protects nothing in particular.",
          detail: "the standard expects this clause and none was extracted",
        },
        {
          rule_id: "NDA-08",
          clause: "Non-Compete",
          status: "NEEDS_LAWYER",
          kind: "POTENTIAL_ISSUE",
          why: "A non-compete inside an NDA is out of place and is frequently missed because nobody expects to find one there.",
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
}
