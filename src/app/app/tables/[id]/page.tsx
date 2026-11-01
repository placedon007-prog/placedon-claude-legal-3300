import type { Metadata } from "next";
import Link from "next/link";
import { readTable } from "../actions";
import { TableFailure } from "../table-failure";
import { LiveTable } from "./live-table";

export const metadata: Metadata = { title: "Review table", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readTable(decodeURIComponent(id));
  return (
    <>
      <p className="meta"><Link href="/app/tables">← Review tables</Link></p>
      {state.phase === "status" ? <LiveTable data={state.data} /> : (
        <>
          <h1>Review table</h1>
          {state.phase === "failed" ? <TableFailure error={state.error} />
            : <p role="alert" className="invalid">{state.phase === "invalid" ? state.message : "This table could not be opened."}</p>}
          <p><Link href="/app/tables">Back to your tables</Link></p>
        </>
      )}
    </>
  );
}
