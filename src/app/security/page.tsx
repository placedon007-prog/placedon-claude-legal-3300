import { MarketingPage } from "@/components/marketing-page";
import { securityContent } from "@/lib/placedon-content/content/security";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/security");
}

/**
 * Data-handling & source-discipline page. Five sections (source discipline,
 * data minimisation, no-training policy, the pre-pilot review with nested
 * items, and an explicit "what this site does not establish"), all rendered by
 * the shared scaffold. The hero itself carries the honesty framing — this page
 * states a proposed standard, it does not certify a deployed environment.
 */
export default function SecurityPage() {
  return <MarketingPage page={securityContent} />;
}
