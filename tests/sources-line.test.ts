import assert from "node:assert/strict";
import { test } from "node:test";

test("the sources line under an answer no longer shows the file fingerprint", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/app/app/answer.tsx", import.meta.url), "utf8");
  const sources = src.slice(src.indexOf("function Sources("), src.indexOf("function SourceFingerprints("));
  assert.doesNotMatch(sources.replace(/<SourceFingerprints[^>]*>/, ""), /sha256/, "sha256 lives only under Details");
  assert.match(src, /<summary>Details<\/summary>[\s\S]*sha256 \{g\.citations\[0\]\.sha256\}/);
});
