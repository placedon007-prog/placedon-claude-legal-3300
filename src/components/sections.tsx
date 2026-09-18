import Link from "next/link";
import { LegalText } from "./brand";
import type {
  ContentLink,
  ContentSection,
  PageContent,
} from "@/lib/placedon-content/content/types";
export function Action({
  action,
  secondary = false,
}: {
  action: ContentLink;
  secondary?: boolean;
}) {
  return (
    <Link className={secondary ? "text-link" : "button"} href={action.href}>
      {action.label}
    </Link>
  );
}
export function PageHero({ page }: { page: PageContent }) {
  return (
    <div className="container page-hero">
      <p className="eyebrow">{page.eyebrow}</p>
      <h1>
        <LegalText>{page.headline}</LegalText>
      </h1>
      <p className="page-intro">
        <LegalText>{page.subhead}</LegalText>
      </p>
      <div className="action-row">
        <Action action={page.primaryCta} />
        <Action action={page.secondaryCta} secondary />
      </div>
    </div>
  );
}
export function ReadingSection({
  section,
}: {
  section: ContentSection;
}) {
  return (
    <section id={section.id} className="reading-section">
      <div className="container reading-grid">
        <div className="section-aside">
          <h2>
            <LegalText>{section.heading}</LegalText>
          </h2>
        </div>
        <div className="section-body">
        <p className="claim">
          <LegalText>{section.claim}</LegalText>
        </p>
        <p>
          <LegalText>{section.basis}</LegalText>
        </p>
        {section.items && (
          <div className="reading-items">
            {section.items.map((item) => (
              <div key={item.id} id={item.id}>
                <h3>
                  <LegalText>{item.heading}</LegalText>
                </h3>
                <p>
                  <LegalText>{item.claim}</LegalText>
                </p>
                <p className="small">
                  <LegalText>{item.basis}</LegalText>
                </p>
                {item.action && <Action action={item.action} secondary />}
              </div>
            ))}
          </div>
        )}
        {section.action && <Action action={section.action} secondary />}
        </div>
      </div>
    </section>
  );
}
export function ClosingInvitation() {
  return (
    <section className="closing-invitation container">
      <div>
        <span className="eyebrow">The next step</span>
        <h2>
          Put the standard
          <br />
          under review.
        </h2>
        <p>
          Describe a compliance workflow. Scope and terms must be agreed before
          participation.
        </p>
      </div>
      <div className="closing-actions">
        <Action
          action={{ label: "Request a pilot", href: "/waitlist?intent=pilot" }}
        />
        <Action
          action={{ label: "How Placedon works", href: "/how-it-works" }}
          secondary
        />
        <span className="small muted">
          Pre-launch. No access date promised.
        </span>
      </div>
    </section>
  );
}
