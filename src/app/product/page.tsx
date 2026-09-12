import { MarketingPage } from "@/components/marketing-page";
import { productContent } from "@/lib/placedon-content/content/product";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/product");
}

/**
 * Product concept page.
 *
 * The content module carries six sections (the answer record, statutory
 * currency, the compliance pack, company standing, the event log, and the
 * abstain state), each rendered by the shared scaffold's ReadingSection. That
 * already reads as a complete product overview, so no page-specific block is
 * added here — the answer-classes explainer lives on /how-it-works, where the
 * content dedicates a section to it.
 */
export default function ProductPage() {
  return <MarketingPage page={productContent} />;
}
