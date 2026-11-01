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
      <h1>Document Check</h1>
      <p className="lede">
        Check a document&rsquo;s key facts, dates and next step — for example, whether a licence is due for renewal.
      </p>
      <DocumentCheckConsole initialDocumentId={initial} initialName={stored?.name ?? null} initialReadiness={stored?.state ?? null} sharedPasscode={sharedPasscode} />
    </>
  );
}
