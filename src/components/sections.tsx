"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LegalText } from "./brand";
import type {
  ContentLink,
  ContentSection,
  PageContent,
} from "@/lib/placedon-content/content/types";

/* Headings settle once, as a whole.

   This replaced a word-by-word staggered reveal that re-played every time a
   heading re-entered the viewport. Two problems with that: a headline
   assembling itself one word at a time is theatrical rather than
   authoritative — the wrong register for a page about statutory evidence —
   and replaying it on every scroll pass drew the eye back to text the reader
   had already read. A single short settle, played once, reads as the page
   arriving rather than performing.

   It MOVES rather than fades. Any opacity below roughly 0.48 puts the text
   under the 4.5:1 AA floor, a fade from zero also server-renders the heading
   invisible, and because this replays on every scroll pass the faded state
   would be on screen often. Animating transform alone keeps every heading at
   full contrast throughout.

   Plain strings only — LegalText's typographic substitutions run first. */
const EASE: [number, number, number, number] = [0.2, 0, 0, 1];
function RevealHeading({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;
  return (
    <motion.span
      style={{ display: "inline-block" }}
      initial={{ y: 10 }}
      whileInView={{ y: 0 }}
      viewport={{ once: false, margin: "-60px" }}
      transition={{ duration: 0.24, ease: EASE }}
    >
      {text}
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
      {page.eyebrow && <p className="eyebrow">{page.eyebrow}</p>}
      <h1>
        <RevealHeading text={page.headline} />
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
            <RevealHeading text={section.heading} />
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
