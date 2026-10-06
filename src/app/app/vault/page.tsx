import type { Metadata } from "next";
import { vaultListAction } from "./actions";
import { VaultConsole } from "./vault-console";

export const metadata: Metadata = { title: "Wall System", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
  // Read on the server, so the list is present on first paint and the key never leaves it.
  const listed = await vaultListAction();
  return (
    <>
      <h2>Wall System</h2>
      <p className="lede">
        This firm&rsquo;s documents, each with the state of its ingestion. A document that is
        queued is not yet searchable, and the list says so rather than showing a tick — a
        search that silently omits a document it never read is worse than one that returns
        nothing.
      </p>
      <VaultConsole initialList={listed.phase === "listed" ? listed.data : null} />
    </>
  );
}
