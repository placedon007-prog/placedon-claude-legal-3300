"use client";

import { useState } from "react";
import { filenameFromDisposition } from "@/lib/documents/docx-download";

type Status =
  | { phase: "idle" }
  | { phase: "busy" }
  | { phase: "unsaved" }
  | { phase: "done"; filename: string }
  | { phase: "error"; message: string };

const DOCX_TYPE = "wordprocessingml";

/**
 * Downloads the last SAVED version as a Word file through this app's own route, which calls
 * the backend with the signed-in person's session. Unsaved edits are not in the file, so the
 * button says so instead of handing over a document that silently lacks them.
 */
export function DocxDownload({ draftId, version, unsaved }: {
  draftId: string;
  version: number;
  unsaved: boolean;
}) {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function download(anyway: boolean) {
    if (unsaved && !anyway) {
      setStatus({ phase: "unsaved" });
      return;
    }
    setStatus({ phase: "busy" });
    let response: Response;
    try {
      response = await fetch(
        `/app/drafts/${encodeURIComponent(draftId)}/download?version=${version}`,
        { cache: "no-store", credentials: "same-origin" },
      );
    } catch {
      setStatus({ phase: "error", message: "The download was interrupted. Nothing was changed; try again." });
      return;
    }
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes(DOCX_TYPE)) {
      setStatus({ phase: "error", message: await failureMessage(response, type) });
      return;
    }
    const filename = filenameFromDisposition(response.headers.get("content-disposition"), `draft-v${version}.docx`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus({ phase: "done", filename });
  }

  const busy = status.phase === "busy";
  return (
    <div className="docx-download">
      <button type="button" onClick={() => download(false)} disabled={busy}>
        {busy ? "Preparing…" : `Download Word file (version ${version})`}
      </button>
      {status.phase === "unsaved" && (
        <div role="alert" className="invalid">
          <p>
            You have unsaved edits. The Word file is version {version}, the last saved version,
            and does not include them. Save first to include them.
          </p>
          <button type="button" onClick={() => download(true)}>
            Download version {version} anyway
          </button>
        </div>
      )}
      {status.phase === "error" && <p role="alert" className="invalid">{status.message}</p>}
      {status.phase === "done" && <p role="status" className="meta">Downloaded {status.filename}.</p>}
    </div>
  );
}

async function failureMessage(response: Response, type: string): Promise<string> {
  // A session that ended is redirected to sign-in, which arrives here as an HTML page.
  if (response.redirected || type.includes("text/html")) {
    return "Your session has ended. Sign in again, then download.";
  }
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // not JSON; use the generic message below
  }
  return `The Word file could not be downloaded (HTTP ${response.status}). Nothing was changed.`;
}
