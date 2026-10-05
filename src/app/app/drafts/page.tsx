import type { Metadata } from "next";
import { NewDraft } from "./drafts-new";

export const metadata: Metadata = { title: "Drafts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function DraftsPage() {
  return (
    <>
      <h2>Drafts</h2>
      <p className="lede">
        A draft is a sequence of versions, not a document that changes. Text a model wrote is
        marked as a suggestion and blocks approval until a person accepts it — so nothing
        reaches a filing because it was never read.
      </p>
      <NewDraft />
      <p className="meta">
        There is no list of drafts: the gateway has no list-drafts verb, and a list built
        from this browser&rsquo;s history would look complete without being so. Open a draft
        by its id at <code>/app/drafts/&lt;id&gt;</code>.
      </p>
    </>
  );
}
