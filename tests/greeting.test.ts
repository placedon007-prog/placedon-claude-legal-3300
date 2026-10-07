import assert from "node:assert/strict";
import test from "node:test";

import { activityAt, cleanName, greeting, persona, type Activity } from "../src/lib/greeting";

/** n questions at hour h, spread over `days` distinct days in October 2026. */
function asked(n: number, h: number, days = 4, w = 3): Activity[] {
  return Array.from({ length: n }, (_, i) => ({ d: `2026-10-${String(1 + (i % days)).padStart(2, "0")}`, h, w }));
}

test("a midnight habit earns Night Wolf", () => {
  assert.equal(persona([...asked(6, 1), ...asked(3, 15)]), "night-wolf");
});

test("no nickname before the pattern is real: too few questions, or too few days", () => {
  assert.equal(persona(asked(7, 1)), null);
  assert.equal(persona(asked(12, 1, 2)), null);
});

test("early mornings and weekends earn their own; a mixed pattern earns none", () => {
  assert.equal(persona(asked(9, 6)), "early-riser");
  assert.equal(persona([...asked(5, 14, 4, 6), ...asked(4, 14, 4, 0)]), "weekend-warrior");
  assert.equal(persona([...asked(4, 1), ...asked(4, 6), ...asked(4, 14)]), null);
});

test("the greeting uses the nickname, then the name, then just the time", () => {
  const night = new Date(2026, 9, 7, 1, 30);
  const evening = new Date(2026, 9, 7, 19, 0);
  assert.equal(greeting({ name: "Nishant", persona: "night-wolf", now: night }).hello, "Hey Night Wolf,");
  assert.equal(greeting({ name: "Nishant", persona: null, now: evening }).hello, "Evening, Nishant.");
  assert.equal(greeting({ name: null, persona: null, now: evening }).hello, "Evening.");
  assert.equal(greeting({ name: null, persona: null, now: night }).hello, "Burning the midnight oil.");
});

test("the question is stable within a day", () => {
  const a = greeting({ name: null, persona: null, now: new Date(2026, 9, 7, 9) });
  const b = greeting({ name: null, persona: null, now: new Date(2026, 9, 7, 16) });
  assert.equal(a.question, b.question);
});

test("a name is cleaned, and anything that is not a name is refused", () => {
  assert.equal(cleanName("  Nishant   Singh "), "Nishant Singh");
  assert.equal(cleanName("<script>"), null);
  assert.equal(cleanName(""), null);
  assert.equal(cleanName("x".repeat(60))?.length, 40);
});

test("activity keeps only day, hour and weekday", () => {
  assert.deepEqual(Object.keys(activityAt(new Date(2026, 9, 7, 23, 5))).sort(), ["d", "h", "w"]);
});
