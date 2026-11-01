"use client";

import Link from "next/link";
import { useLocalTables } from "../local-store";
import { tableWhen } from "./table-labels";

/** Used only while the firm-wide list is unavailable on this workspace, and says so. */
export function BrowserTables() {
  const tables = useLocalTables();
  return (
    <>
      <p role="status" className="meta">The firm-wide list is not available on this workspace yet, so these are the tables opened in this browser only.</p>
      {tables.length === 0 ? <p className="meta">No tables opened in this browser yet.</p> : (
        <ul className="drafts-list" aria-label="Tables opened in this browser">
          {tables.map((t) => (
            <li key={t.id}>
              <Link href={`/app/tables/${encodeURIComponent(t.id)}`}>
                <span className="drafts-row-main"><strong>{t.name}</strong></span>
                <span className="drafts-row-state"><span className="meta">{tableWhen(t.at)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
