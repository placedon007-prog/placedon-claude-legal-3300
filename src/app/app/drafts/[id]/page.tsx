import type { Metadata } from "next";
import Link from "next/link";
import { readVersions } from "../actions";
import { DraftConsole } from "./draft-console";

export const metadata: Metadata = { title: "Draft", robots: { index: false } };
export const dynamic = "force-dynamic";

/** `params` is a Promise in this version of Next and must be awaited. */
export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const read = await readVersions(id);

  if (!read.ok) {
    return (
      <>
        <h2>Draft</h2>
        {/* A draft that could not be read is a transport failure, in its own register. It
            is NOT an empty draft: an empty editor here would invite someone to type into a
            document whose current text nobody has seen. */}
        <div role="alert" className="transport-failure">
          <h3>This draft could not be read</h3>
          <p>{read.error.message}</p>
          <p className="meta">
            {read.error.kind} · {read.error.route}
            {read.error.status ? ` · HTTP ${read.error.status}` : ""}
          </p>
          <p className="meta">
            Nothing is shown rather than an empty editor — typing into a draft whose current
            text was never read is how a version gets overwritten.
          </p>
        </div>
        <p>
          <Link href="/app/drafts">Back to drafts</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2>{read.data.title}</h2>
      <p className="lede">
        Every save is a new version; nothing is edited in place. An edit carries the version
        it was based on, so a save from a stale tab is refused with both version numbers
        rather than overwriting a colleague&rsquo;s work.
      </p>
      <p className="meta">{read.data.draft_id}</p>
      <DraftConsole draft={read.data} />
    </>
  );
}
