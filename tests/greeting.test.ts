import assert from "node:assert/strict";
import test from "node:test";

import { activityAt, cleanName, greeting, persona, recognise, type Activity } from "../src/lib/greeting";

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

const NIGHT = new Date(2026, 9, 7, 1, 30); // Wednesday 1:30 am
const EVENING = new Date(2026, 9, 7, 19, 0); // Wednesday 7 pm
const SATURDAY = new Date(2026, 9, 10, 15, 0);

test("the moment is recognised on the very first visit: midnight makes a Night Wolf", () => {
  const r = recognise([], NIGHT);
  assert.equal(r?.persona, "night-wolf");
  assert.equal(r?.source, "now");
  assert.equal(recognise([], new Date(2026, 9, 7, 6, 15))?.persona, "early-riser");
  assert.equal(recognise([], SATURDAY)?.persona, "weekend-warrior");
  assert.equal(recognise([], EVENING), null, "a weekday evening is nothing special");
});

test("a habit beats the moment, and lasts all day", () => {
  const r = recognise([...asked(6, 1), ...asked(3, 15)], EVENING);
  assert.equal(r?.persona, "night-wolf");
  assert.equal(r?.source, "habit");
  assert.match(r!.reason, /10 pm and 4 am/);
});

test("greetings: nickname alone, name alone, neither", () => {
  const wolf = recognise([], NIGHT);
  assert.deepEqual(greeting({ name: null, recognition: wolf, now: NIGHT }).hello, "Hey Night Wolf,");
  assert.equal(greeting({ name: "Nishant", recognition: null, now: EVENING }).hello, "Evening, Nishant.");
  assert.equal(greeting({ name: null, recognition: null, now: EVENING }).hello, "Evening.");
});

test("with a name AND a nickname, the greeting mixes them across days", () => {
  const seen = new Set<string>();
  for (let d = 1; d <= 20; d++) {
    const at = new Date(2026, 9, d, 1, 0);
    seen.add(greeting({ name: "Nishant", recognition: recognise([], at), now: at }).hello);
  }
  assert.deepEqual([...seen].sort(), ["Hey Night Wolf,", "Hey Nishant,"]);
});

test("after a comma the question continues in lower case", () => {
  const g = greeting({ name: null, recognition: recognise([], NIGHT), now: NIGHT });
  assert.match(g.question, /^[a-z]/);
});

test("the question is stable within a day", () => {
  const a = greeting({ name: null, recognition: null, now: new Date(2026, 9, 7, 9) });
  const b = greeting({ name: null, recognition: null, now: new Date(2026, 9, 7, 16) });
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
