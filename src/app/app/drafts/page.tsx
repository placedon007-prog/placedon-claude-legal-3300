import type { Metadata } from "next";
import Link from "next/link";
import { readDraftList } from "./actions";
import { sessionKind } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Drafts", robots: { index: false } };
export const dynamic = "force-dynamic";

function updatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Updated time unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** The author's own metadata inbox (028). Draft bodies are fetched only after opening an item. */
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
          <h1>Drafts</h1>
          <p className="meta">Your drafts. Open a draft to read and revise its text.</p>
        </div>
        <Link className="primary drafts-new-link" href="/app">Research then draft</Link>
      </div>
      <div className="drafts-empty">
        <h3>Generate from a cited answer</h3>
        <p>Ask a held-law question, inspect the cited passages, then choose “Create draft from latest cited answer” in the conversation. The resulting draft appears here for lawyer review.</p>
        <p className="meta">Public-web reports alone cannot generate a verified legal draft. You can also <Link href="/app/drafts/new">start a draft manually</Link>.</p>
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
          <p><Link href="/app">Research then draft</Link>, or <Link href="/app/drafts/new">start manually</Link>.</p>
          {cursor && <p><Link href="/app/drafts">Back to the first page</Link></p>}
        </div>
      ) : (
        <>
          {sessionKind() === "passcode" ? <p className="meta">A shared passcode does not identify an individual author.</p> : null}
          <ul className="drafts-list" aria-label="Your drafts">
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
      <p className="meta hosting-note">Draft templates remain DRAFT until approved by a lawyer.{sessionKind() === "passcode" ? " This shared-passcode prototype cannot verify individual reviewer identity." : ""}</p>
    </>
  );
}
