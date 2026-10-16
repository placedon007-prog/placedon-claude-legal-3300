import test from "node:test";
import assert from "node:assert/strict";
import { suggestsCurrentPublicResearch } from "../src/lib/public-web-intent";

test("current case and dispute questions receive an inline public-web suggestion", () => {
  assert.equal(suggestsCurrentPublicResearch("What is the current status of the Tata Sons and Tata Trusts case?"), true);
  assert.equal(suggestsCurrentPublicResearch("Latest reporting on the Tata Trusts conflict"), true);
});

test("statute and ordinary document questions remain on held-law research", () => {
  assert.equal(suggestsCurrentPublicResearch("What is the current Companies Act position on Section 101?"), false);
  assert.equal(suggestsCurrentPublicResearch("What is current case law on director duties?"), false);
  assert.equal(suggestsCurrentPublicResearch("Explain the voting provision in this document"), false);
  assert.equal(suggestsCurrentPublicResearch("case"), false);
});
