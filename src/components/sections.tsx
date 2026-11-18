"use client";

import Link from "next/link";
import { Fragment } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LegalText } from "./brand";
import type {
  ContentLink,
  ContentSection,
  PageContent,
} from "@/lib/placedon-content/content/types";

/* Word-reveal heading for every marketing page — same clipped-word technique
   as the homepage's AnimatedH2. Replays each time it re-enters the viewport.
   Plain strings only — LegalText's substitutions run first. */
const EASE: [number, number, number, number] = [0.2, 0, 0, 1];
const headingContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const headingWord: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.46, ease: EASE } },
};
function RevealHeading({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;
  const words = text.split(" ");
  return (
    <motion.span
      style={{ display: "inline" }}
      variants={headingContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "-60px" }}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="dword">
            <motion.span className="dword-in" variants={headingWord}>
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
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
