import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Discovery is by party or case name, never by legal topic (actions.ts, types.ts, mock.ts).
// Regression: the field read "Case name, party, or legal topic" and a topic query got 0 hits.
const files = ["../src/app/app/case-law/case-law-console.tsx", "../src/app/app/case-law/page.tsx"]
  .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"));

test("the case-law screen never offers topic search it cannot run", () => {
  for (const text of files) {
    assert.doesNotMatch(text, /party, or legal topic|or a\s+short legal topic|or oppression and mismanagement/);
  }
  assert.match(files[0], /Search by legal topic is not available yet/);
});
