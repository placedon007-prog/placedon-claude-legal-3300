import type { Metadata } from "next";
import { CaseLawConsole } from "./case-law-console";

export const metadata: Metadata = { title: "Case law", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function CaseLawPage() {
  return (
    <>
      <h1>Case law</h1>
      <p className="lede">
        Find Supreme Court and High Court judgments by party, case name, or legal topic. This
        searches available judgment collections; it does not retrieve the live court docket or
        decide what authority controls your matter.
      </p>
      <CaseLawConsole />
      <section aria-labelledby="live-status-heading" className="mt-8 rounded-card border border-line-2 p-5">
        <h3 id="live-status-heading" className="text-title font-medium">Need the current status of a case?</h3>
        <p className="mt-2 text-ui text-fg-2">Judgment search is not docket status. For a live listing, order, or next hearing date, use the court’s case-status service. You may need the CNR, case number and year, diary number, or exact party name; court portals may require CAPTCHA.</p>
        <ul className="mt-3 flex flex-wrap gap-3 text-ui">
          <li><a className="inline-flex min-h-11 items-center rounded px-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2" href="https://www.sci.gov.in/case-status-court/" target="_blank" rel="noopener noreferrer">Supreme Court case status<span className="sr-only"> (opens in a new tab)</span></a></li>
          <li><a className="inline-flex min-h-11 items-center rounded px-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2" href="https://hcservices.ecourts.gov.in/hcservices/" target="_blank" rel="noopener noreferrer">High Court case status<span className="sr-only"> (opens in a new tab)</span></a></li>
        </ul>
        <p className="mt-2 text-caption text-fg-3">“Tata case” is not specific enough to identify a live matter. Search by exact parties or provide the court and CNR/case number before relying on a status.</p>
      </section>
    </>
  );
}
