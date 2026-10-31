import type { Metadata } from "next";
import Link from "next/link";
import { readVersions } from "../actions";
import { sessionKind } from "@/lib/auth/config";
import { isRefusal } from "@/lib/gateway/types";
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
  // An unknown or inaccessible id is a 404 refusal, parsed as data: it has no versions, and
  // rendering the editor from it crashed the page (HTTP 500, "reading 'length'").
  if (read.ok && isRefusal(read.data)) {
    return (
      <>
        <h1>Draft</h1>
        <div role="status" className="panel register-abstain">
          <span className="register-label">Not available — {read.data.code}</span>
          <p>{read.data.detail}</p>
        </div>
        <p>
          <Link href="/app/drafts">Back to drafts</Link>
        </p>
      </>
    );
  }

  if (!read.ok) {
    return (
      <>
        <h1>Draft</h1>
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
      <h1>{read.data.title}</h1>
      <p className="lede">
        Every save is a new version; nothing is edited in place. An edit carries the version
        it was based on, so a save from a stale tab is refused with both version numbers
        rather than overwriting a colleague&rsquo;s work.
      </p>
      <p className="meta">{read.data.draft_id}</p>
      <DraftConsole draft={read.data} account={sessionKind() === "account"} />
    </>
  );
}
