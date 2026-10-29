import type { Metadata } from "next";
import { DocumentCheckConsole } from "./document-check-console";
import { documentReadinessAction } from "../actions";
import { demoModeEnabled, sessionKind } from "@/lib/auth/config";
import { gateEnabled } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Document Check", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DocumentCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  // Only an id-shaped value is prefilled; anything else is ignored rather than echoed.
  const { doc } = await searchParams;
  const initial = doc && /^[A-Za-z0-9-]{1,100}$/.test(doc) ? doc : "";
  // Opened from Wall System's Inspect: show the stored file's name and status, not its id.
  const stored = initial ? await documentReadinessAction(initial) : null;
  // The shared-passcode warning is true only for the passcode prototype (as on Ask).
  const sharedPasscode = !demoModeEnabled() && gateEnabled() && sessionKind() === "passcode";
  return (
    <>
      <h2>Document Check</h2>
      <p className="lede">
        Upload readable document text to check its recorded facts, date-sensitive status and next action.
        Results flag what needs lawyer review; they do not certify legal validity.
      </p>
      <DocumentCheckConsole initialDocumentId={initial} initialName={stored?.name ?? null} initialReadiness={stored?.state ?? null} sharedPasscode={sharedPasscode} />
    </>
  );
}
