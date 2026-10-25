import type { Metadata } from "next";
import { TablesConsole } from "./tables-console";
import { tableStatusAction, type TableState } from "./actions";
import { getGateway } from "@/lib/gateway";

export const metadata: Metadata = { title: "Review tables", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TablesPage({ searchParams }: { searchParams: Promise<{ grid?: string }> }) {
  const { grid } = await searchParams;
  const mattersResult = await (await getGateway()).mattersList();
  const matters = mattersResult.ok ? mattersResult.data.matters : [];
  const mattersUnavailable = !mattersResult.ok;
  const initialGridId = grid && /^[A-Za-z0-9-]{1,100}$/.test(grid) ? grid : "";
  let initialStatus: TableState = { phase: "idle" };
  if (initialGridId) { const data = new FormData(); data.set("grid_id", initialGridId); initialStatus = await tableStatusAction(initialStatus, data); }
  return (
    <>
      <h2>Review tables</h2>
      <p className="lede">
        Documents down the side, questions across the top, one run per cell. A cell that was
        read says what it found and quotes it; a cell that was not read says so. Those are
        different answers, and the grid never renders either as a blank.
      </p>
      <TablesConsole key={initialGridId} initialGridId={initialGridId} initialStatus={initialStatus} matters={matters} mattersUnavailable={mattersUnavailable} />
    </>
  );
}
