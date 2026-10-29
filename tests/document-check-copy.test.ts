import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// doc_validity.decide dates a document only from a held validity rule (or a supplied
// revocation): a period stated in the document is not used. Regression: the help text
// promised "valid in March is expired in October", which no document on the harness did.
const text = readFileSync(new URL("../src/app/app/document-check/document-check-console.tsx", import.meta.url), "utf8");

test("the as-of help says when the date changes the answer, not that it always does", () => {
  assert.doesNotMatch(text, /valid in March is expired in October|same bytes give a\s+different answer/);
  assert.match(text, /changes the result when you enter a\s+revocation date/);
  assert.match(text, /NOT DETERMINED whatever date you choose/);
});
