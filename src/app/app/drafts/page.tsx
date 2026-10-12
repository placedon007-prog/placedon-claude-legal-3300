import type { Metadata } from "next";
import Link from "next/link";
import { readDraftList } from "./actions";

export const metadata: Metadata = { title: "Drafts", robots: { index: false } };
export const dynamic = "force-dynamic";

function updatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Updated time unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** Tenant-scoped metadata inbox. Draft bodies are fetched only after opening an item. */
export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const result = await readDraftList({ ...(cursor ? { cursor } : {}), limit: 20 });

  return (
    <>
      <div className="drafts-heading">
        <div>
          <h2>Drafts</h2>
          <p className="meta">Shared with this workspace. Draft text appears after you open one.</p>
        </div>
        <Link className="primary drafts-new-link" href="/app/drafts/new">New draft</Link>
      </div>

      {!result.ok ? (
        <div role="alert" className="transport-failure">
          <h3>Drafts could not be loaded</h3>
          <p>{result.error.message}</p>
          <p className="meta">{result.error.kind} · {result.error.route}</p>
          <p><Link href="/app/drafts">Try again</Link></p>
        </div>
      ) : result.data.drafts.length === 0 ? (
        <div className="drafts-empty">
          <h3>{cursor ? "No drafts on this page" : "No drafts yet"}</h3>
          <p className="meta">{result.data.note}</p>
          <p><Link href="/app/drafts/new">Create a draft</Link> to begin.</p>
          {cursor && <p><Link href="/app/drafts">Back to the first page</Link></p>}
        </div>
      ) : (
        <>
          <p className="meta">Showing drafts for this tenant. A shared passcode does not identify an individual author.</p>
          <ul className="drafts-list" aria-label="Drafts in this workspace">
            {result.data.drafts.map((draft) => (
              <li key={draft.draft_id}>
                <Link href={`/app/drafts/${encodeURIComponent(draft.draft_id)}`}>
                  <span className="drafts-row-main">
                    <strong>{draft.title}</strong>
                    <span className="meta">Version {draft.version} · {draft.kind.replaceAll("_", " ")}</span>
                  </span>
                  <span className="drafts-row-state">
                    <span className="draft-state-label">
                      {draft.approved ? "Recorded approval · identity unverified"
                        : draft.blocking_count > 0 ? `Needs review · ${draft.blocking_count} item${draft.blocking_count === 1 ? "" : "s"}`
                          : "Saved · not approved"}
                    </span>
                    <span className="meta">{updatedAt(draft.updated_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {result.data.next_cursor && (
            <nav className="drafts-pagination" aria-label="Draft pages">
              <Link href={`/app/drafts?cursor=${encodeURIComponent(result.data.next_cursor)}`}>Next page</Link>
            </nav>
          )}
        </>
      )}
      <p className="meta hosting-note">Draft templates remain DRAFT until approved by a lawyer. This shared-passcode prototype cannot verify individual reviewer identity.</p>
    </>
  );
}
