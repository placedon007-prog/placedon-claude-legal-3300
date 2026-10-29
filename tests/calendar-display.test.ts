import assert from "node:assert/strict";
import { test } from "node:test";
import { countedFrom, datedState } from "../src/lib/calendar-display";
import { calendarSchema } from "../src/lib/gateway/types";

// The gateway's real entry for an overdue AGM (be #141), recorded 2026-10-29.
const LIVE = { as_of: "2026-10-29", horizon_days: 90, unknown: [], due: [{ obligation_id: "CA13-S96-AGM",
  duty: "Hold an annual general meeting, and within the statutory gap", provision: "Companies Act 2013, s.96(1)",
  state: "OVERDUE", due: "2026-09-30", reason: "", missing: [], anchor_label: "financial_year_end", quote: "six months" }] };

test("an overdue entry is labelled OVERDUE, a future one DUE", () => {
  assert.equal(datedState("OVERDUE").word, "OVERDUE");
  assert.equal(datedState("DUE").word, "DUE");
});

test("the interval the gateway sends as `quote` is shown, and an unsent anchor date is not printed as ()", () => {
  // Regression: the console read `interval` and `anchor`, which the gateway never sends,
  // and rendered "from financial_year_end () — supplied by you".
  const parsed = calendarSchema.parse(LIVE);
  assert.equal(countedFrom(parsed.due[0]), "six months from financial_year_end");
  assert.equal(countedFrom({ ...parsed.due[0], anchor: "2026-03-31" }), "six months from financial_year_end (2026-03-31)");
});
