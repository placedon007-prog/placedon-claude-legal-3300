import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { readTableList } from "./actions";
import { BrowserTables } from "./browser-tables";
import { TableFailure } from "./table-failure";
import { TableForm } from "./table-form";
import { TABLE_STATE_LABEL, tableWhen } from "./table-labels";

export const metadata: Metadata = { title: "Review tables", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TablesPage({ searchParams }: { searchParams: Promise<{ grid?: string; cursor?: string }> }) {
  const { grid, cursor } = await searchParams;
  // Old links carried the table in `?grid=`; a table now has its own page.
  if (grid && /^[A-Za-z0-9-]{1,100}$/.test(grid)) redirect(`/app/tables/${encodeURIComponent(grid)}`);
  const [mattersResult, list] = await Promise.all([(await getGateway()).mattersList(), readTableList(cursor)]);
  return (
    <>
      <h1>Review tables</h1>
      <p className="lede">Ask the same questions of many files at once, for example the governing law of every NDA in a matter.</p>

      <section aria-labelledby="your-tables" className="table-section">
        <h3 id="your-tables">Your tables</h3>
        {list.kind === "unavailable" ? <BrowserTables />
          : list.kind === "failed" ? <TableFailure error={list.error} />
          : list.data.tables.length === 0 ? <p className="meta">{cursor ? "No more tables." : "No tables yet. Create one below."}</p>
          : (
            <>
              <ul className="drafts-list" aria-label="Your review tables">
                {list.data.tables.map((t) => (
                  <li key={t.grid_id}>
                    <Link href={`/app/tables/${encodeURIComponent(t.grid_id)}`}>
                      <span className="drafts-row-main">
                        <strong>{t.name}</strong>
                        <span className="meta">{t.documents} file{t.documents === 1 ? "" : "s"} × {t.columns} question{t.columns === 1 ? "" : "s"} · {t.mine ? "Started by you" : "Started by a colleague"}</span>
                      </span>
                      <span className="drafts-row-state">
                        <span className="draft-state-label">{TABLE_STATE_LABEL[t.table_state] ?? "Status unavailable"}{t.table_state === "RUNNING" ? ` · ${t.cells - t.cells_pending} of ${t.cells}` : ""}</span>
                        <span className="meta">{tableWhen(t.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {list.data.next_cursor && (
                <nav className="drafts-pagination" aria-label="Table pages">
                  <Link href={`/app/tables?cursor=${encodeURIComponent(list.data.next_cursor)}`}>Older tables</Link>
                </nav>
              )}
            </>
          )}
      </section>

      <section aria-labelledby="new-table" className="table-section">
        <h3 id="new-table">New table</h3>
        <TableForm matters={mattersResult.ok ? mattersResult.data.matters : []} mattersUnavailable={!mattersResult.ok} />
      </section>
    </>
  );
}
