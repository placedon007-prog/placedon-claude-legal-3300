import type { Metadata } from "next";
import { CompanyConsole } from "./company-console";

export const metadata: Metadata = { title: "Company", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function CompanyPage() {
  return (
    <>
      <h1>Company</h1>
      <p className="lede">
        Record the facts about your company that decide which rules apply — for example, whether it is listed and in which State.
      </p>
      <CompanyConsole />
    </>
  );
}
