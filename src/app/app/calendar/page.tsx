import type { Metadata } from "next";
import { CalendarConsole } from "./calendar-console";

export const metadata: Metadata = { title: "Calendar", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <>
      <h1>Calendar</h1>
      <p className="lede">
        See what falls due in the next 90 days from your company&rsquo;s dates — for example, the annual general meeting.
      </p>
      <CalendarConsole />
    </>
  );
}
