import { MarketingPage } from "@/components/marketing-page";
import { Action } from "@/components/sections";
import { LegalText } from "@/components/brand";
import { pricingContent } from "@/lib/placedon-content/content/pricing";
import type { ContentLink } from "@/lib/placedon-content/content/types";
import { pageMetadata } from "@/lib/seo";
import "./pricing.css";

export function generateMetadata() {
  return pageMetadata("/pricing");
}

/**
 * The two participation routes shown side by side. The generic ReadingSection
 * renders the same information as prose above; this block is the at-a-glance
 * commercial position the section copy cannot express in one view.
 *
 * Neither route quotes a subscription tariff or a statutory figure — the price
 * lines are the exact microcopy strings, so no fabricated number is shown. The
 * waitlist CTA is relabelled "Register interest": the shared content module's
 * link label is the retired banned phrase, which this page does not reproduce.
 */
const registerInterestCta: ContentLink = {
  label: "Register interest",
  href: "/waitlist",
};

function ParticipationTiers() {
  const { microcopy, primaryCta } = pricingContent;
  return (
    <section
      className="container pricing-tiers"
      aria-labelledby="pricing-tiers-title"
      data-reveal-block
    >
      <div className="pricing-tiers-head">
        <p className="eyebrow">Participation routes</p>
        <h2 id="pricing-tiers-title">
          <LegalText>Two ways to take part. Neither is a subscription.</LegalText>
        </h2>
      </div>

      <div className="pricing-tier-grid">
        <article className="pricing-tier" data-primary="true">
          <h3 className="pricing-tier-name">
            <LegalText>Pilot participation</LegalText>
          </h3>
          <p className="pricing-tier-price">
            <LegalText>{microcopy.pilotPrice}</LegalText>
          </p>
          <p className="pricing-tier-desc">
            <LegalText>
              A discussion about a defined compliance workflow. Proposed scope,
              evaluation criteria, data handling, duration, and any fee are
              agreed before access.
            </LegalText>
          </p>
          <p className="pricing-tier-note">
            <LegalText>Sending a request does not reserve a place.</LegalText>
          </p>
          <div className="pricing-tier-cta">
            <Action action={primaryCta} />
          </div>
        </article>

        <article className="pricing-tier">
          <h3 className="pricing-tier-name">
            <LegalText>Waitlist</LegalText>
          </h3>
          <p className="pricing-tier-price">
            <LegalText>{microcopy.waitlistPrice}</LegalText>
          </p>
          <p className="pricing-tier-desc">
            <LegalText>
              Contact details recorded for access updates. It does not purchase
              a subscription or guarantee admission.
            </LegalText>
          </p>
          <p className="pricing-tier-note">
            <LegalText>{microcopy.payment}</LegalText>
          </p>
          <div className="pricing-tier-cta">
            <Action action={registerInterestCta} secondary />
          </div>
        </article>
      </div>

      <dl className="pricing-notes">
        <div className="pricing-note">
          <dt>Published tariff</dt>
          <dd>
            <LegalText>{microcopy.pricingStatus}</LegalText>
          </dd>
        </div>
        <div className="pricing-note">
          <dt>Launch date</dt>
          <dd>
            <LegalText>{microcopy.timeline}</LegalText>
          </dd>
        </div>
        <div className="pricing-note">
          <dt>Access</dt>
          <dd>
            <LegalText>{microcopy.access}</LegalText>
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default function PricingPage() {
  return (
    <MarketingPage page={pricingContent}>
      <ParticipationTiers />
    </MarketingPage>
  );
}
