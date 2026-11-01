import type { EngineError } from "@/lib/engine/errors";

/** The gateway did not answer. Not a finding about any document. */
export function TableFailure({ error }: { error: EngineError }) {
  return (
    <div role="alert" className="transport-failure">
      <h3>Placedon did not answer</h3>
      <p>{error.message}</p>
      <p className="meta">Nothing was read from your files on this attempt. Try again in a moment.</p>
    </div>
  );
}
