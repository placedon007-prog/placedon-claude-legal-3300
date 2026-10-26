import assert from "node:assert/strict";
import test from "node:test";
import { draftSlotSchema, draftVersionSchema } from "../src/lib/gateway/types";

test("draft provenance retains the backend type and evidence fields", () => {
  const slot = { name: "duty", type: "SOURCE_QUOTE", value: "Quoted text",
    source: "section 174", working: "", note: "Inspect the original" };
  assert.deepEqual(draftSlotSchema.parse(slot), slot);
});

test("review checklist survives parsing and legacy versions remain compatible", () => {
  const version = { draft_id: "test", version: 1, title: "Note", body: "",
    created_at: "2026-10-23T00:00:00Z", slots: [], citations: [], ready: false,
    approved: false, approved_by: null, approved_at: null, blocking: ["_draft_body"] };
  assert.equal(draftVersionSchema.parse(version).review_items, undefined);
  const review_items = [{ code: "REVIEW_REQUIRED", field: "_draft_body", message: "Add draft text." }];
  assert.deepEqual(draftVersionSchema.parse({ ...version, review_items }).review_items, review_items);
});
