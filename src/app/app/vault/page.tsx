import type { Metadata } from "next";
import { vaultListAction } from "./actions";
import { VaultConsole } from "./vault-console";
import { getGateway } from "@/lib/gateway";

export const metadata: Metadata = { title: "Wall System", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
  // Read on the server, so the list is present on first paint and the key never leaves it.
  const listed = await vaultListAction();
  const matters = await (await getGateway()).mattersList();
  return (
    <>
      <h1>Wall System</h1>
      <p className="lede">
        Store searchable text copies of court orders, agreements and working documents.
        Organise them by matter and add ready files to a conversation. Keep your original files separately.
      </p>
      <VaultConsole initialList={listed.phase === "listed" ? listed.data : null}
        matters={matters.ok ? matters.data.matters : []} mattersUnavailable={!matters.ok} />
    </>
  );
}
