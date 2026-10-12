import type { Metadata } from "next";
import Link from "next/link";
import { NewDraft } from "../drafts-new";

export const metadata: Metadata = { title: "New draft", robots: { index: false } };

export default function NewDraftPage() {
  return (
    <>
      <p className="meta"><Link href="/app/drafts">← Drafts</Link></p>
      <h2>New draft</h2>
      <p className="meta">Start with a title. No legal text or template is inserted for you.</p>
      <NewDraft />
      <p className="meta hosting-note">Draft templates remain DRAFT until approved by a lawyer.</p>
    </>
  );
}
