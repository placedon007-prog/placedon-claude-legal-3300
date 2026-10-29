import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseColumnLines } from "../src/lib/table-columns";
import { vaultUploadAction } from "../src/app/app/vault/actions";

test("a malformed column line is named, with the expected format", () => {
  // Regression: "Invalid input: expected string, received undefined".
  const r = parseColumnLines("date|Expiry|When does it expire?\njust some words");
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.message, /^Column line 2 \("just some words"\) needs three parts: kind\|name\|question/);
    assert.doesNotMatch(r.message, /Invalid input|received undefined/);
  }
  const kind = parseColumnLines("number|Fee|What is the fee?");
  assert.ok(!kind.ok && /kind must be one of text, date, amount, yes_no/.test(kind.message));
  const good = parseColumnLines("date|Expiry|When does it expire?\n\namount|Fee|What is the monthly fee?");
  assert.deepEqual(good.ok && good.columns.map((c) => c.name), ["Expiry", "Fee"]);
});

test("an empty file is named as empty, not as 'choose a file'", async () => {
  const keys = ["PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"] as const;
  const saved = keys.map((key) => process.env[key]);
  try {
    process.env.PLACEDON_DEMO_MODE = "true";
    delete process.env.GATEWAY_URL;
    delete process.env.PLACEDON_GATEWAY_KEY;
    const form = new FormData();
    form.set("file", new File([], "empty.pdf", { type: "application/pdf" }));
    const r = await vaultUploadAction({ phase: "idle" }, form);
    assert.equal(r.phase, "invalid");
    if (r.phase === "invalid") assert.equal(r.message, "empty.pdf is empty (0 bytes). Choose a file with content.");
  } finally {
    keys.forEach((key, i) => (saved[i] === undefined ? delete process.env[key] : (process.env[key] = saved[i])));
  }
});

test("Document Check shows the passcode warning only in passcode mode, and the stored name on Inspect", () => {
  const console_ = readFileSync(new URL("../src/app/app/document-check/document-check-console.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/app/document-check/page.tsx", import.meta.url), "utf8");
  assert.match(console_, /sharedPasscode \? " Do not upload client-confidential files/);
  assert.match(page, /sessionKind\(\) === "passcode"/);
  assert.match(console_, /useState<string \| null>\(initialName\)/);
});
