import assert from "node:assert/strict";
import test from "node:test";
import { webResearchSchema } from "../src/lib/gateway/types";

test("answered public research requires prose and sources", () => {
  for (const result of [
    { status: "ANSWERED" },
    { status: "ANSWERED", answer: "A confident unsupported answer", citations: [] },
    { status: "ANSWERED", answer: "  ", citations: [] },
  ]) assert.equal(webResearchSchema.safeParse(result).success, false);
  assert.equal(webResearchSchema.safeParse({ status: "NO_RESULTS", answer: null, citations: [] }).success, true);
});

test("cited provider summary remains valid without implying verification", () => {
  assert.equal(webResearchSchema.safeParse({ status: "ANSWERED", answer: "A report describes a dispute.",
    citations: [{ title: "Report", url: "https://example.com/report", domain: "example.com",
      published_at: null, author: null, excerpt: "A report describes a dispute." }],
  }).success, true);
});

test("credentialed citation URLs are rejected", () => {
  assert.equal(webResearchSchema.safeParse({ status: "ANSWERED", answer: "Report",
    citations: [{ title: "Report", url: "https://official.example@evil.example/report", domain: "official.example",
      published_at: null, author: null, excerpt: "" }],
  }).success, false);
});
