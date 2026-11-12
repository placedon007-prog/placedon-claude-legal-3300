import type { ReactNode } from "react";
import type { PageContent } from "@/lib/placedon-content/content/types";
import { SiteNav, SiteFooter } from "./site-chrome";
import { PageHero, ReadingSection } from "./sections";
import { ScrollReveal } from "./scroll-reveal";

/**
 * Shared scaffold for every marketing route (/product, /pricing, /about, …).
 *
 * Gives each page the same dark chrome, the editorial page-hero, and
 * reveal-on-scroll sections, so the multi-page site reads as one system rather
 * than a set of separately-built pages. Reveals lift from the 0.55 opacity
 * floor (never invisible) and render their final state under reduced motion.
 *
 * `children` renders after the content sections — use it for page-specific
 * blocks (pricing tiers, an FAQ accordion, a security matrix) that the generic
 * ReadingSection cannot express. Anything inside `.reading-section`,
 * `.page-hero`, or a `[data-reveal-block]` element is picked up by the reveal.
 */
export function MarketingPage({
  page,
  children,
}: {
  page: PageContent;
  children?: ReactNode;
}) {
  return (
    <div className="dash">
      <SiteNav />
      <main id="main-content" className="marketing-main">
        <ScrollReveal selector=".page-hero > *, .reading-section, [data-reveal-block]">
          <PageHero page={page} />
          {page.sections.map((section) => (
            <ReadingSection key={section.id} section={section} />
          ))}
          {children}
        </ScrollReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
