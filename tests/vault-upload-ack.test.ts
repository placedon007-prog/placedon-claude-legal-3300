import assert from "node:assert/strict";
import { test } from "node:test";
import { vaultUploadAction } from "../src/app/app/vault/actions";
import { MockGateway } from "../src/lib/gateway/mock";

test("an acknowledged upload survives a failed follow-up list read", async () => {
  const keys = ["PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"] as const;
  const saved = keys.map((key) => process.env[key]);
  const originalUpload = MockGateway.prototype.vaultUpload;
  const originalStatus = MockGateway.prototype.vaultStatus;
  let writes = 0;
  try {
    process.env.PLACEDON_DEMO_MODE = "true";
    delete process.env.GATEWAY_URL;
    delete process.env.PLACEDON_GATEWAY_KEY;
    MockGateway.prototype.vaultUpload = async () => {
      writes += 1;
      return { ok: true, data: { document_id: "stored-document", sha256: "test-hash", state: "PENDING", name: "fixture.txt" } };
    };
    MockGateway.prototype.vaultStatus = async () => ({ ok: false, error: {
      kind: "transport_error", message: "List unavailable", route: "/v2/vault/status",
    } });
    const form = new FormData();
    form.set("file", new File(["Synthetic test document."], "fixture.txt", { type: "text/plain" }));
    const result = await vaultUploadAction({ phase: "idle" }, form);
    assert.equal(result.phase, "uploaded");
    if (result.phase !== "uploaded") assert.fail("Upload acknowledgement was lost");
    assert.equal(result.documentId, "stored-document");
    assert.equal(result.state, "PENDING");
    assert.equal(result.data, null);
    assert.match(result.listRefreshWarning ?? "", /stored.*list/i);
    assert.equal(writes, 1);
  } finally {
    MockGateway.prototype.vaultUpload = originalUpload;
    MockGateway.prototype.vaultStatus = originalStatus;
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
});
