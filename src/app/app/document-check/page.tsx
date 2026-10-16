import type { Metadata } from "next";
import { DocumentCheckConsole } from "./document-check-console";

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
  return (
    <>
      <h2>Document Check</h2>
      <p className="lede">
        Upload a document to check its recorded facts, date-sensitive status and next action.
        Results flag what needs lawyer review; they do not certify legal validity.
      </p>
      <DocumentCheckConsole initialDocumentId={initial} />
    </>
  );
}
