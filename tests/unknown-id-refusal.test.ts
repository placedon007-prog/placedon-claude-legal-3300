import assert from "node:assert/strict";
import { test } from "node:test";
import { tableCancelAction, tableExportAction, tableStatusAction } from "../src/app/app/tables/actions";
import { MockGateway } from "../src/lib/gateway/mock";

const REFUSAL = { status: "REFUSED", code: "NOT_FOUND", detail: "No review table with this id." };

test("a refused grid id is a message, never rendered as table data", async () => {
  // Regression: an unknown grid id crashed the console reading spend.total_inr.
  const keys = ["PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"] as const;
  const saved = keys.map((key) => process.env[key]);
  const proto = MockGateway.prototype as unknown as Record<string, unknown>;
  const originals = ["tableStatus", "tableExport", "tableCancel"].map((name) => [name, proto[name]] as const);
  try {
    process.env.PLACEDON_DEMO_MODE = "true";
    delete process.env.GATEWAY_URL;
    delete process.env.PLACEDON_GATEWAY_KEY;
    for (const [name] of originals) proto[name] = async () => ({ ok: true, data: REFUSAL });
    const form = new FormData();
    form.set("grid_id", "00000000-0000-0000-0000-000000000000");
    for (const action of [tableStatusAction, tableExportAction, tableCancelAction]) {
      const state = await action({ phase: "idle" }, form);
      assert.equal(state.phase, "invalid", action.name);
      if (state.phase === "invalid") assert.match(state.message, /NOT_FOUND: No review table/);
    }
  } finally {
    for (const [name, fn] of originals) proto[name] = fn;
    keys.forEach((key, i) => (saved[i] === undefined ? delete process.env[key] : (process.env[key] = saved[i])));
  }
});
