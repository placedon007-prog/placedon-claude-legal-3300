import assert from "node:assert/strict";
import test from "node:test";
import { MockGateway } from "../src/lib/gateway/mock";
import { citationGetOkSchema, turnMetadataSchema } from "../src/lib/gateway/types";
import { formatLawDate, lawAsOfDetail, LAW_DATE_MIN, indiaToday, pastLawDate } from "../src/lib/law-as-of";

const AGM = "What is the time limit for holding an annual general meeting?";

test("only a valid past date from 1 April 2014 is sent; today or nothing means current law", () => {
  const today = "2026-11-01";
  assert.equal(pastLawDate("2022-03-12", today), "2022-03-12");
  assert.equal(pastLawDate(LAW_DATE_MIN, today), "2014-04-01");
  assert.equal(pastLawDate(today, today), undefined);
  assert.equal(pastLawDate("2026-11-02", today), undefined);
  assert.equal(pastLawDate("2014-03-31", today), undefined);
  assert.equal(pastLawDate("2022-02-30", today), undefined);
  assert.equal(pastLawDate("", today), undefined);
  assert.equal(pastLawDate(null, today), undefined);
});

test("dates read the way a lawyer writes them", () => {
  assert.equal(formatLawDate("2022-03-12"), "12 March 2022");
  assert.equal(formatLawDate("2014-04-01"), "1 April 2014");
  // 23:30 IST on 1 Nov is 18:00 UTC; 00:30 IST on 2 Nov is still 1 Nov in UTC.
  assert.equal(indiaToday(new Date("2026-11-01T18:00:00Z")), "2026-11-01");
  assert.equal(indiaToday(new Date("2026-11-01T19:00:00Z")), "2026-11-02");
});

test("near midnight IST, yesterday in India is a past date even while UTC is still on it", () => {
  const justAfterMidnightIst = new Date("2026-11-01T19:00:00Z"); // 00:30 IST, 2 Nov
  const today = indiaToday(justAfterMidnightIst);
  assert.equal(pastLawDate("2026-11-01", today), "2026-11-01", "1 Nov is sent as a past date");
  assert.equal(pastLawDate("2026-11-02", today), undefined, "2 Nov is today in India: current law");
});

test("the backend's dated block loses only the sentence the banner already shows", () => {
  assert.equal(lawAsOfDetail("Law as it stood on 1 January 2019."), "");
  assert.equal(
    lawAsOfDetail("Law as it stood on 1 January 2017. Wording that has since changed was rebuilt from India Code's amendment notes."),
    "Wording that has since changed was rebuilt from India Code's amendment notes.",
  );
  assert.equal(lawAsOfDetail("The quorum is two directors."), null);
});

test("turn metadata and citation reads accept the backend's law_as_of", () => {
  const meta = turnMetadataSchema.parse({ schema: "conversation_turn.v1", law_as_of: { date: "2017-01-01", rebuilt: true,
    sections: [{ provision: "s.149", fidelity: "PARTIAL", rebuilt: true, unknown: ["Subs. by Act 1 of 2018 for sub-section (3)"], note: "" }] } });
  assert.equal(meta.law_as_of?.sections[0].fidelity, "PARTIAL");
  const read = citationGetOkSchema.parse({ citation: { id: "c1", instrument: "Companies Act 2013", provision: "s.173", source: "corpus/x.json",
    fetched_at: "2026-08-01", sha256: "a".repeat(64), quote: "q" }, message_id: "m", reverified: true, reverified_note: "ok",
    law_as_of: { date: "2017-01-01", rebuilt: true } });
  assert.equal(read.law_as_of?.rebuilt, true);
  assert.equal(turnMetadataSchema.parse({ schema: "conversation_turn.v1" }).law_as_of, undefined, "older replies carry none");
});

test("demo: a past date before the recording's last amendment is refused as switched off", async () => {
  const r = await new MockGateway().conversationSend({ text: AGM, asOf: "2017-01-01" });
  assert.ok(r.ok);
  assert.deepEqual(r.data, { status: "REFUSED", code: "AS_OF_UNSUPPORTED", detail: "This conversation reads current law only. Ask without as_of." });
  const other = await new MockGateway().conversationSend({ text: "What is the quorum for a board meeting?", asOf: "2022-03-12" });
  assert.ok(other.ok && "code" in other.data && other.data.code === "AS_OF_UNSUPPORTED");
});

test("demo: the recorded Section 96 answer is served for a date after its last amendment, dated, and its source says so", async () => {
  const gateway = new MockGateway();
  const r = await gateway.conversationSend({ text: AGM, asOf: "2022-03-12" });
  assert.ok(r.ok && "envelope" in r.data && r.data.envelope);
  assert.equal(r.data.envelope.as_of, "2022-03-12");
  assert.equal(r.data.metadata?.law_as_of?.date, "2022-03-12");
  assert.equal(r.data.envelope.text_blocks[1]?.text, "Law as it stood on 12 March 2022.");
  const cite = r.data.envelope.citations[0];
  const read = await gateway.citationGet({ citationId: cite.id, conversationId: r.data.conversation_id });
  assert.ok(read.ok && "reverified" in read.data);
  assert.deepEqual(read.data.law_as_of, { date: "2022-03-12", rebuilt: false });
  const today = await gateway.conversationSend({ text: AGM });
  assert.ok(today.ok && "envelope" in today.data);
  assert.equal(today.data.metadata?.law_as_of, undefined, "today's law carries no past date");
});

test("the gateway client sends as_of only when given a date", async () => {
  const { HttpGateway } = await import("../src/lib/gateway/http");
  const original = globalThis.fetch;
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Response.json({ status: "REFUSED", code: "AS_OF_UNSUPPORTED", detail: "This conversation reads current law only. Ask without as_of." });
  };
  try {
    const gw = new HttpGateway("http://localhost:8021", "fixture-key");
    await gw.conversationSend({ text: "What is the quorum?", requestId: "asof-test-0001", asOf: "2022-03-12" });
    await gw.conversationSend({ text: "What is the quorum?", requestId: "asof-test-0002" });
  } finally { globalThis.fetch = original; }
  assert.equal(bodies[0].as_of, "2022-03-12");
  assert.equal("as_of" in bodies[1], false);
});
