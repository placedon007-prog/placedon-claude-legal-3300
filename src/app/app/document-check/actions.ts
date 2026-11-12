"use server";

import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { isRefusal, type DocumentCheckOk } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";

/**
 * Server Action for `/app/document-check`.
 *
 * The gateway is touched only here — no client component imports `@/lib/gateway`, or the
 * API key would be inlined into the public bundle.
 *
 * **Four branches, and they are not the same.** `refused` is a product answer the pipeline
 * decided on (NOT_FOUND, GONE, VERIFY_FAILED, NO_VAULT) and carries a code; `failed` means
 * the answer never arrived (a transport error). Rendering the second as if it were a
 * finding about the document is the defect AGENTS.md names, so the state type forbids it.
 */
export type DocumentCheckState =
  | { readonly phase: "idle" }
  | { readonly phase: "checked"; readonly data: DocumentCheckOk }
  | { readonly phase: "refused"; readonly code: string; readonly detail: string }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

// An ISO date, or absent. A malformed one is a typo the backend refuses rather than
// treating as "today" — a date nobody meant would answer a different question.
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates are YYYY-MM-DD.")
  .optional();

const inputSchema = z.object({
  documentId: z
    .string()
    .trim()
    .min(1, "A document id is required. Copy it from Wall System.")
    .max(128, "That is too long to be a document id."),
  asOf: isoDate,
  revokedOn: isoDate,
  supersededBy: z.string().trim().max(200).optional(),
  renewable: z.boolean(),
});

export async function documentCheckAction(
  _prev: DocumentCheckState,
  formData: FormData,
): Promise<DocumentCheckState> {
  const parsed = inputSchema.safeParse({
    documentId: String(formData.get("document_id") ?? ""),
    asOf: String(formData.get("as_of") ?? "").trim() || undefined,
    revokedOn: String(formData.get("revoked_on") ?? "").trim() || undefined,
    supersededBy: String(formData.get("superseded_by") ?? "").trim() || undefined,
    renewable: formData.get("renewable") === "on",
  });
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }

  const gateway = await getGateway();
  const result = await gateway.documentCheck(parsed.data);
  if (!result.ok) return { phase: "failed", error: result.error };

  // A refusal is an EngineResult SUCCESS with a refusal body — the verb answered, it just
  // answered "no, and here is the code". It is not a transport failure.
  if (isRefusal(result.data)) {
    return {
      phase: "refused",
      code: result.data.code,
      detail: result.data.detail ?? "The verb refused without a detail.",
    };
  }

  return { phase: "checked", data: result.data };
}
