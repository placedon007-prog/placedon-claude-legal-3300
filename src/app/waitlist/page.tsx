import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { RequestForm } from "@/components/request-form";
import { LegalText } from "@/components/brand";
import { intakeConfiguration } from "@/lib/intake";
import { waitlistContent, formContent } from "@/lib/placedon-content/content/waitlist";
import { pageMetadata } from "@/lib/seo";
import "./waitlist.css";

export function generateMetadata() {
  return pageMetadata("/waitlist");
}

/**
 * Request page (pilot discussion / register interest).
 *
 * The form's enable flag and the notice/consent versions come from
 * `intakeConfiguration()` — the same server-only source the API route uses — so
 * the page can never claim registration is open when the environment says it is
 * not. Pre-launch, `enabled` is false and the form renders its closed state.
 * `?intent=pilot` selects the pilot tab; the default is the pilot path.
 */
export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const initialIntent = intent === "waitlist" ? "waitlist" : "pilot";
  const { enabled, noticeVersion, consentVersion } = intakeConfiguration();

  return (
    <div className="dash">
      <SiteNav />
      <main id="main-content">
        <div className="container page-hero">
          <p className="eyebrow">{waitlistContent.eyebrow}</p>
          <h1>
            <LegalText>{waitlistContent.headline}</LegalText>
          </h1>
          <p className="page-intro">
            <LegalText>{waitlistContent.subhead}</LegalText>
          </p>
        </div>
        <div className="container waitlist-layout">
          <RequestForm
            initialIntent={initialIntent}
            enabled={enabled}
            noticeVersion={noticeVersion || formContent.privacyNoticeVersion}
            consentVersion={consentVersion || formContent.consentVersion}
          />
          <aside className="waitlist-aside" aria-label="Before you send a request">
            <p className="eyebrow">Before you send</p>
            <p>
              <LegalText>{waitlistContent.microcopy.noPayment}</LegalText>
            </p>
            <p className="waitlist-aside-note">
              <LegalText>{waitlistContent.microcopy.sensitiveData}</LegalText>
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
