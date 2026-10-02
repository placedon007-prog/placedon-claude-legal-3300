import type { Metadata } from "next";
import { AskConsole } from "./ask-console";

export const metadata: Metadata = { title: "Ask", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <h2>Ask</h2>
      <p className="lede">
        One question against the held statute. Every sentence served carries the provision
        it was read from and the character span within it. Where the question reaches law
        this corpus does not hold, the answer is a named refusal — not a guess.
      </p>
      <AskConsole />
    </>
  );
}
