import type { Metadata } from "next";
import { DocumentConsole } from "./document-console";

export const metadata: Metadata = { title: "Documents", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return (
    <>
      <h1>Documents</h1>
      <p className="lede">
        Check board minutes and meeting notices against the Secretarial Standards — for example, paste the minutes of a board meeting.
      </p>
      <DocumentConsole />
    </>
  );
}
