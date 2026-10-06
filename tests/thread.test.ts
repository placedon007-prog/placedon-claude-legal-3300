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
  assert.equal(statusLabel("failed"), "Did not arrive");
  assert.notEqual(statusLabel("failed"), statusLabel("refused"));
});
