import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { askPastDatesEnabled } from "../src/lib/auth/config";
import { STARTER_QUESTIONS } from "../src/lib/starter-questions";

test("past-date answers are hidden unless PLACEDON_ASK_AS_OF is switched on", () => {
  assert.equal(askPastDatesEnabled({}), false);
  assert.equal(askPastDatesEnabled({ PLACEDON_ASK_AS_OF: "0" }), false);
  assert.equal(askPastDatesEnabled({ PLACEDON_ASK_AS_OF: "false" }), false);
  assert.equal(askPastDatesEnabled({ PLACEDON_ASK_AS_OF: "1" }), true);
  assert.equal(askPastDatesEnabled({ PLACEDON_ASK_AS_OF: "true" }), true);
});

test("the Ask page passes the flag, and the composer gets no date chip without it", () => {
  const page = readFileSync(new URL("../src/app/app/page.tsx", import.meta.url), "utf8");
  const ws = readFileSync(new URL("../src/app/app/ask-workspace.tsx", import.meta.url), "utf8");
  assert.match(page, /pastDates = askPastDatesEnabled\(\)/);
  assert.equal((page.match(/pastDates=\{pastDates\}/g) ?? []).length, 3);
  assert.match(ws, /onAsOf=\{pastDates \? setAsOf : undefined\}/);
});

test("starter questions are Indian corporate-law research questions in reader form", () => {
  assert.ok(STARTER_QUESTIONS.length >= 3 && STARTER_QUESTIONS.length <= 4);
  for (const q of STARTER_QUESTIONS) {
    assert.match(q, /Section \d+/, "the UI shows 'Section 96', never 's.96'");
    assert.doesNotMatch(q, /\bs\.\s?\d/);
    assert.ok(q.endsWith("?") && q.length <= 160);
  }
});

test("the empty Ask state offers the starters and a click fills the question box", () => {
  const ws = readFileSync(new URL("../src/app/app/ask-workspace.tsx", import.meta.url), "utf8");
  const empty = ws.slice(ws.indexOf("{empty ? <div"), ws.indexOf(": <>"));
  assert.match(empty, /STARTER_QUESTIONS\.map/);
  assert.match(empty, /composerApi\.current\?\.setText\(q\)/);
});
