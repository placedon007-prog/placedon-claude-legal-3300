import type { Metadata } from "next";
import { AskThread } from "./ask-thread";

export const metadata: Metadata = { title: "Ask", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function AskPage() {
  return <AskThread />;
}
