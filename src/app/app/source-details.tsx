/** The file fingerprint and run id behind a result, kept but folded away under "Details". */
export function SourceDetails({ sha256, runId }: { sha256?: string | null; runId?: string | null }) {
  if (!sha256 && !runId) return null;
  return (
    <details className="meta">
      <summary>Details</summary>
      <p className="mono">
        {sha256 ? <>sha256 {sha256}</> : null}
        {sha256 && runId ? " · " : null}
        {runId ? <>run <a href={`/app/runs/${encodeURIComponent(runId)}`}>{runId}</a></> : null}
      </p>
    </details>
  );
}
