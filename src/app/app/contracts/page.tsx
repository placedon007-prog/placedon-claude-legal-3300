import type { Metadata } from "next";
import { ContractConsole } from "./contract-console";

export const metadata: Metadata = { title: "Contracts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function ContractsPage() {
  return (
    <>
      <h2>Contracts</h2>
      <p className="lede">
        An NDA read against the company playbook. Each rule reports where the document
        differs from the standard, quoting the clause it read. The playbook is a commercial
        standard, not law: nothing here says a clause is valid, enforceable or void.
      </p>
      <ContractConsole />
    </>
  );
}
