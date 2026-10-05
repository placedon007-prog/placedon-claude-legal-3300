import type { Metadata } from "next";
import { TablesConsole } from "./tables-console";

export const metadata: Metadata = { title: "Review tables", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function TablesPage() {
  return (
    <>
      <h2>Review tables</h2>
      <p className="lede">
        Documents down the side, questions across the top, one run per cell. A cell that was
        read says what it found and quotes it; a cell that was not read says so. Those are
        different answers, and the grid never renders either as a blank.
      </p>
      <TablesConsole />
    </>
  );
}
