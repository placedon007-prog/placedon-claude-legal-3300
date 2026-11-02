import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { COLUMN_KINDS, TABLE_TEMPLATES, checkColumns } from "../src/lib/table-columns";
import { readTableList, readTable, tableCreateAction } from "../src/app/app/tables/actions";
import { MockGateway } from "../src/lib/gateway/mock";
import { tableStatusSchema } from "../src/lib/gateway/types";
import { docLabel } from "../src/app/app/tables/table-labels";
import { GATEWAY_ROUTES } from "../src/lib/engine/types";

const ENV = ["PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"] as const;
async function inDemo(run: () => Promise<void>) {
  const saved = ENV.map((key) => process.env[key]);
  try {
    process.env.PLACEDON_DEMO_MODE = "true";
    delete process.env.GATEWAY_URL;
    delete process.env.PLACEDON_GATEWAY_KEY;
    await run();
  } finally {
    ENV.forEach((key, i) => (saved[i] === undefined ? delete process.env[key] : (process.env[key] = saved[i])));
  }
}

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) for (const v of [value].flat()) data.append(key, v);
  return data;
}

test("answer types are the backend's five column kinds, and every template is askable", () => {
  assert.deepEqual([...COLUMN_KINDS], ["text", "date", "amount", "yes_no", "clause"]);
  assert.deepEqual(TABLE_TEMPLATES.map((t) => t.label), ["NDA basics", "Lease basics"]);
  for (const t of TABLE_TEMPLATES) assert.ok(checkColumns(t.columns).ok, t.label);
});

test("create goes straight to the table's own page", async () => {
  await inDemo(async () => {
    const data = form({
      name: "Supplier NDAs",
      document_id: ["a".repeat(64), "b".repeat(64)],
      column_name: ["Governing law", "Mutual"],
      column_kind: ["text", "yes_no"],
      column_question: ["Which law governs this agreement?", "Are the obligations mutual?"],
    });
    const thrown = await tableCreateAction({ phase: "idle" }, data).then(() => null, (e: { digest?: string }) => e);
    assert.match(String(thrown?.digest), /NEXT_REDIRECT;.*;\/app\/tables\/mock-grid-/);
    const list = await readTableList();
    assert.equal(list.kind, "firm");
    if (list.kind === "firm") {
      assert.equal(list.data.tables[0].name, "Supplier NDAs");
      assert.equal(list.data.tables[0].table_state, "RUNNING");
      assert.equal(list.data.tables[0].documents, 2);
      const opened = await readTable(list.data.tables[0].grid_id);
      assert.equal(opened.phase === "status" && opened.data.table_state, "RUNNING");
      // The server keeps each file's name, so reopening the table anywhere still shows it.
      assert.deepEqual(opened.phase === "status" && opened.data.document_names,
        { ["a".repeat(64)]: "mutual-nda.txt", ["b".repeat(64)]: "supply-agreement.pdf" });
    }
  });
});

test("create refuses in words when nothing is ticked or a row is half filled", async () => {
  await inDemo(async () => {
    const none = await tableCreateAction({ phase: "idle" }, form({ name: "T", column_name: "Law", column_kind: "text", column_question: "Which law governs?" }));
    assert.deepEqual(none, { phase: "invalid", message: "Tick at least one ready file." });
    const half = await tableCreateAction({ phase: "idle" }, form({ name: "T", document_id: "a".repeat(64), column_name: "", column_kind: "text", column_question: "Which law governs?" }));
    assert.deepEqual(half, { phase: "invalid", message: "Question 1 needs a column name." });
  });
});

test("a gateway without review_table.list falls back to this browser, and says so", async () => {
  const proto = MockGateway.prototype as unknown as Record<string, unknown>;
  const original = proto.tableList;
  try {
    await inDemo(async () => {
      proto.tableList = async () => ({ ok: false, error: { kind: "not_found", status: 404, route: GATEWAY_ROUTES.tableList, message: "Not Found" } });
      assert.deepEqual(await readTableList(), { kind: "unavailable" });
      proto.tableList = async () => ({ ok: false, error: { kind: "server_error", status: 500, route: GATEWAY_ROUTES.tableList, message: "boom" } });
      assert.equal((await readTableList()).kind, "failed");
    });
  } finally {
    proto.tableList = original;
  }
  const fallback = readFileSync("src/app/app/tables/browser-tables.tsx", "utf8");
  assert.match(fallback, /tables opened in this browser only/);
});

test("no screen asks a person to type a table id", () => {
  assert.equal(GATEWAY_ROUTES.tableList, "/v2/review-table/list");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
  for (const file of walk("src/app/app/tables")) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /Table ID/i, file);
    for (const input of src.match(/<input[^>]*name="grid_id"[^>]*>/g) ?? []) assert.match(input, /type="hidden"/, file);
  }
});

test("a file is labelled by the server's name, then this browser's, then its position", () => {
  const id = "a".repeat(64);
  assert.equal(docLabel(id, 0, { [id]: "lease.pdf" }, { [id]: "old.pdf" }), "lease.pdf");
  assert.equal(docLabel(id, 0, undefined, { [id]: "old.pdf" }), "old.pdf");
  assert.equal(docLabel(id, 0, { [id]: "  " }, { [id]: "old.pdf" }), "old.pdf");
  assert.equal(docLabel(id, 2, {}, {}), "File 3");
});

test("a status from a gateway without document names still parses", () => {
  const base = { grid_id: "g", name: "T", documents: 0, columns: 0, cells: 0, findings: 0, by_state: {},
    cells_detail: [], complete: true, cancelled: false, note: "",
    spend: { total_inr: null, priced_cells: 0, unpriced_cells: 0, pending_cells: 0, is_lower_bound: false, note: "" } };
  assert.equal(tableStatusSchema.safeParse(base).success, true);
  assert.equal(tableStatusSchema.safeParse({ ...base, document_names: { x: "a.pdf" } }).success, true);
});
