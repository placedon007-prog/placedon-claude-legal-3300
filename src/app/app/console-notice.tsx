"use client";

import { usePathname } from "next/navigation";

/**
 * This deployment's standing limits, as one quiet line on every screen except Ask — where
 * the same facts sit under each result, which is where a reader is when they matter.
 */
export function ConsoleNotice({ passcode }: { passcode: boolean }) {
  if (usePathname() === "/app") return null;
  return (
    <p className="console-notice">
      <strong>Playbook DRAFT</strong> — not approved by a lawyer; a finding is a potential issue
      against it, never a statement of law. <strong>Model region is not shown on this screen</strong> — test
      documents only until hosting is verified for the task.
      {passcode ? null : (
        <>
          {" "}
          <strong>Demo · synthetic data</strong> — recorded examples only. No live legal research or client documents.
        </>
      )}
    </p>
  );
}
