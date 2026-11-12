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

Optional analytics is disabled in this build. No Google Analytics script or analytics event collector is loaded, and the site does not set new analytics cookies. The legal workspace and sign-in screen are excluded from marketing analytics.

Marketing pages and the legal workspace currently share an origin. Collection remains disabled until their browser documents can be isolated and that isolation has been verified.

## Existing choices and browser storage

An analytics choice or cookies from an earlier version may remain on this device. They do not enable collection in this build. You may remove them through your browser's site-data controls; doing so does not delete records held by the operator.

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
