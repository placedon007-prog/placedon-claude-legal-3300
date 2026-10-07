"use server";

import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { isRefusal } from "@/lib/gateway/types";
import type { VaultFind, VaultStatus, VaultVerify } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";
import { extractText, MAX_UPLOAD_BYTES } from "@/lib/documents";

/**
 * The vault's four verbs.
 *
 * `refused` is its own phase everywhere. A vault verb refuses by NAME — `NO_VAULT` when the
 * deployment has no file store, `NOT_FOUND` for a document this firm does not have — and a
 * named refusal is a product answer, not a failure. Rendering it in the failure register
 * would say the gateway broke; rendering a failure in the refusal register would say the
 * product decided. Both are wrong in opposite directions.
 */
export type VaultState =
  | { readonly phase: "idle" }
  | { readonly phase: "listed"; readonly data: VaultStatus }
  | { readonly phase: "uploaded"; readonly documentId: string; readonly name: string;
      readonly state: string; readonly note: string; readonly data: VaultStatus }
  | { readonly phase: "found"; readonly query: string; readonly data: VaultFind }
  | { readonly phase: "verified"; readonly documentId: string; readonly data: VaultVerify }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

export async function vaultListAction(): Promise<VaultState> {
  const gateway = await getGateway();
  const result = await gateway.vaultStatus();
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "listed", data: result.data };
}

const nameSchema = z.string().trim().min(1, "A document needs a name.").max(200);

export async function vaultUploadAction(
  _prev: VaultState,
  formData: FormData,
): Promise<VaultState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { phase: "invalid", message: "Choose a file to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      phase: "invalid",
      message: `That file is ${file.size} bytes; the limit is ${MAX_UPLOAD_BYTES}.`,
    };
  }
  const parsedName = nameSchema.safeParse(
    String(formData.get("name") ?? "").trim() || file.name,
  );
  if (!parsedName.success) {
    return { phase: "invalid", message: parsedName.error.issues[0].message };
  }
  // `extractText` returns a named refusal rather than throwing, and never returns empty
  // text as success — an empty contract reviews as a contract with no clauses in it.
  const extracted = extractText(
    parsedName.data,
    new Uint8Array(await file.arrayBuffer()),
  );
  if (!extracted.ok) return { phase: "invalid", message: extracted.reason };
  const text = extracted.text;
  if (!text.trim()) {
    return {
      phase: "invalid",
      message:
        "No text layer. A scan needs OCR, which is blocked until the deployment has one — " +
        "uploading it would store bytes no search can reach.",
    };
  }

  const gateway = await getGateway();
  const result = await gateway.vaultUpload({ name: parsedName.data, text });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) {
    return { phase: "refused", code: result.data.code, detail: result.data.detail };
  }
  // Re-read the list, so the new file appears with its state beside the others rather
  // than as a lone confirmation that says nothing about the rest of the vault.
  const after = await gateway.vaultStatus();
  if (!after.ok) return { phase: "failed", error: after.error };
  return {
    phase: "uploaded",
    documentId: result.data.document_id,
    name: result.data.name,
    state: result.data.state,
    note: result.data.note ?? "",
    data: after.data,
  };
}

const querySchema = z.string().trim().min(3, "A search needs at least three characters.");

export async function vaultFindAction(
  _prev: VaultState,
  formData: FormData,
): Promise<VaultState> {
  const parsed = querySchema.safeParse(formData.get("query"));
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.vaultFind({ query: parsed.data });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "found", query: parsed.data, data: result.data };
}

export async function vaultVerifyAction(
  _prev: VaultState,
  formData: FormData,
): Promise<VaultState> {
  const documentId = String(formData.get("document_id") ?? "").trim();
  if (!documentId) return { phase: "invalid", message: "Choose a document to verify." };
  const gateway = await getGateway();
  const result = await gateway.vaultVerify({ documentId });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (isRefusal(result.data)) {
    return { phase: "refused", code: result.data.code, detail: result.data.detail };
  }
  return { phase: "verified", documentId, data: result.data };
}
