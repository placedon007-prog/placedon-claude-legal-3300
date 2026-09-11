import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/cookies");

export default function CookiesPage() {
  return <LegalPage kind="cookies" />;
}
