"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LegalText } from "./brand";
import type {
  ContentLink,
  ContentSection,
  PageContent,
} from "@/lib/placedon-content/content/types";

/* Text settles as the reader arrives on the page.

   One short rise, played once, on the hero headline and on each section
   heading as it comes into view. It is deliberately not a word-by-word
   stagger: a headline assembling itself one word at a time performs rather
   than states, which is the wrong register for a page about statutory
   evidence.

   It starts at --reveal-floor (0.55), never at opacity 0 — below roughly
   alpha 0.48 the text drops under the 4.5:1 AA floor, so a fade from zero
   puts an unreadable heading on screen for the length of the transition
   and server-renders it invisible. */
const EASE: [number, number, number, number] = [0.2, 0, 0, 1];
const REVEAL_FLOOR = 0.55;

function Settle({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.span
      style={{ display: "inline-block" }}
      initial={{ opacity: REVEAL_FLOOR, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.24, delay, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}

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
      <p className="eyebrow">
        <Settle>{page.eyebrow}</Settle>
      </p>
      <h1>
        <Settle delay={0.05}>
          <LegalText>{page.headline}</LegalText>
        </Settle>
      </h1>
      <p className="page-intro">
        <Settle delay={0.1}>
          <LegalText>{page.subhead}</LegalText>
        </Settle>
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
            <Settle>
              <LegalText>{section.heading}</LegalText>
            </Settle>
          </h2>
        </div>
        <div className="section-body">
        <p className="claim">
          <Settle delay={0.05}>
            <LegalText>{section.claim}</LegalText>
          </Settle>
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
