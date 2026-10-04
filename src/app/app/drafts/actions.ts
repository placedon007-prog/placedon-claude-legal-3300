"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { isConflict, isRefusal } from "@/lib/gateway/types";
import type {
  DraftConflict,
  DraftDiff,
  DraftExport,
  DraftStatus,
  DraftVersions,
} from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";

/**
 * A draft's five verbs.
 *
 * `conflict` is its own phase, separate from `refused`. A1's optimistic lock answers a lost
 * race with HTTP 200, `status: "REFUSED"`, `code: "CONFLICT"` and BOTH version numbers —
 * and the version numbers are the whole value of it. "Someone else saved first" is not
 * actionable; "you were on 1, it is now 2" is.
 */
export type DraftState =
  | { readonly phase: "idle" }
  | { readonly phase: "saved"; readonly data: DraftStatus }
  | { readonly phase: "conflict"; readonly data: DraftConflict }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

export type DiffState =
  | { readonly phase: "idle" }
  | { readonly phase: "diffed"; readonly data: DraftDiff }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

export type ExportState =
  | { readonly phase: "idle" }
  | { readonly phase: "exported"; readonly data: DraftExport }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const titleSchema = z.string().trim().min(3, "A draft needs a title.").max(200);

/** Creates, then navigates to the draft. The id is the gateway's, never invented here. */
export async function draftCreateAction(
  _prev: DraftState,
  formData: FormData,
): Promise<DraftState> {
  const parsed = titleSchema.safeParse(formData.get("title"));
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.draftCreate({
    title: parsed.data,
    body: String(formData.get("body") ?? ""),
  });
  if (!result.ok) return { phase: "failed", error: result.error };
  redirect(`/app/drafts/${encodeURIComponent(result.data.draft_id)}`);
}

export async function readVersions(
  draftId: string,
): Promise<{ ok: true; data: DraftVersions } | { ok: false; error: EngineError }> {
  const gateway = await getGateway();
  const result = await gateway.draftVersions({ draftId });
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

const reviseSchema = z.object({
  draftId: z.string().trim().min(1),
  // The version the editor was LOOKING AT. Sent as the base, so a save from a stale tab
  // loses the race instead of overwriting it. Never defaulted to "the latest": that is the
  // lost update this field exists to prevent.
  baseVersion: z.coerce.number().int().positive(),
  body: z.string(),
  approvedBy: z.string().trim().max(120).optional(),
});

export async function draftReviseAction(
  _prev: DraftState,
  formData: FormData,
): Promise<DraftState> {
  const parsed = reviseSchema.safeParse({
    draftId: formData.get("draft_id"),
    baseVersion: formData.get("base_version"),
    body: String(formData.get("body") ?? ""),
    approvedBy: String(formData.get("approved_by") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return {
      phase: "invalid",
      message:
        parsed.error.issues[0].path[0] === "baseVersion"
          ? "The version this edit was based on is missing. Reload the draft."
          : parsed.error.issues[0].message,
    };
  }
  const gateway = await getGateway();
  const result = await gateway.draftRevise(parsed.data);
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isConflict(result.data)) return { phase: "conflict", data: result.data };
  if (isRefusal(result.data)) {
    return { phase: "refused", code: result.data.code, detail: result.data.detail };
  }
  return { phase: "saved", data: result.data };
}

export async function draftDiffAction(
  _prev: DiffState,
  formData: FormData,
): Promise<DiffState> {
  const draftId = String(formData.get("draft_id") ?? "").trim();
  if (!draftId) return { phase: "invalid", message: "A draft id is required." };
  const from = Number(formData.get("from_version"));
  const to = Number(formData.get("to_version"));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) {
    return { phase: "invalid", message: "Choose two versions to compare." };
  }
  const gateway = await getGateway();
  const result = await gateway.draftDiff({ draftId, fromVersion: from, toVersion: to });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "diffed", data: result.data };
}

export async function draftExportAction(
  _prev: ExportState,
  formData: FormData,
): Promise<ExportState> {
  const draftId = String(formData.get("draft_id") ?? "").trim();
  if (!draftId) return { phase: "invalid", message: "A draft id is required." };
  const version = Number(formData.get("version"));
  const gateway = await getGateway();
  const result = await gateway.draftExport({
    draftId,
    ...(Number.isInteger(version) && version > 0 ? { version } : {}),
    format: "text",
  });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "exported", data: result.data };
}
