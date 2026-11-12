"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LegalText } from "./brand";
import type {
  ContentLink,
  ContentSection,
  PageContent,
} from "@/lib/placedon-content/content/types";

/* Word-reveal heading for every marketing page — the same clipped-word
   technique as the homepage's AnimatedH2, and like AnimatedH2 it's triggered
   by scroll (whileInView, once:false), so it replays every time: scroll
   down past it, scroll back up, scroll down again — it reveals again each
   time it re-enters the viewport (2026-10-29; an earlier mount-triggered
   version only ever played once per page load, which wasn't what was
   asked for). Used for the hero h1 and, since ReadingSection's h2 had no
   typography animation at all before, that too.
   Plain strings only — LegalText's typographic substitutions run first, this
   then splits the already-processed string into words. */
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
          <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.1em 0 0.18em", margin: "-0.1em 0 -0.18em" }}>
            <motion.span style={{ display: "inline-block" }} variants={headingWord}>
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
/* Motion graphics for the empty right side of every inner-page hero —
   replaces the brand-mark watermark (removed 2026-10-29, "don't add the
   Placedon logo"). Not a logo, not a stock image: a small animated diagram
   of the product's own evidence chain — provision, instrument, operative
   date — the path draws itself and each node arrives as the line reaches
   it, holds, then fades and loops. Monochrome, built from the same three
   words used throughout the site's copy. */
/* Four distinct motion pieces, one per inner page, replacing the single
   small evidence-chain motif every page shared before (2026-10-29: "use
   different animations on different pages... it's very small and short").
   Bigger canvas (320x420 vs the old 260x380, and the CSS box below is wider
   too), each tied to what that specific page is actually about rather than
   one generic diagram reused four times. Same loop shape throughout (draw
   in, hold, fade, pause, repeat) so they feel like one family. */
const OUTER_FADE = { opacity: [0, 1, 1, 0] };
const OUTER_TIMING = (dur: number) => ({
  duration: dur,
  times: [0, 0.08, 0.86, 1],
  repeat: Infinity,
  repeatDelay: 1.1,
});

/* /product — three evidence cards building into a stack, each gaining a
   citation rule as it lands. "Build" read literally: cards assemble. */
function ProductMotif() {
  const cards = [
    { x: 16, y: 210, rot: -7 },
    { x: 54, y: 150, rot: -2 },
    { x: 92, y: 90, rot: 4 },
  ];
  return (
    <motion.svg className="page-hero-chain" aria-hidden="true" viewBox="0 0 320 420" fill="none" animate={OUTER_FADE} transition={OUTER_TIMING(7)}>
      {cards.map((c, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: [0, 1, 1, 1, 0], y: [40, 0, 0, 0, 0] }}
          transition={{ duration: 7, times: [0.1 + i * 0.12, 0.3 + i * 0.12, 0.4 + i * 0.12, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
          style={{ transformOrigin: `${c.x + 95}px ${c.y + 60}px` }}
        >
          <rect x={c.x} y={c.y} width="190" height="120" rx="6" stroke="currentColor" strokeWidth="1.3" transform={`rotate(${c.rot} ${c.x + 95} ${c.y + 60})`} />
          <motion.line
            x1={c.x + 24} y1={c.y + 88} x2={c.x + 24 + 90} y2={c.y + 88}
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
            transform={`rotate(${c.rot} ${c.x + 95} ${c.y + 60})`}
            animate={{ pathLength: [0, 1, 1, 1, 0] }}
            transition={{ duration: 7, times: [0.3 + i * 0.12, 0.46 + i * 0.12, 0.55 + i * 0.12, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
          />
        </motion.g>
      ))}
    </motion.svg>
  );
}

/* /how-it-works — Ask / Verify / Cite / Abstain as a sequence, a pulse
   travelling the line and lighting each stage as it arrives. */
function ProcessMotif() {
  const stages = [
    { x: 40, y: 50, label: "Ask" },
    { x: 150, y: 150, label: "Verify" },
    { x: 60, y: 260, label: "Cite" },
    { x: 180, y: 360, label: "Abstain" },
  ];
  const path = "M40,50 C140,80 140,120 150,150 C160,190 70,230 60,260 C50,300 160,330 180,360";
  return (
    <motion.svg className="page-hero-chain" aria-hidden="true" viewBox="0 0 320 420" fill="none" animate={OUTER_FADE} transition={OUTER_TIMING(7.5)}>
      <motion.path
        d={path}
        stroke="currentColor"
        strokeWidth="1.3"
        animate={{ pathLength: [0, 1, 1, 1] }}
        transition={{ duration: 7.5, times: [0, 0.7, 0.86, 1], repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
      />
      {stages.map((s, i) => (
        <g key={s.label}>
          <motion.circle
            cx={s.x} cy={s.y} r="5" fill="currentColor"
            animate={{ scale: [0, 1.4, 1, 1, 0] }}
            transition={{ duration: 7.5, times: [0.12 + i * 0.16, 0.2 + i * 0.16, 0.28 + i * 0.16, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
            style={{ transformOrigin: `${s.x}px ${s.y}px` }}
          />
          <motion.text
            x={s.x + 14} y={s.y + 4} fontSize="13" fontFamily="var(--font-code), monospace" fill="currentColor"
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: 7.5, times: [0.12 + i * 0.16, 0.22 + i * 0.16, 0.3 + i * 0.16, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
          >
            {s.label}
          </motion.text>
        </g>
      ))}
    </motion.svg>
  );
}

/* /security — concentric rings drawing in from the outside, a lock settling
   at the centre once the last ring closes. */
function ShieldMotif() {
  const rings = [100, 72, 46];
  return (
    <motion.svg className="page-hero-chain" aria-hidden="true" viewBox="0 0 320 420" fill="none" animate={OUTER_FADE} transition={OUTER_TIMING(6.5)}>
      <g transform="translate(160,190)">
        {rings.map((r, i) => (
          <motion.circle
            key={r}
            cx="0" cy="0" r={r}
            stroke="currentColor"
            strokeWidth="1.2"
            animate={{ pathLength: [0, 1, 1, 1] }}
            transition={{ duration: 6.5, times: [0.1 + i * 0.14, 0.42 + i * 0.14, 0.86, 1], repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
            style={{ rotate: -90, transformOrigin: "0px 0px" }}
          />
        ))}
        <motion.g
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.6, 0.6, 1, 1, 0.6] }}
          transition={{ duration: 6.5, times: [0.5, 0.58, 0.68, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
          style={{ transformOrigin: "0px 0px" }}
        >
          <rect x="-11" y="-2" width="22" height="18" rx="3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M-6,-2 v-8 a6,6 0 0 1 12,0 v8" stroke="currentColor" strokeWidth="1.3" fill="none" />
        </motion.g>
      </g>
    </motion.svg>
  );
}

/* /pricing — one path forking into two routes, "Pilot" and "Waitlist" —
   matches "Two ways to take part. Neither is a subscription." */
function ForkMotif() {
  return (
    <motion.svg className="page-hero-chain" aria-hidden="true" viewBox="0 0 320 420" fill="none" animate={OUTER_FADE} transition={OUTER_TIMING(7)}>
      <motion.path
        d="M160,40 C160,110 160,120 160,150"
        stroke="currentColor" strokeWidth="1.3"
        animate={{ pathLength: [0, 1, 1, 1] }}
        transition={{ duration: 7, times: [0, 0.22, 0.86, 1], repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
      />
      <motion.path
        d="M160,150 C110,200 70,260 60,330"
        stroke="currentColor" strokeWidth="1.3"
        animate={{ pathLength: [0, 1, 1, 1] }}
        transition={{ duration: 7, times: [0.22, 0.52, 0.86, 1], repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
      />
      <motion.path
        d="M160,150 C210,200 250,260 260,330"
        stroke="currentColor" strokeWidth="1.3"
        animate={{ pathLength: [0, 1, 1, 1] }}
        transition={{ duration: 7, times: [0.22, 0.52, 0.86, 1], repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
      />
      {[
        { x: 160, y: 40, label: "Request", t: 0.1 },
        { x: 60, y: 330, label: "Pilot", t: 0.56 },
        { x: 260, y: 330, label: "Waitlist", t: 0.56 },
      ].map((n) => (
        <g key={n.label}>
          <motion.circle
            cx={n.x} cy={n.y} r="5" fill="currentColor"
            animate={{ scale: [0, 1.4, 1, 1, 0] }}
            transition={{ duration: 7, times: [n.t, n.t + 0.08, n.t + 0.14, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
          <motion.text
            x={n.x + 12} y={n.y + 4} fontSize="13" fontFamily="var(--font-code), monospace" fill="currentColor"
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: 7, times: [n.t, n.t + 0.1, n.t + 0.16, 0.86, 1], repeat: Infinity, repeatDelay: 1.1 }}
          >
            {n.label}
          </motion.text>
        </g>
      ))}
    </motion.svg>
  );
}

const PAGE_MOTIFS: Partial<Record<PageContent["route"], () => ReactNode>> = {
  "/product": ProductMotif,
  "/how-it-works": ProcessMotif,
  "/security": ShieldMotif,
  "/pricing": ForkMotif,
};

function PageHeroMotif({ route }: { route: PageContent["route"] }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const Motif = PAGE_MOTIFS[route];
  if (!Motif) return null;
  return <Motif />;
}

export function PageHero({ page }: { page: PageContent }) {
  return (
    <div className="container page-hero">
      <PageHeroMotif route={page.route} />
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
