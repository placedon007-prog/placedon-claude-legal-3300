import assert from "node:assert/strict";
import test from "node:test";

import { parseAnswer } from "../src/lib/gateway/types";
import { groupSources, statusLabel } from "../src/lib/thread";

const PROSE = `1. Not more than fifteen months shall elapse between the date of one annual general meeting of a company and that of the next.
   — Companies Act 2013, s.96 [226:348]
2. The first annual general meeting shall be held within a period of nine months from the date of closing of the first financial year of the company.
   — Companies Act 2013, s.96 [409:524]
3. A company shall hold a minimum number of four meetings of its Board of Directors every year.
   — Companies Act 2013, s.173 [10:90]`;

test("sentences citing the same provision share one numbered source", () => {
  const { sources, refs } = groupSources(parseAnswer(PROSE).sentences);
  assert.equal(sources.length, 2);
  assert.deepEqual(refs, [1, 1, 2]);
  assert.equal(sources[0].source, "Companies Act 2013, s.96");
  assert.equal(sources[0].section, "96");
  assert.deepEqual(sources[0].spans, [[226, 348], [409, 524]]);
  assert.equal(sources[1].n, 2);
});

test("the source label is kept verbatim, never rewritten", () => {
  const { sources } = groupSources(parseAnswer(PROSE).sentences);
  assert.equal(sources[1].source, "Companies Act 2013, s.173");
});

test("no sentences gives no sources", () => {
  const { sources, refs } = groupSources([]);
  assert.equal(sources.length, 0);
  assert.equal(refs.length, 0);
});

test("every state has words, and a failure never reads as a refusal", () => {
  assert.equal(statusLabel("refused"), "Not answered");
  assert.equal(statusLabel("failed"), "Did not arrive — this is not a refusal");
  assert.notEqual(statusLabel("failed"), statusLabel("refused"));
});

/* ── citations from answer_envelope.v1 ──────────────────────────────────── */

import RECORDED from "../src/lib/gateway/fixtures/conversation.json" with { type: "json" };
import { conversationSendOkSchema, type EnvelopeCitation } from "../src/lib/gateway/types";
import { envelopeKind, groupThreads, linkCitations } from "../src/lib/thread";

const live = conversationSendOkSchema.parse(RECORDED.send_answered).envelope!;
const liveSentences = parseAnswer(live.text_blocks[0].text).sentences;

function cit(id: string, provision: string, quote = `quote ${id}`): EnvelopeCitation {
  return {
    id,
    instrument: "Companies Act 2013",
    provision,
    source: "corpus/x.json",
    fetched_at: "2026-08-18",
    sha256: "f".repeat(64),
    quote,
  };
}

test("a recorded live reply links each sentence to its own citation", () => {
  const { groups, refs, active } = linkCitations(liveSentences, live.citations);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].section, "96");
  assert.deepEqual(groups[0].citations.map((c) => c.id), ["c1", "c2"]);
  assert.deepEqual(refs, [1, 1]);
  assert.deepEqual(active, ["c1", "c2"]);
});

test("sentences on two provisions get two numbered sources, in reading order", () => {
  const { groups, refs, active } = linkCitations(parseAnswer(PROSE).sentences, [
    cit("c1", "s.96"),
    cit("c2", "s.96"),
    cit("c3", "s.173"),
  ]);
  assert.deepEqual(groups.map((g) => g.label), ["Companies Act 2013, s.96", "Companies Act 2013, s.173"]);
  assert.deepEqual(refs, [1, 1, 2]);
  assert.deepEqual(active, ["c1", "c2", "c3"]);
});

test("when spans and citations do not pair up, no single quote is claimed", () => {
  // Two spans on s.96 but only one citation survived re-verification: which span it
  // belongs to is unknown, so neither sentence points at it.
  const { refs, active } = linkCitations(parseAnswer(PROSE).sentences, [cit("c1", "s.96"), cit("c3", "s.173")]);
  assert.deepEqual(refs, [1, 1, 2]);
  assert.deepEqual(active, [null, null, "c3"]);
});

test("a sentence whose provision has no citation gets no marker", () => {
  const { refs, groups } = linkCitations(parseAnswer(PROSE).sentences, [cit("c3", "s.173")]);
  assert.deepEqual(refs, [null, null, 1]);
  assert.equal(groups.length, 1);
});

test("the section number comes only from the served provision", () => {
  const { groups } = linkCitations([], [cit("c1", "Schedule I")]);
  assert.equal(groups[0].section, null);
  assert.equal(groups[0].label, "Companies Act 2013, Schedule I");
});

test("envelope FAILED renders as did-not-arrive, never as a refusal", () => {
  assert.equal(envelopeKind("FAILED"), "failed");
  assert.equal(envelopeKind("ABSTAINED"), "refused");
  assert.equal(envelopeKind("NEEDS_LAWYER"), "lawyer");
  assert.equal(statusLabel("failed"), "Did not arrive — this is not a refusal");
});

/* ── this browser's thread list ─────────────────────────────────────────── */

test("threads group into Today and Previous 7 days, newest first, older dropped", () => {
  const now = new Date("2026-10-07T15:00:00+05:30");
  const day = 86_400_000;
  const t = (id: string, msAgo: number) => ({ id, title: id, at: new Date(now.getTime() - msAgo).toISOString() });
  const { today, previous } = groupThreads([t("a", 2 * day), t("b", 60_000), t("c", 30 * day), t("d", 3_600_000)], now);
  assert.deepEqual(today.map((x) => x.id), ["b", "d"]);
  assert.deepEqual(previous.map((x) => x.id), ["a"]);
});

test("malformed stored threads are ignored, not thrown on", () => {
  const { today } = groupThreads([{ id: 1, title: null } as never], new Date());
  assert.equal(today.length, 0);
});

test("every recorded live reply parses against the contract", async () => {
  const { conversationGetOkSchema, citationGetOkSchema } = await import("../src/lib/gateway/types");
  assert.ok(conversationGetOkSchema.safeParse(RECORDED.conversation).success);
  assert.ok(conversationSendOkSchema.safeParse(RECORDED.send_abstained).success);
  for (const c of Object.values(RECORDED.citations)) assert.ok(citationGetOkSchema.safeParse(c).success);
});

/* ── the section around a quote (citation.get `section`) ────────────────── */

import { splitSection } from "../src/lib/thread";

test("a served section splits into before / the quote / after", () => {
  const text = "Heading. Provided that the meeting shall be held. Explanation.";
  const quote = "Provided that the meeting shall be held.";
  const start = text.indexOf(quote);
  assert.deepEqual(splitSection({ text, start, end: start + quote.length }, quote), {
    before: "Heading. ",
    quote,
    after: " Explanation.",
  });
});

test("offsets that do not slice back to the quote mark nothing (fail closed)", () => {
  const text = "Heading. Provided that the meeting shall be held.";
  assert.equal(splitSection({ text, start: 0, end: 8 }, "Provided that"), null);
  assert.equal(splitSection({ text, start: -1, end: 4 }, "Head"), null);
  assert.equal(splitSection(null, "x"), null);
});

import { segmentSection } from "../src/lib/thread";

test("one section, several passages: each marked once, in order, overlaps skipped", () => {
  const text = "aaa BBB ccc DDD eee";
  const segs = segmentSection(text, [
    { id: "c2", start: 12, end: 15 },
    { id: "c1", start: 4, end: 7 },
    { id: "cx", start: 5, end: 9 }, // overlaps c1: skipped
  ]);
  assert.deepEqual(segs.map((s) => (s.kind === "quote" ? `[${s.id}:${s.text}]` : s.text)).join(""),
    "aaa [c1:BBB] ccc [c2:DDD] eee");
  assert.equal(segs.map((s) => s.text).join(""), text, "nothing is lost or added");
});

import { joinWrappedLines } from "../src/lib/thread";

test("hard wraps join; a new sub-section, proviso or footnote keeps its line", () => {
  const held = "within which any annual\ngeneral meeting shall be held:\nProvided that the Registrar\nmay extend.\n(2) Every meeting\nshall be called.\n1[Inserted]";
  assert.equal(
    joinWrappedLines(held),
    "within which any annual general meeting shall be held:\nProvided that the Registrar may extend.\n(2) Every meeting shall be called.\n1[Inserted]",
  );
  assert.equal(joinWrappedLines(held).replace(/\s+/g, ""), held.replace(/\s+/g, ""), "no word changes");
});
