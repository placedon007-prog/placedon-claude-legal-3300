import type { Metadata } from "next";
import Link from "next/link";
import { recentRuns } from "@/lib/auth/recent-runs";

export const metadata: Metadata = { title: "Runs", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await recentRuns();
  return (
    <>
      <h1>Runs</h1>
      <p className="lede">
        What each question or review did — for example, the steps it took, the model it used, and what it cost.
      </p>
      {runs.length === 0 ? (
        <p className="empty" style={{ marginTop: "1.5rem" }}>
          No runs yet. Ask a question or review a contract.
        </p>
      ) : (
        <ul className="runs">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/app/runs/${r.id}`}>
                <span className="mono">{r.id}</span>
                <span className="meta">
                  {r.intent} · {new Date(r.at).toISOString().replace("T", " ").slice(0, 16)}
                </span>
                <span>{r.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="meta" style={{ marginTop: "1rem" }}>
        Only runs started <strong>in this browser session</strong> are listed. Placedon can
        open a run by its id but cannot list them all, so this list may be incomplete.
      </p>
    </>
  );
}
