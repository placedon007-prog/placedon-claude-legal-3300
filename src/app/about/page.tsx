import { MarketingPage } from "@/components/marketing-page";
import { aboutContent } from "@/lib/placedon-content/content/about";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata("/about");
}

/**
 * Purpose & accountability page. The content module carries five sections
 * (purpose, the witness model, building in the open, contact, and the
 * data-request boundary), each rendered by the shared scaffold's
 * ReadingSection — a complete overview with no page-specific block needed.
 */
export default function AboutPage() {
  return <MarketingPage page={aboutContent} />;
}
