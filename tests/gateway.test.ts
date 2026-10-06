import assert from "node:assert/strict";
import test from "node:test";

import { findingSchema, isLive, isRefusal, parseAnswer } from "../src/lib/gateway/types";
import { MockGateway } from "../src/lib/gateway/mock";
import { mintToken, tokenIsValid, MAX_AGE_SECONDS } from "../src/lib/auth/token";

const SECRET = "a-test-secret-at-least-16";

/* ── the served answer is PARSED, never reconstructed ─────────────────────── */

test("a served answer splits into cited sentences with section and span", () => {
  const prose = `[1 of 4 sentence(s) the model wrote did not trace to admitted evidence and are not part of this summary. They are preserved in full below.]

1. Not more than fifteen months shall elapse between the date of one annual general meeting of a company and that of the next.
   — Companies Act 2013, s.96 [226:348]
2. The first annual general meeting shall be held within a period of nine months from the date of closing of the first financial year of the company.
   — Companies Act 2013, s.96 [409:524]`;
  const parsed = parseAnswer(prose);
  assert.equal(parsed.sentences.length, 2);
  assert.match(parsed.notice ?? "", /did not trace/);
  assert.equal(parsed.sentences[0].section, "96");
  assert.equal(parsed.sentences[0].source, "Companies Act 2013, s.96");
  assert.deepEqual(parsed.sentences[0].span, [226, 348]);
  assert.match(parsed.sentences[0].text, /^Not more than fifteen months/);
  // The claim never carries its own citation inside the sentence text.
  assert.ok(!parsed.sentences[0].text.includes("—"));
});

test("an unfamiliar shape yields NO sentences, and the raw text survives", () => {
  const prose = "The Act says several things, probably.";
  const parsed = parseAnswer(prose);
  assert.equal(parsed.sentences.length, 0);
  assert.equal(parsed.raw, prose);
});

test("a citation the parser cannot read is never half-invented", () => {
  // A block with no `— source` line at all: the whole parse is abandoned rather than
  // emitting a sentence with a guessed section.
  const parsed = parseAnswer("1. A sentence with no basis line.");
  assert.equal(parsed.sentences.length, 0);
  assert.match(parsed.raw, /no basis line/);
});

test("a source without a recognisable section number leaves section null", () => {
  const parsed = parseAnswer("1. Something.\n   — Some Rules, 2014 [1:2]");
  assert.equal(parsed.sentences.length, 1);
  assert.equal(parsed.sentences[0].section, null);
  assert.equal(parsed.sentences[0].source, "Some Rules, 2014");
});

/* ── the mock gateway answers in the shapes the UI narrows on ─────────────── */

test("ask returns a cited answer for a held provision", async () => {
  const r = await new MockGateway().ask("time limit for an annual general meeting");
  assert.ok(r.ok);
  assert.equal(r.data.status, "PARTIAL");
  const parsed = parseAnswer(r.data.answer ?? "");
  assert.equal(parsed.sentences.length, 3);
  assert.equal(parsed.sentences[0].section, "96");
});

test("ask REFUSES by name where the corpus does not hold the law", async () => {
  const r = await new MockGateway().ask("penalties for insider trading under SEBI PIT");
  assert.ok(r.ok);
  assert.equal(r.data.status, "REFUSED");
  assert.equal(r.data.code, "NO_EVIDENCE");
  assert.equal(r.data.answer, "");
});

test("a refusal is ok:true — it is a product answer, not a transport failure", async () => {
  const r = await new MockGateway().ask("insider trading");
  assert.ok(r.ok, "a refusal must not arrive as an engine error");
});

test("a missing run is an engine FAILURE, never an abstention", async () => {
  const r = await new MockGateway().run("missing");
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error.kind, "not_found");
    // An EngineError carries no product class, so it cannot be rendered as abstained.
    assert.ok(!("status" in (r.error as object) && (r.error as { status?: unknown }).status === "REFUSED"));
  }
});

test("review refuses a document not marked as test data", async () => {
  const r = await new MockGateway().reviewContract({ text: "x", testData: false });
  assert.ok(r.ok);
  assert.equal(r.data.findings.length, 0);
});

test("review of a five-year NDA DEVIATES on the term rule", async () => {
  const r = await new MockGateway().reviewContract({
    text: "This Agreement continues for five years from the date above.",
    testData: true,
  });
  assert.ok(r.ok);
  const term = r.data.findings.find((f) => f.rule_id === "NDA-01");
  assert.equal(term?.status, "DEVIATES");
  assert.equal(r.data.playbook_status, "DRAFT");
  assert.equal(r.data.requires_review, true);
  // All four statuses must be reachable, or the table demonstrates nothing.
  const statuses = new Set(r.data.findings.map((f) => f.status));
  for (const s of ["MATCHES", "DEVIATES", "MISSING", "NEEDS_LAWYER"]) {
    assert.ok(statuses.has(s as never), `${s} must be reachable`);
  }
});

test("every finding carries the standard it was judged against", async () => {
  const r = await new MockGateway().reviewContract({
    text: "This Agreement continues for five years from the date above.",
    testData: true,
  });
  assert.ok(r.ok);
  // The column was blank on every live run until the gateway started sending these:
  // a DEVIATES with no standard beside it is a deviation from nothing.
  for (const f of r.data.findings) {
    assert.ok(f.standard_text?.trim(), `${f.rule_id} has no standard_text`);
    assert.ok(f.rationale?.trim(), `${f.rule_id} has no rationale`);
    assert.notEqual(f.standard_text, f.detail, "the standard is not the comparison");
  }
});

test("a finding with no standard still parses, so an older gateway is not a crash", () => {
  const parsed = findingSchema.safeParse({
    rule_id: "NDA-01",
    clause: "Term",
    status: "DEVIATES",
    kind: "POTENTIAL_ISSUE",
    detail: "'five years' (5) against the standard maximum '3 years' (3)",
  });
  assert.equal(parsed.success, true);
  // …and the console renders a sentence saying so rather than an empty cell.
  assert.equal(parsed.success && parsed.data.standard_text, undefined);
});

test("law this corpus does not hold travels WITH the findings", async () => {
  const r = await new MockGateway().reviewContract({ text: "x".repeat(50), testData: true });
  assert.ok(r.ok);
  const bodies = r.data.law_not_held.map((l) => l.body);
  assert.deepEqual(bodies.sort(), ["ARBITRATION1996", "CONTRACT1872", "STAMP"]);
});


/* ── review_document ──────────────────────────────────────────────────────── */

const MINUTES = "Minutes of the 14th Meeting of the Board of Directors. Meeting No: 14. " +
  "The Meeting commenced at 11:00 a.m. and concluded at 12:30 p.m. Chairman signed.";
const NOTICE = "NOTICE OF THE 14th ANNUAL GENERAL MEETING. Notice is hereby given that " +
  "the meeting will be held. An explanatory statement is annexed and a proxy form is " +
  "enclosed.";
const NEITHER = "Dear Sir, please find the cheque enclosed. Kindly acknowledge receipt " +
  "at your earliest convenience. Yours faithfully.";

test("a filing is classified before it is checked", async () => {
  const r = await new MockGateway().reviewDocument({ text: MINUTES });
  assert.ok(r.ok);
  assert.equal(r.data.doc_type, "minutes");
  assert.equal(r.data.status, "ANSWERED");
});

test("NO minutes check fires on a notice", async () => {
  const r = await new MockGateway().reviewDocument({ text: NOTICE });
  assert.ok(r.ok);
  assert.equal(r.data.doc_type, "notice");
  // The failure this classifier exists to stop: minutes checks on a notice produced
  // 80-93% false positives against genuinely compliant filings.
  const defects = r.data.findings.filter((f) => f.status === "DEFECT");
  assert.deepEqual(defects, [], "a notice cannot record what a meeting did");
  const applied = r.data.findings.filter((f) => f.applies);
  assert.ok(applied.length > 0, "the checks that DO apply to a notice still run");
  assert.ok(
    r.data.findings.some((f) => !f.applies),
    "and the rest are marked as not applying, rather than silently passing",
  );
});

test("an unidentified document returns uncertainty, NOT a clean bill", async () => {
  const r = await new MockGateway().reviewDocument({ text: NEITHER });
  assert.ok(r.ok);
  assert.equal(r.data.status, "UNCLASSIFIED");
  assert.equal(r.data.code, "CLASSIFICATION_UNCERTAIN");
  // No findings at all. A page of rows saying nothing is wrong, about a document nobody
  // identified, is the most dangerous screen this could draw.
  assert.deepEqual(r.data.findings, []);
  assert.equal(r.data.defect_count, 0);
  assert.equal(r.data.requires_review, true, "0 defects must not read as a pass");
});

test("every document finding carries a rule id, a source and a quoted span", async () => {
  const r = await new MockGateway().reviewDocument({ text: MINUTES });
  assert.ok(r.ok);
  for (const f of r.data.findings) {
    assert.ok(f.rule_id.trim(), "rule id");
    assert.ok(f.source.trim(), `${f.rule_id} source`);
    assert.ok(f.quoted_span.trim(), `${f.rule_id} quoted span`);
    assert.ok(f.precedent.trim(), `${f.rule_id} precedent`);
  }
});

test("NEEDS_BOOK is flagged for a person and is neither pass nor defect", async () => {
  const r = await new MockGateway().reviewDocument({ text: MINUTES });
  assert.ok(r.ok);
  const gated = r.data.findings.filter((f) => f.needs_human);
  assert.ok(gated.length > 0, "the physical-book checks ask for a person");
  for (const f of gated) assert.equal(f.status, "NEEDS_BOOK");
});

/* ── the human gate ───────────────────────────────────────────────────────── */

const DECISION = {
  runId: "run-1",
  itemRef: "ss:T1.2",
  verdict: "APPROVED" as const,
  reason: "Inspected the book; the Chairman initialled every page.",
  quotedSpan: "physical minutes book not inspected",
};

test("a decision with a real reason is recorded as labelled data", async () => {
  const r = await new MockGateway().decide(DECISION);
  assert.ok(r.ok);
  assert.equal(r.data.decision, "APPROVED");
  // The four things PLAN_23 rule 5 requires: decision, actor, time, and the span.
  assert.equal(r.data.reason, DECISION.reason);
  assert.equal(r.data.quoted_span, DECISION.quotedSpan);
  assert.ok(r.data.actor_id);
  assert.ok(r.data.decided_at);
});

test("a one-word reason is REFUSED, not recorded", async () => {
  const r = await new MockGateway().decide({ ...DECISION, reason: "ok" });
  assert.equal(r.ok, false);
  // A decision with no reason records that somebody clicked, which is the automation bias
  // the gate exists to prevent.
  if (!r.ok) assert.match(r.error.message, /at least 10 characters/);
});

test("a decision with no quoted span is REFUSED", async () => {
  const r = await new MockGateway().decide({ ...DECISION, quotedSpan: "   " });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error.message, /the text the reviewer was looking at/);
});

test("the same item cannot be decided twice", async () => {
  const g = new MockGateway();
  assert.ok((await g.decide(DECISION)).ok);
  const again = await g.decide({ ...DECISION, reason: "I have changed my mind on this." });
  assert.equal(again.ok, false, "overwriting would destroy the label");
});

test("a refused decision is a failure, never a recorded one", async () => {
  const r = await new MockGateway().decide({ ...DECISION, reason: "no" });
  // The whole point of EngineResult: a refusal cannot be read as a stored decision.
  assert.equal(r.ok, false);
});


/* ── the durable executor: polling and cancelling ─────────────────────────── */

test("a run is LIVE only while it is still moving", () => {
  // The poll stops on these, so getting the set wrong is an interval that never ends.
  assert.equal(isLive("PLANNED"), true, "queued but not picked up");
  assert.equal(isLive("RUNNING"), true);
  assert.equal(isLive("AWAITING_HUMAN"), true, "stopped for a person, not finished");
  for (const s of ["ANSWERED", "PARTIAL", "REFUSED", "FAILED"]) {
    assert.equal(isLive(s), false, `${s} is terminal; the page must stop asking`);
  }
});

test("cancelling a live run is accepted, and says what will happen to the trace", async () => {
  const r = await new MockGateway().cancel("run-live");
  assert.ok(r.ok);
  assert.equal(r.data.status, "CANCEL_REQUESTED");
  assert.match(r.data.note ?? "", /next step boundary/);
  // The promise that matters: cancelling does not throw work away.
  assert.match(r.data.note ?? "", /stays in the trace/);
});

test("cancelling twice is REFUSED, never silently re-applied", async () => {
  const g = new MockGateway();
  assert.ok((await g.cancel("run-x")).ok);
  const again = await g.cancel("run-x");
  assert.equal(again.ok, false);
  // The gateway answers "already finished" and "no such run" with ONE message on purpose,
  // so the reply cannot be used to discover which run ids exist.
  if (!again.ok) assert.match(again.error.message, /no job that is still running/);
});

test("a refused cancel is a failure, never a recorded cancellation", async () => {
  const g = new MockGateway();
  await g.cancel("run-y");
  const r = await g.cancel("run-y");
  assert.equal(r.ok, false, "EngineResult keeps a refusal out of the success branch");
});

/* ── UNPRICED is not zero ─────────────────────────────────────────────────── */

test("a trace step with no model reports null cost WITH a reason, never 0", async () => {
  const r = await new MockGateway().trace("any");
  assert.ok(r.ok);
  const intake = r.data.steps.find((s) => s.capability === "intake");
  assert.equal(intake?.cost_inr, null);
  assert.match(intake?.cost_note ?? "", /not a cost of zero/);
});

test("a billed step carries a real rupee cost and its source", async () => {
  const r = await new MockGateway().trace("any");
  assert.ok(r.ok);
  const research = r.data.steps.find((s) => s.provider === "azure");
  assert.ok(research);
  assert.ok((research!.cost_inr ?? 0) > 0, "a billed call must never be 0");
  assert.equal(research!.region, "UAE North");
  assert.match(research!.cost_note ?? "", /prices\.azure\.com/);
});

test("no step anywhere reports a zero cost for a billed provider", async () => {
  const r = await new MockGateway().trace("any");
  assert.ok(r.ok);
  for (const s of r.data.steps) {
    if (s.provider) assert.notEqual(s.cost_inr, 0, `${s.capability} claimed a free billed call`);
  }
});

/* ── the same bytes are the same document ─────────────────────────────────── */

test("uploading identical text twice yields one document id", async () => {
  const g = new MockGateway();
  const a = await g.upload({ text: "MUTUAL NDA" });
  const b = await g.upload({ text: "MUTUAL NDA" });
  assert.ok(a.ok && b.ok);
  assert.equal(a.data.document_id, b.data.document_id);
  assert.equal(a.data.sha256.length, 64);
});

/* ── the session token ────────────────────────────────────────────────────── */

test("a freshly minted token is valid, and a tampered one is not", () => {
  // The issued-at is PINNED. With `mintToken(SECRET)` reading the wall clock, the
  // substituted `Date.now()` below landed in the same millisecond often enough that the
  // "tampered" token was byte-identical to the valid one — and validated, correctly. The
  // test was wrong, not the token: it failed about 4 runs in 6, and a gate that goes red
  // at random is what teaches people to skip it.
  const issuedAt = 1_760_000_000_000;
  const t = mintToken(SECRET, issuedAt);
  assert.ok(tokenIsValid(t, SECRET, issuedAt + 1000));
  const [issued, nonce, mac] = t.split(".");
  assert.ok(!tokenIsValid(`${issued}.${nonce}.${mac.slice(0, -1)}x`, SECRET, issuedAt + 1000));
  assert.ok(!tokenIsValid(`${issuedAt + 60_000}.${nonce}.${mac}`, SECRET, issuedAt + 61_000),
            "issued-at is signed");
  assert.ok(!tokenIsValid(t, "a-different-secret-16ch", issuedAt + 1000));
  assert.ok(!tokenIsValid(undefined, SECRET));
  assert.ok(!tokenIsValid("not-a-token", SECRET));
});

test("a token expires, and one issued in the future is refused", () => {
  const now = Date.now();
  const t = mintToken(SECRET, now);
  assert.ok(tokenIsValid(t, SECRET, now + MAX_AGE_SECONDS * 1000 - 1000));
  assert.ok(!tokenIsValid(t, SECRET, now + MAX_AGE_SECONDS * 1000 + 1000));
  assert.ok(!tokenIsValid(t, SECRET, now - 5000), "a future issued-at is not valid");
});


/* ── document.check: verify → validity → action, recorded ─────────────────── */

const INGESTED = "a".repeat(64); // mutual-nda.txt, seeded INGESTED in the mock vault
const UNREADABLE = "c".repeat(64); // scanned-deed.pdf, seeded CANNOT_READ

test("document.check on a stored document is NEEDS_LAWYER and NOT_DETERMINED by default", async () => {
  const r = await new MockGateway().documentCheck({ documentId: INGESTED, asOf: "2026-10-06" });
  assert.ok(r.ok && !isRefusal(r.data));
  if (r.ok && !isRefusal(r.data)) {
    assert.equal(r.data.action.action, "NEEDS_LAWYER");
    assert.equal(r.data.validity.status, "NOT_DETERMINED");
    assert.equal(r.data.validity.in_force, false);
    // The point of the feature: a check that was NOT run blocks KEEP.
    assert.equal(r.data.verification.overall, "INCOMPLETE_VERIFICATION");
    const notChecked = r.data.verification.checks.filter((c) => c.result === "NOT_CHECKED");
    assert.ok(notChecked.length >= 1, "a real document leaves checks NOT_CHECKED");
    // Append-only: the judgement on this date was written down.
    assert.equal(r.data.recorded, true);
    assert.ok(r.data.check_id);
  }
});

test("a supplied revocation date makes it REVOKED, and the action is REPLACE", async () => {
  const r = await new MockGateway().documentCheck({
    documentId: INGESTED,
    revokedOn: "2026-01-01",
  });
  assert.ok(r.ok && !isRefusal(r.data));
  if (r.ok && !isRefusal(r.data)) {
    assert.equal(r.data.validity.status, "REVOKED");
    assert.equal(r.data.action.action, "REPLACE");
  }
});

test("a supplied superseding instrument makes it SUPERSEDED, and the action is REMOVE", async () => {
  const r = await new MockGateway().documentCheck({
    documentId: INGESTED,
    supersededBy: "Board Resolution dated 2026-04-01",
  });
  assert.ok(r.ok && !isRefusal(r.data));
  if (r.ok && !isRefusal(r.data)) {
    assert.equal(r.data.validity.status, "SUPERSEDED");
    assert.equal(r.data.action.action, "REMOVE");
  }
});

test("document.check on an unknown document REFUSES — ok:true, not a transport failure", async () => {
  const r = await new MockGateway().documentCheck({ documentId: "no-such-doc" });
  assert.ok(r.ok, "a refusal is a product answer, carried as ok:true");
  assert.ok(isRefusal(r.data) && r.data.code === "NOT_FOUND");
});

test("a document whose bytes cannot be read records NO check — the read failed, not the document", async () => {
  const r = await new MockGateway().documentCheck({ documentId: UNREADABLE });
  assert.ok(r.ok && isRefusal(r.data));
  if (r.ok && isRefusal(r.data)) assert.equal(r.data.code, "VERIFY_FAILED");
});
