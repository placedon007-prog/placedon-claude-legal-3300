import assert from "node:assert/strict";
import test from "node:test";

import { findingSchema, parseAnswer } from "../src/lib/gateway/types";
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
  const t = mintToken(SECRET);
  assert.ok(tokenIsValid(t, SECRET));
  const [issued, nonce, mac] = t.split(".");
  assert.ok(!tokenIsValid(`${issued}.${nonce}.${mac.slice(0, -1)}x`, SECRET));
  assert.ok(!tokenIsValid(`${Date.now()}.${nonce}.${mac}`, SECRET), "issued-at is signed");
  assert.ok(!tokenIsValid(t, "a-different-secret-16ch"));
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
