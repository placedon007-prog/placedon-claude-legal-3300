import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig from "../next.config";
import { extractText, MAX_UPLOAD_BYTES } from "../src/lib/documents";

test("a maximum-sized file plus multipart and action metadata fits the framework request budget", async () => {
  const data = new FormData();
  data.set("file", new File([new Uint8Array(MAX_UPLOAD_BYTES)], "document.pdf", { type: "application/pdf" }));
  data.set("name", "document.pdf");
  data.set("$ACTION_1:0", "x".repeat(20 * 1024));
  const bodyBytes = (await new Request("http://localhost/upload", { method: "POST", body: data }).arrayBuffer()).byteLength;
  const limit = nextConfig.experimental?.serverActions?.bodySizeLimit;
  assert.equal(typeof limit, "number");
  assert.ok(bodyBytes > MAX_UPLOAD_BYTES);
  assert.ok(bodyBytes < Number(limit), "the Next parser must not reject an upload accepted by the application");
  assert.ok(Number(limit) <= 12 * 1024 * 1024, "the transport cap remains bounded");
  const oversized = extractText("document.pdf", new Uint8Array(MAX_UPLOAD_BYTES + 1));
  assert.equal(oversized.ok, false, "multipart allowance must not raise the individual file limit");
});
