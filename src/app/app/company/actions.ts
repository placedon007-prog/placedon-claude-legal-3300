"use server";

import { getGateway } from "@/lib/gateway";
import { isRefusal } from "@/lib/gateway/types";
import type { CompanyFact } from "@/lib/company-facts";
import { extractText, MAX_UPLOAD_BYTES } from "@/lib/documents";
import { hasSession } from "@/lib/auth/session";

/**
 * `company_facts.extract`, and nothing else. The page's text goes to the backend, which
 * reads each field with the line it came from and stores nothing. Every fact comes back
 * unconfirmed; the person confirms them in the browser, and only then are they kept.
 */
export type ExtractResult =
  | { readonly ok: true; readonly facts: readonly CompanyFact[]; readonly missing: readonly string[]; readonly uploadedOn: string }
  | { readonly ok: false; readonly message: string };

/** Codes from backend gateway/verbs.py `_company_facts_extract`. */
const REFUSALS: Record<string, string> = {
  CANNOT_READ: "This page has no readable text. A scan or a photograph cannot be read; download the page from the MCA site as a PDF with text, or paste its text.",
  PERSONAL_DATA: "This page could not be read without keeping director details, so nothing was read.",
  BAD_REQUEST: "This page could not be read. Nothing was changed.",
};

const MAX_TEXT = 200_000;

/** Today in India, as the date the page was uploaded. */
function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export async function extractCompanyFactsAction(formData: FormData): Promise<ExtractResult> {
  if (!(await hasSession())) return { ok: false, message: "Your session has ended. Sign in to read this page." };
  const file = formData.get("file");
  let text = String(formData.get("text") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "That file is larger than 10 MB. A master-data page is one or two pages." };
    const extracted = await extractText(file.name, new Uint8Array(await file.arrayBuffer()));
    if (!extracted.ok) return { ok: false, message: extracted.reason };
    text = extracted.text;
  }
  if (!text.trim()) return { ok: false, message: "Choose the master-data PDF, or paste the page's text." };
  if (text.length > MAX_TEXT) return { ok: false, message: "That text is too long to be one master-data page." };

  const uploadedOn = todayInIndia();
  const result = await (await getGateway()).companyFactsExtract({ text, uploadedOn });
  if (!result.ok) {
    if (result.error.status === 403) return { ok: false, message: "Your role cannot read company pages. A lawyer or an admin can." };
    return { ok: false, message: "Placedon did not answer, so the page was not read. Try again." };
  }
  if (isRefusal(result.data)) {
    return { ok: false, message: REFUSALS[result.data.code] ?? "This page could not be read. Nothing was changed." };
  }
  // `unmatched` reads "cin (looked for: ...)"; the field name is the first word.
  const missing = result.data.unmatched.map((u) => u.split(" ")[0]);
  return { ok: true, facts: result.data.facts, missing, uploadedOn };
}
