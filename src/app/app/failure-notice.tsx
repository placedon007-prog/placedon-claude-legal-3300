import type { ReactNode } from "react";
import { failureDetails, plainFailure, type FailureLike } from "@/lib/plain-failure";

/** The technical record of a failure, closed by default. */
export function FailureDetails({ error }: { error: FailureLike }) {
  return (
    <details className="failure-details">
      <summary>Details</summary>
      <p className="mono">{failureDetails(error)}</p>
    </details>
  );
}

/** Placedon did not answer. Not a finding, not a refusal: a plain sentence, what that
 *  means for this screen (children), and the technical detail behind a toggle. */
export function FailureNotice({ error, title = "Placedon did not answer", children }: {
  error: FailureLike;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div role="alert" className="transport-failure">
      <h3>{title}</h3>
      <p>{plainFailure(error)}</p>
      {children}
      <FailureDetails error={error} />
    </div>
  );
}
