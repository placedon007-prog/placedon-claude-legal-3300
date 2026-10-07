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
        Three separate questions about one stored document, answered separately and written
        down: was it signed and are the bytes unchanged, is it still in force on a given
        date, and what should a lawyer do about it. The action is never a statement that the
        document is legally valid — <strong>NEEDS&nbsp;LAWYER</strong> is the answer whenever
        a check was not run, because <strong>KEEP</strong> would assert we looked and found
        nothing wrong. The row is append-only: a check in March and a check in October on the
        same bytes are two records, because the answer can change.
      </p>
      <DocumentCheckConsole initialDocumentId={initial} />
    </>
  );
}
