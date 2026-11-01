"use server";

import { getGateway } from "@/lib/gateway";
import { isRefusal } from "@/lib/gateway/types";
import { z } from "zod";
import {
  fromProfile, storedFactSchema, toProfileInput, type CompanyFact, type ProfileLoad, type StoredFact,
} from "@/lib/company-facts";
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

/**
 * The firm's company profile (`company_profile.get`, backend 032). A backend without it
 * answers 404 (no such route), and then the screens keep today's browser-only behaviour
 * and say so. Any other failure is "unavailable", never an empty profile and never a
 * silent switch to this browser.
 */
export async function loadCompanyProfileAction(): Promise<ProfileLoad> {
  if (!(await hasSession())) return { mode: "unavailable" };
  const result = await (await getGateway()).companyProfileGet();
  if (!result.ok) return result.error.kind === "not_found" ? { mode: "browser" } : { mode: "unavailable" };
  if (isRefusal(result.data)) return result.data.code === "NO_STORE" ? { mode: "browser" } : { mode: "unavailable" };
  return { mode: "server", facts: result.data.facts.map(fromProfile) };
}

export type SaveProfileResult =
  | { readonly ok: true; readonly facts: readonly StoredFact[] }
  | { readonly ok: false; readonly browserOnly: boolean; readonly message: string };

const saveSchema = z.object({
  facts: z.array(storedFactSchema).max(20),
  // What changed, in the person's terms; recorded with the change as its reason.
  reason: z.string().trim().min(10).max(300),
});

/** Replace the firm's profile with these confirmed facts. Input is checked here, never trusted. */
export async function saveCompanyProfileAction(facts: readonly StoredFact[], reason: string): Promise<SaveProfileResult> {
  if (!(await hasSession())) return { ok: false, browserOnly: false, message: "Your session has ended. Sign in to save company details." };
  const parsed = saveSchema.safeParse({ facts, reason });
  if (!parsed.success) return { ok: false, browserOnly: false, message: "These details could not be saved. Nothing was changed." };
  const result = await (await getGateway()).companyProfileSet({
    facts: parsed.data.facts.map(toProfileInput), reason: parsed.data.reason,
  });
  if (!result.ok) {
    if (result.error.kind === "not_found") return { ok: false, browserOnly: true, message: "Saved in this browser only." };
    if (result.error.status === 403) return { ok: false, browserOnly: false, message: "Your role cannot change company details. A lawyer or an admin can." };
    if (result.error.kind === "bad_request") return { ok: false, browserOnly: false, message: "Placedon refused these details, so nothing was changed." };
    return { ok: false, browserOnly: false, message: "Placedon did not answer, so nothing was saved. Try again." };
  }
  if (isRefusal(result.data)) return { ok: false, browserOnly: false, message: "Placedon refused these details, so nothing was changed." };
  return { ok: true, facts: result.data.facts.map(fromProfile) };
}
