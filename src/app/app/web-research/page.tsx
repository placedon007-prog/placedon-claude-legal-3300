import type { Metadata } from "next";
import { WebResearchConsole } from "./web-research-console";

export const metadata: Metadata = { title: "Web research", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function WebResearchPage() {
  return (
    <>
      <h2>Web research</h2>
      <p className="lede">
        Search public pages and review the sources behind the response. Public web results are
        not verified law and cannot establish a live court docket status.
      </p>
      <WebResearchConsole />
    </>
  );
}
