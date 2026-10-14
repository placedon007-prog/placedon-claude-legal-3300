import type { Metadata } from "next";
import { CaseLawConsole } from "./case-law-console";

export const metadata: Metadata = { title: "Case law", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function CaseLawPage() {
  return (
    <>
      <h2>Case law</h2>
      <p className="lede">
        Search Supreme Court and High Court judgments by party or case name. A result is
        supporting authority a lawyer may want to read — never a verified statutory answer,
        and never an obligation. Search finds a case by its name, not by legal topic.
      </p>
      <CaseLawConsole />
    </>
  );
}
