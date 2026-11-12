import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/terms");

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
