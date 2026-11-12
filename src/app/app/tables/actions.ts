"use server";

import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import type {
  TableCancel,
  TableCreate,
  TableExport,
  TableStatus,
} from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";

/**
 * Review tables: create, status, export, cancel.
 *
 * `paused` is carried as its own field on the created state rather than inferred later,
 * because **`review_table.status` does not report it**. Measured against a live gateway on
 * 2026-10-04: no key in the status response mentions the budget. PAUSED_BUDGET arrives once,
 * on `create`, in `scheduled.paused_budget` — so a screen that only polls status would show
 * a table stuck at PENDING with no reason, and this is where the reason is kept.
 */
export type TableState =
  | { readonly phase: "idle" }
  | { readonly phase: "created"; readonly data: TableCreate }
  | { readonly phase: "status"; readonly data: TableStatus;
      readonly paused: { readonly reason: string; readonly notScheduled: number } | null }
  | { readonly phase: "exported"; readonly data: TableExport }
  | { readonly phase: "cancelled"; readonly data: TableCancel }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const KINDS = ["text", "date", "amount", "yes_no"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "A table needs a name.").max(120),
  documentIds: z
    .array(z.string().trim().regex(/^[0-9a-f]{64}$/, "Each document id is a sha256."))
    .min(1, "A table needs at least one document."),
  columns: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        kind: z.enum(KINDS),
        question: z.string().trim().min(5, "A column needs a question."),
      }),
    )
    .min(1, "A table needs at least one column."),
});

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function tableCreateAction(
  _prev: TableState,
  formData: FormData,
): Promise<TableState> {
  // One question per line, `kind|name|question`. A textarea rather than a column builder
  // because the shape of the request is the backend's, and a builder that invented its own
  // shape would be a second place for the column contract to live.
  const columns = lines(formData.get("columns")).map((line) => {
    const [kind, name, ...rest] = line.split("|").map((p) => p.trim());
    return { kind, name, question: rest.join("|") };
  });
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    documentIds: lines(formData.get("document_ids")),
    columns,
  });
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.tableCreate(parsed.data);
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "created", data: result.data };
}

const gridSchema = z.string().trim().min(1, "A grid id is required.");

export async function tableStatusAction(
  _prev: TableState,
  formData: FormData,
): Promise<TableState> {
  const parsed = gridSchema.safeParse(formData.get("grid_id"));
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.tableStatus({ gridId: parsed.data });
  if (!result.ok) return { phase: "failed", error: result.error };
  // `paused` is null here and the console says why: status cannot tell us.
  return { phase: "status", data: result.data, paused: null };
}

export async function tableExportAction(
  _prev: TableState,
  formData: FormData,
): Promise<TableState> {
  const parsed = gridSchema.safeParse(formData.get("grid_id"));
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.tableExport({ gridId: parsed.data });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "exported", data: result.data };
}

export async function tableCancelAction(
  _prev: TableState,
  formData: FormData,
): Promise<TableState> {
  const parsed = gridSchema.safeParse(formData.get("grid_id"));
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.tableCancel({ gridId: parsed.data });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "cancelled", data: result.data };
}
