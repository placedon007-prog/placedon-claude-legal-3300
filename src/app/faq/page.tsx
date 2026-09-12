import { MarketingPage } from "@/components/marketing-page";
import { FaqAccordion } from "@/components/faq-accordion";
import {
  faqEntries,
  faqContent,
  faqCategories,
} from "@/lib/placedon-content/content/faq";
import { pageMetadata } from "@/lib/seo";
import "./faq.css";

export function generateMetadata() {
  return pageMetadata("/faq");
}

/**
 * Questions & limits. The scaffold renders the hero + two framing sections;
 * the category-filterable accordion carries the actual questions. The banned
 * "waitlist" CTA phrasing is not reproduced here — the page's CTAs come from
 * the shared pilot CTA via the scaffold.
 */
export default function FaqPage() {
  const { showAnswer, hideAnswer, allCategories, expandAll, collapseAll } =
    faqContent.microcopy;
  return (
    <MarketingPage page={faqContent}>
      <FaqAccordion
        entries={faqEntries}
        categories={faqCategories}
        labels={{ showAnswer, hideAnswer, allCategories, expandAll, collapseAll }}
      />
    </MarketingPage>
  );
}
