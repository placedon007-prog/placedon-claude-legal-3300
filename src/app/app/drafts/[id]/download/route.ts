import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { gatewayConfiguration } from "@/lib/auth/config";
import { getGateway } from "@/lib/gateway";
import { isRefusal } from "@/lib/gateway/types";
import { docxDownloadName, isDocx } from "@/lib/documents/docx-download";

/**
 * GET /app/drafts/{id}/download?version=N — the saved draft as a Word file.
 *
 * Server-side only: the backend's `draft.export` verb is called with the signed-in person's
 * own session (`getGateway()`), so the backend's per-user and per-matter checks decide, and
 * no gateway key ever reaches the browser. A refusal comes back as JSON with a message the
 * page shows; it is never streamed as a file.
 */
const versionSchema = z.coerce.number().int().positive().max(100_000);

const NOT_AVAILABLE = "This draft is not available to you.";
/** The backend's refusal codes, as the HTTP status the page can act on (retry or not). */
const REFUSAL_STATUS: Record<string, number> = {
  NOT_FOUND: 404, BAD_REQUEST: 400, CONFLICT: 409, BUSY: 429,
  NO_STORE: 503, STORAGE_UNAVAILABLE: 503,
};

function fail(status: number, message: string) {
  return Response.json({ message }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request, ctx: RouteContext<"/app/drafts/[id]/download">) {
  await requireSession();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail(400, "That is not a draft id.");
  const rawVersion = new URL(request.url).searchParams.get("version");
  const version = rawVersion === null ? undefined : versionSchema.safeParse(rawVersion);
  if (version && !version.success) return fail(400, "That is not a version number.");

  if (gatewayConfiguration().mode === "demo") {
    return fail(501, "Word download is not available in the demo workspace; it needs the real backend.");
  }
  const gateway = await getGateway();
  const result = await gateway.draftExport({
    draftId: id,
    ...(version?.success ? { version: version.data } : {}),
    format: "docx",
  });
  if (!result.ok) {
    const hidden = result.error.status === 403 || result.error.status === 404;
    return fail(hidden ? 404 : 502, hidden
      ? NOT_AVAILABLE
      : "The Word file could not be built. Nothing was changed; try again.");
  }
  if (isRefusal(result.data)) {
    const status = REFUSAL_STATUS[result.data.code] ?? 409;
    return fail(status, status === 404 ? NOT_AVAILABLE : result.data.detail);
  }
  const bytes = Buffer.from(result.data.docx_base64 ?? "", "base64");
  if (!isDocx(bytes)) {
    return fail(502, "The backend did not return a Word file. Nothing was downloaded.");
  }
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": docxDownloadName(result.data.filename, result.data.version),
      "content-length": String(bytes.length),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
