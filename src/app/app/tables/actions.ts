"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { COLUMN_KINDS, checkColumns } from "@/lib/table-columns";
import { isRefusal } from "@/lib/gateway/types";
import type { TableCancel, TableExport, TableList, TableStatus } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";

/**
 * Review tables. Create goes straight to the table's own page (`/app/tables/[id]`), so a
 * person never copies an id; export and stop are buttons on that page.
 */
export type TableState =
  | { readonly phase: "idle" }
  | { readonly phase: "status"; readonly data: TableStatus }
  | { readonly phase: "exported"; readonly data: TableExport }
  | { readonly phase: "cancelled"; readonly data: TableCancel }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

export type TableListResult =
  | { readonly kind: "firm"; readonly data: TableList }
  /** The gateway has no `review_table.list` yet (404): the page falls back to this browser. */
  | { readonly kind: "unavailable" }
  | { readonly kind: "failed"; readonly error: EngineError };

const createSchema = z.object({
  name: z.string().trim().min(1, "Give the table a name.").max(120, "Use a name of at most 120 characters."),
  documentIds: z
    .array(z.string().trim().regex(/^[0-9a-f]{64}$/, "One of the ticked files cannot be used. Untick it and try again."))
    .min(1, "Tick at least one ready file.")
    .max(20, "Tick at most 20 files."),
  columns: z
    .array(z.object({ name: z.string().trim().min(1), kind: z.enum(COLUMN_KINDS), question: z.string().trim().min(5) }))
    .min(1, "Add at least one question."),
});

const GRID_ID = /^[A-Za-z0-9-]{1,100}$/;

function strings(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v ?? ""));
}

export async function tableCreateAction(_prev: TableState, formData: FormData): Promise<TableState> {
  const names = strings(formData, "column_name");
  const kinds = strings(formData, "column_kind");
  const questions = strings(formData, "column_question");
  const rows = names.map((name, i) => ({ name, kind: kinds[i] ?? "", question: questions[i] ?? "" }));
  const columnCheck = checkColumns(rows);
  if (!columnCheck.ok) return { phase: "invalid", message: columnCheck.message };
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    documentIds: [...new Set(strings(formData, "document_id").map((d) => d.trim()).filter(Boolean))],
    columns: columnCheck.columns,
  });
  if (!parsed.success) return { phase: "invalid", message: parsed.error.issues[0].message };
  const gateway = await getGateway();
  const result = await gateway.tableCreate(parsed.data);
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) return { phase: "invalid", message: result.data.detail };
  redirect(`/app/tables/${encodeURIComponent(result.data.grid_id)}`);
}

/** One table, for its page. */
export async function readTable(gridId: string): Promise<TableState> {
  if (!GRID_ID.test(gridId)) return { phase: "invalid", message: "This link does not name a review table." };
  const result = await (await getGateway()).tableStatus({ gridId });
  if (!result.ok) return { phase: "failed", error: result.error };
  // An unknown grid id is a refusal parsed as data; shown as data it crashed the console.
  if (isRefusal(result.data)) return { phase: "invalid", message: result.data.detail };
  return { phase: "status", data: result.data };
}

/** The firm's tables, or `unavailable` when this gateway predates `review_table.list`. */
export async function readTableList(cursor?: string): Promise<TableListResult> {
  const result = await (await getGateway()).tableList({ ...(cursor ? { cursor } : {}), limit: 20 });
  if (result.ok) return { kind: "firm", data: result.data };
  if (result.error.kind === "not_found") return { kind: "unavailable" };
  return { kind: "failed", error: result.error };
}

function gridFrom(formData: FormData): string | null {
  const id = String(formData.get("grid_id") ?? "").trim();
  return GRID_ID.test(id) ? id : null;
}

export async function tableExportAction(_prev: TableState, formData: FormData): Promise<TableState> {
  const gridId = gridFrom(formData);
  if (!gridId) return { phase: "invalid", message: "This page does not name a review table." };
  const result = await (await getGateway()).tableExport({ gridId });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) return { phase: "invalid", message: result.data.detail };
  return { phase: "exported", data: result.data };
}

export async function tableCancelAction(_prev: TableState, formData: FormData): Promise<TableState> {
  const gridId = gridFrom(formData);
  if (!gridId) return { phase: "invalid", message: "This page does not name a review table." };
  const result = await (await getGateway()).tableCancel({ gridId });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) return { phase: "invalid", message: result.data.detail };
  return { phase: "cancelled", data: result.data };
}
