import type { Metadata } from "next";
import Link from "next/link";
import { recentRuns } from "@/lib/auth/recent-runs";

export const metadata: Metadata = { title: "Runs", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await recentRuns();
  return (
    <>
      <h2>Runs</h2>
      <p className="lede">
        Every question and review leaves a run: the steps it took, which model served each
        one, where that model ran, and what it cost.
      </p>
      <p className="meta">
        These are the runs started <strong>in this browser session</strong>. The gateway
        serves a run by id and has no list-verb, so this is not every run for the tenant —
        and a list that looked complete would be worse than one that says it is not.
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
    </>
  );
}
