import assert from "node:assert/strict";
import test from "node:test";

import { sourcesSearchSchema } from "../src/lib/gateway/types";
import { toCaseLawRenderModel } from "../src/lib/case-law";
import { HttpGateway } from "../src/lib/gateway/http";

const VALID = {
  query: "Tata Consultancy Services v. Cyrus Investments",
  results: [],
  verified_count: 0,
  judgments: [
    {
      source_id: "aws_sc_judgments",
      title: "Tata Consultancy Services Limited v. Cyrus Investments Pvt. Ltd. & Ors.",
      parties: ["Tata Consultancy Services Limited", "Cyrus Investments Pvt. Ltd."],
      year: 2021,
      date: "2021-03-26",
      court: "Supreme Court of India",
      s3_key: "aws_sc_judgments/2021/tata-consultancy-services-v-cyrus-investments.pdf",
      tier: "LICENSED",
    },
  ],
  not_searched: [{ source_id: "aws_hc_judgments", detail: "High Court judgments were not searched." }],
  note: "Case-law discovery is by party or case name, not legal topic.",
};

test("sourcesSearchSchema parses the contract, including a judgments entry", () => {
  const parsed = sourcesSearchSchema.parse(VALID);
  assert.equal(parsed.judgments.length, 1);
  assert.equal(parsed.judgments[0].tier, "LICENSED");
  assert.equal(parsed.judgments[0].source_id, "aws_sc_judgments");
  assert.equal(parsed.verified_count, 0);
  assert.equal(parsed.not_searched[0].source_id, "aws_hc_judgments");
});

test("sourcesSearchSchema rejects a broken contract", () => {
  // Missing `tier`, and `source_id` outside the two known judgment buckets.
  const broken = {
    ...VALID,
    judgments: [{ ...VALID.judgments[0], source_id: "wikipedia", tier: undefined }],
  };
  assert.throws(() => sourcesSearchSchema.parse(broken));
  // Also rejects a reply missing `not_searched` entirely.
  const withoutNotSearched: Partial<typeof VALID> = { ...VALID };
  delete withoutNotSearched.not_searched;
  assert.throws(() => sourcesSearchSchema.parse(withoutNotSearched));
});

test("the render model surfaces the Tata/Cyrus judgment as LICENSED supporting authority, with an open target and no quote", () => {
  const search = sourcesSearchSchema.parse(VALID);
  const model = toCaseLawRenderModel(search);
  assert.equal(model.supportingOnly, true);
  assert.equal(model.hits.length, 1);
  const hit = model.hits[0];
  assert.match(hit.title, /Tata Consultancy Services.*Cyrus Investments/);
  assert.equal(hit.tier, "LICENSED");
  assert.equal(hit.quote, null, "discovery never carries a quote");
  assert.equal(hit.openTarget, VALID.judgments[0].s3_key, "the open target is the judgment's stored key");
  assert.ok(hit.id.includes("aws_sc_judgments"), "the hit id carries its source");
  assert.equal(model.notSearched[0].sourceId, "aws_hc_judgments");
});

test("an empty judgments list still renders — a found result, not a failure", () => {
  const search = sourcesSearchSchema.parse({ ...VALID, judgments: [] });
  const model = toCaseLawRenderModel(search);
  assert.deepEqual(model.hits, []);
});

test("a transport failure maps to a failure state, never an abstention", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("socket closed");
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").sourcesSearch({
      query: "Tata",
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("a dropped connection cannot be an answer");
    // `EngineError` carries no obligation, provision or product class — there is no field
    // here that could be mistaken for a verified abstention.
    assert.equal(result.error.kind, "transport_error");
    assert.equal(result.error.route, "/v2/sources/search");
    assert.ok(!("judgments" in result.error), "a transport failure carries no case-law data");
  } finally {
    globalThis.fetch = original;
  }
});
