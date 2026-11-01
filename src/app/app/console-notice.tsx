"use client";

import { usePathname } from "next/navigation";

/**
 * Each screen's own limit, in a few words. These were the cautious paragraphs under each
 * page heading; they are shortened here, never dropped.
 */
const PAGE_LIMIT: Record<string, string> = {
  "/app/calendar": "No date is given without the fact it depends on. Model hosted in UAE North.",
  "/app/company": "Company details are what you entered or what your uploaded page says; none is verified.",
  "/app/case-law": "Judgment search, not live case status.",
  "/app/contracts": "The playbook is a company standard, not law: nothing here says a clause is valid or enforceable.",
  "/app/document-check": "Flags what needs lawyer review; it does not certify validity.",
  "/app/documents": "Checks match the document type; each finding cites the standard and an adjudication order.",
  "/app/tables": "A cell that was not read says so; it is never left blank. Model hosted in UAE North.",
  "/app/vault": "Model hosted in UAE North.",
};

/**
 * This deployment's standing limits, as one quiet line under the page's results on every
 * screen except Ask — where the same facts sit under each answer.
 */
export function ConsoleNotice({ passcode }: { passcode: boolean }) {
  const path = usePathname();
  if (path === "/app") return null;
  const limit = PAGE_LIMIT[path];
  return (
    <p className="console-notice">
      {limit ? <>{limit} · </> : null}
      <strong>Not legal advice</strong> · answers are cited or abstain · Playbook DRAFT, not
      lawyer-approved · test documents only, no client documents
      {passcode ? null : <> · <strong>Demo</strong>: recorded examples</>}
    </p>
  );
}
