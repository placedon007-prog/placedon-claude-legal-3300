import { legalDocument, type LegalKind } from "@/lib/legal";
import { LegalDocument } from "./legal-document";
import { LegalToc } from "./legal-toc";
import { ScrollReveal } from "./scroll-reveal";
import { SiteNav, SiteFooter } from "./site-chrome";
import { systemContent } from "@/lib/placedon-content/content/system";
export function LegalPage({ kind }: { kind: LegalKind }) {
  let source = legalDocument(kind);
  if (kind === "cookies")
    source = `## Analytics

This site uses **Google Analytics 4** (provided by Google LLC) to understand, in aggregate, how the site is used: which pages are visited and where visitors arrive from. It is **off by default**. Nothing loads and no analytics cookies are set until you select **Accept analytics** on the consent banner.

When you accept, Google Analytics sets first-party cookies (\`_ga\` and \`_ga_*\`) that expire after up to two years. They hold a random identifier, not your name or email. Google may process this data on servers outside India, including the United States, under its own terms. The site does not use advertising, cross-site tracking, or session recording, and analytics never receives your email address, a workflow description, or URL query parameters.

## Your choice, and how to change it

Your accept-or-decline choice is stored on this device under \`placedon-analytics-consent\`. If you decline, Google Analytics never loads. To change your choice later, clear this site's data in your browser and the banner will appear again. Declining does not affect your ability to use the site.

## Appearance preference

Selecting an appearance stores \`placedon-theme\` in local storage on this device. The value is light or dark; it contains no contact details and authorises no tracking. It remains until replaced or removed through your browser's site-data controls.

## Requests and hosting

The site is hosted on Vercel, which may process an IP address and request information to deliver and protect the site. A request submitted through the form is delivered through Web3Forms, which forwards your submitted details by email to the operator's inbox. See the [privacy policy](/privacy) for who is responsible, retention, and your rights.

## Contact

Use the contact identified in the [privacy policy](/privacy) for any request concerning records already held. Browser storage controls do not delete records held by a website operator.`;
  const copy = systemContent.legalPages[kind];
  const headings = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  return (
    <div className="dash">
      <SiteNav />
      <ScrollReveal selector=".page-hero > *, .template-banner, .legal-body > *">
        <div className="container page-hero">
          <p className="eyebrow">Policies · Pre-launch</p>
          <h1>{copy.headline}</h1>
          <p className="page-intro">{copy.subhead}</p>
        </div>
        <div className="container">
          <aside className="template-banner">
            {copy.notice} Business details remain subject to confirmation before
            registration opens.
          </aside>
        </div>
        <div className="container legal-layout">
          <LegalToc headings={headings} />
          <LegalDocument source={source} />
        </div>
      </ScrollReveal>
      <SiteFooter />
    </div>
  );
}
