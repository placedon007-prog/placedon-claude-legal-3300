import type { Metadata } from "next";
import { ContractConsole } from "./contract-console";

export const metadata: Metadata = { title: "Contracts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function ContractsPage() {
  return (
    <>
      <h1>Contracts</h1>
      <p className="lede">
        Check an NDA against your company playbook — for example, which clauses differ from your standard terms.
      </p>
      <ContractConsole />
    </>
  );
}
