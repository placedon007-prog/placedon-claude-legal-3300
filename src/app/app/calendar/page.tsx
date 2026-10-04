import type { Metadata } from "next";
import { CalendarConsole } from "./calendar-console";

export const metadata: Metadata = { title: "Calendar", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <>
      <h2>Calendar</h2>
      <p className="lede">
        What falls due in the next ninety days, derived from facts you supply. An obligation
        whose fact is missing is listed as unknown and names the fact — it is never given a
        date. A deadline computed from something nobody supplied is a fabricated figure,
        and this screen does not produce one.
      </p>
      <CalendarConsole />
    </>
  );
}
