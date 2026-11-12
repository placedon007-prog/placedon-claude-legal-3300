import type { Metadata } from "next";
import { DocumentConsole } from "./document-console";

export const metadata: Metadata = { title: "Documents", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return (
    <>
      <h2>Documents</h2>
      <p className="lede">
        Minutes and notices against the Secretarial Standards. The document type is worked
        out first, and a check written for minutes never fires on a notice — a notice is
        issued before the meeting, so it cannot record what the meeting did. Every finding
        cites the standard and a real adjudication order.
      </p>
      <DocumentConsole />
    </>
  );
}
