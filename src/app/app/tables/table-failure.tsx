import type { EngineError } from "@/lib/engine/errors";
import { FailureNotice } from "../failure-notice";

/** Placedon did not answer. Not a finding about any document. */
export function TableFailure({ error }: { error: EngineError }) {
  return (
    <FailureNotice error={error}>
      <p className="meta">Nothing was read from your files on this attempt.</p>
    </FailureNotice>
  );
}
