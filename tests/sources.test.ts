import assert from "node:assert/strict";
import test from "node:test";

import RECORDED from "../src/lib/gateway/fixtures/sources.json" with { type: "json" };
import { sourcesListSchema } from "../src/lib/gateway/types";
import {
  chosenOrDefault,
  defaultSourceIds,
  mentionMatches,
  searchedLines,
  statusLine,
  toggleSource,
  type MentionItem,
} from "../src/lib/sources";

const bodies = sourcesListSchema.parse(RECORDED.sources_list.body).bodies;
const byId = (id: string) => bodies.find((b) => b.id === id)!;

test("the recorded list parses, in register order, ending with documents and web", () => {
  assert.equal(bodies[0].id, "CA2013");
  assert.deepEqual(bodies.slice(-2).map((b) => b.id), ["client_documents", "web"]);
});

test("the default is exactly what the gateway marks default_on", () => {
  assert.deepEqual(defaultSourceIds(bodies), ["CA2013"]);
});

test("a stored choice is kept when valid, and falls back to the default otherwise", () => {
  assert.deepEqual(chosenOrDefault(bodies, ["LLP2008", "CA2013"]), ["CA2013", "LLP2008"]);
  assert.deepEqual(chosenOrDefault(bodies, ["CA2013", "NOT_A_SOURCE"]), ["CA2013"]);
  assert.deepEqual(chosenOrDefault(bodies, "garbage"), ["CA2013"]);
  assert.deepEqual(chosenOrDefault(bodies, []), ["CA2013"]);
  assert.deepEqual(chosenOrDefault(bodies, ["web"]), ["CA2013"], "web cannot be chosen");
});

test("toggling keeps register order and never adds an unselectable source", () => {
  assert.deepEqual(toggleSource(["CA2013"], "LLP2008", bodies), ["CA2013", "LLP2008"]);
  assert.deepEqual(toggleSource(["LLP2008", "CA2013"], "LLP2008", bodies), ["CA2013"]);
  assert.deepEqual(toggleSource(["CA2013"], "web", bodies), ["CA2013"]);
});

test("each source says what choosing it means, in words", () => {
  assert.equal(statusLine(byId("CA2013")), "Held");
  assert.equal(statusLine(byId("SEBI_LODR")), "Current text only");
  assert.equal(statusLine(byId("LLP2008")), "Not held — will be refused, with the reason");
  assert.equal(statusLine(byId("POSH")), "Not held — will be refused, with the reason");
  assert.equal(statusLine(byId("web")), byId("web").reason);
});

test("@ matches the short code first, then a word of the name, then anywhere", () => {
  const items: MentionItem[] = [
    ...bodies.map((b) => ({ kind: "source" as const, id: b.id, short: b.short, label: b.name })),
    { kind: "document", id: "d1", short: "DOC", label: "Board resolution — LLP conversion.pdf" },
  ];
  const ids = (q: string) => mentionMatches(items, q).map((i) => i.id);
  assert.equal(ids("llp")[0], "LLP2008", "short code first");
  assert.ok(ids("llp").includes("d1"), "a document whose name contains it follows");
  assert.equal(ids("companies")[0], "CA2013", "a word of the name");
  assert.equal(ids("").length, items.length, "an empty query lists everything");
  assert.deepEqual(ids("zzzz"), []);
});

test("the searched line reads the envelope; not searched lists the sources left off", () => {
  const env = RECORDED.send_ca_llp.body.envelope;
  const lines = searchedLines(env.searched, bodies);
  assert.equal(
    lines.searched,
    "Searched: Companies Act, 2013 (read) · Limited Liability Partnership Act, 2008 (not held — refused) · as of 2026-10-08",
  );
  assert.match(lines.notSearched!, /^Not searched: SEBI_LODR, SEBI_OTHER, FEMA, /);
  assert.ok(!lines.notSearched!.includes("CA2013") && !lines.notSearched!.includes("LLP,"));
  assert.ok(!lines.notSearched!.includes("WEB"), "web is never searchable, so not 'left off'");
});

test("the default is said to be the default", () => {
  const lines = searchedLines(RECORDED.send_default.body.envelope.searched, bodies);
  assert.equal(lines.searched, "Searched: Companies Act, 2013 (read) · the default · as of 2026-10-08");
});

test("an envelope without `searched` (an older gateway) yields no line", () => {
  assert.deepEqual(searchedLines(undefined, bodies), { searched: null, notSearched: null });
});

import { runTraceSchema } from "../src/lib/gateway/types";
import { modelRegion } from "../src/lib/sources";

test("the hosting region comes from the run's model step, when the gateway gives it", () => {
  const trace = runTraceSchema.parse(RECORDED.trace_default.body);
  assert.equal(modelRegion(trace.steps), "UAE North");
  assert.equal(modelRegion([]), null, "no model step: no region claimed");
  assert.equal(
    modelRegion(trace.steps.map((s) => ({ ...s, region: null }))),
    null,
    "a model step without a region claims none",
  );
});
