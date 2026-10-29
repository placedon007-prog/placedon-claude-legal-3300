import type { Metadata } from "next";
import Link from "next/link";
import { NewDraft } from "../drafts-new";

export const metadata: Metadata = { title: "New draft", robots: { index: false } };

export default function NewDraftPage() {
  return (
    <>
      <p className="meta"><Link href="/app/drafts">← Drafts</Link></p>
      <h1>Start a draft manually</h1>
      <p className="meta">This saves the text you provide. To generate a research memo from cited evidence, <Link href="/app">start in Ask</Link>, review the answer, and choose its draft action.</p>
      <NewDraft />
      <p className="meta hosting-note">Draft templates remain DRAFT until approved by a lawyer.</p>
    </>
  );
}
