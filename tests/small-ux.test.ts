import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkColumns } from "../src/lib/table-columns";
import { vaultUploadAction } from "../src/app/app/vault/actions";

test("a question row that cannot be asked is named, in words", () => {
  const r = checkColumns([{ name: "Expiry", kind: "date", question: "When does it expire?" }, { name: "", kind: "text", question: "Which law governs?" }]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.message, "Question 2 needs a column name.");
  const short = checkColumns([{ name: "Fee", kind: "amount", question: "Fee?" }]);
  assert.ok(!short.ok && /Question 1 \("Fee"\) needs a question of at least 5 characters/.test(short.message));
  const dup = checkColumns([{ name: "Fee", kind: "amount", question: "What is the fee?" }, { name: "fee", kind: "text", question: "Who pays the fee?" }]);
  assert.ok(!dup.ok && /both called "fee"/.test(dup.message));
  const good = checkColumns([{ name: "Expiry", kind: "date", question: "When does it expire?" }, { name: "", kind: "text", question: "" }, { name: "Clause", kind: "clause", question: "What does the lock-in clause say?" }]);
  assert.deepEqual(good.ok && good.columns.map((c) => c.kind), ["date", "clause"]);
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
