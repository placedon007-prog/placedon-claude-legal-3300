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
      against it, never a statement of law. <strong>Model hosted in UAE North</strong> — test
      documents only.
      {passcode ? null : (
        <>
          {" "}
          <strong>No passcode set</strong> — anyone who can reach this console can use it.
        </>
      )}
    </p>
  );
}
