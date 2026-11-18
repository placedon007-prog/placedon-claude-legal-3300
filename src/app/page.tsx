"use client";

import Link from "next/link";
import { useState, useRef, useEffect, Fragment, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useInView,
  type Variants,
} from "framer-motion";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { track } from "@/lib/track";
import "./dashboard.css";

/* ---------------------------- heading with word-reveal typography
   Words rise from behind a clipped edge, one after another. Each word is
   painted at full contrast or not at all (no fade), so text stays AA. */
const EASE: [number, number, number, number] = [0.2, 0, 0, 1];

const h2Container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const h2Word: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.42, ease: EASE } },
};

function AnimatedH2({
  children,
  as = "h2",
}: {
  children: string;
  as?: "h1" | "h2";
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  if (reduce) return <Tag>{children}</Tag>;
  const MotionTag = as === "h1" ? motion.h1 : motion.h2;
  const words = children.split(" ");
  return (
    <MotionTag
      variants={h2Container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "-70px" }}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="dword">
            <motion.span className="dword-in" variants={h2Word}>
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </MotionTag>
  );
}

/* ---------------------------------------- hero video (autoplay on view) */
function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // ensure muted so autoplay is allowed
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) v.play().catch(() => {});
  };
  return (
    <div className="dhero-video">
      <video
        ref={ref}
        src="/media/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onVolumeChange={() => {
          const v = ref.current;
          if (v) setMuted(v.muted);
        }}
      />
      <div className="dvideo-controls">
        <button
          className="dvideo-btn"
          onClick={togglePlay}
          aria-label={paused ? "Play video" : "Pause video"}
        >
          {paused ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7-11-7Z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M8 5v14M16 5v14" />
            </svg>
          )}
        </button>
        <button
          className="dvideo-btn"
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <path d="M22 9l-6 6M16 9l6 6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <path d="M16 9a3 3 0 0 1 0 6M19 7a7 7 0 0 1 0 10" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- reveal */
/**
 * Scroll reveal.
 *
 * Reveals MOVE; they do not fade. Any opacity below roughly 0.48 puts cream
 * on ink under the 4.5:1 AA floor, and even 0.55 reads as washed-out grey on
 * the black sections — which is on screen often, because the reveal replays
 * on every pass. Animating transform alone keeps text at full contrast.
 *
 * The old `` opt-out is gone with the fade it existed to avoid:
 * an ancestor at opacity < 1 becomes a backdrop root, which silently kills
 * `backdrop-filter` on any glass inside it. Nothing changes opacity now, so
 * glass is safe everywhere.
 *
 * Replays (`once: false`): scrolling back up and down again re-runs it, which
 * is what the owner asked for. It is safe to replay because the reveal never
 * drops below --reveal-floor (0.55) — a re-hidden block stays readable rather
 * than blinking out.
 */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  // Reduced motion renders the final state — no movement, no fade.
  const variants: Variants = reduce
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { y: 28 },
        show: {
          y: 0,
          transition: { duration: 0.5, delay, ease: EASE },
        },
      };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "-70px" }}
    >
      {children}
    </motion.div>
  );
}

const principles = [
  {
    step: "01 · Explain",
    title: "The model explains",
    body: "It translates a pre-verified packet into plain English. It never makes the decision.",
  },
  {
    step: "02 · Decide",
    title: "Code decides",
    body: "Whether a duty applies is decided by plain, deterministic code. You can test it without a network, and it gives the same result every time.",
  },
  {
    step: "03 · Verify",
    title: "The record verifies",
    body: "Nothing reaches you while it is unverified. Abstention is the honest default, not an error.",
  },
];

type Demo = {
  tab: string;
  title: string;
  meta: string;
  blocks: { h: string; p: ReactNode; note?: ReactNode }[];
  prompt: string;
  connectors: string[];
};
const demos: Demo[] = [
  {
    tab: "AGM timing",
    title: "Compliance Note",
    meta: "Note No. PL-2026-014 · Companies Act, 2013",
    blocks: [
      {
        h: "1. The rule",
        p: (
          <>
            Almost every company must hold an Annual General Meeting each year,
            and no more than fifteen months can pass between two of them. This
            comes from <strong className="dcite section-reference">Section 96(1)</strong>.
          </>
        ),
      },
      {
        h: "2. For this company",
        p: (
          <>
            The meeting has to happen within six months of the financial
            year&rsquo;s end. For the year ending{" "}
            <span className="dcite">2026-03-31</span>, the last allowed date is{" "}
            <span className="dcite">2026-09-30</span>.
          </>
        ),
        note: "This company was set up before this financial year, so the extra time first-year companies get does not apply. No extension from the Registrar is on record.",
      },
    ],
    prompt:
      "Does our AGM deadline hold for FY 2025-26, and what is the exact date?",
    connectors: ["MCA21 Portal", "Board minutes"],
  },
  {
    tab: "Board meetings",
    title: "Compliance Note",
    meta: "Note No. PL-2026-021 · Companies Act, 2013",
    blocks: [
      {
        h: "1. The rule",
        p: (
          <>
            A company must hold at least four board meetings a year, and no more
            than 120 days can pass between any two of them. This comes from{" "}
            <strong className="dcite section-reference">Section 173(1)</strong>.
          </>
        ),
      },
      {
        h: "2. For this company",
        p: (
          <>
            Three meetings have been held so far. It has been{" "}
            <span className="dcite">96 days</span> since the last one, and one
            more is due before <span className="dcite">2026-10-14</span>.
          </>
        ),
      },
    ],
    prompt: "Are we on track for the Section 173 board-meeting cadence this year?",
    connectors: ["Board minutes", "Secretarial software"],
  },
  {
    tab: "Small-company status",
    title: "Compliance Note",
    meta: "Note No. PL-2026-030 · Companies Act, 2013",
    blocks: [
      {
        h: "1. The rule",
        p: (
          <>
            A &ldquo;small company&rdquo; is one whose capital and turnover stay
            under the limits set in <strong className="dcite section-reference">Section 2(85)</strong>.
            Being small means lighter rules apply, so the status matters.
          </>
        ),
      },
      {
        h: "2. For this company",
        p: (
          <>
            Placedon does not answer this one, and it will not guess. It
            confirms a status only when it can prove it.
          </>
        ),
        note: (
          <>
            The size limits now come from a government notification,{" "}
            <span className="dcite">G.S.R. 880(E)</span>, in force from{" "}
            <span className="dcite">2025-12-01</span>. This company&rsquo;s
            paid-up capital and turnover are not on record, so its status stays
            unconfirmed.
          </>
        ),
      },
    ],
    prompt: "Is the company a small company for FY 2025-26?",
    connectors: ["MCA21 Portal", "Financials"],
  },
  {
    tab: "Board's report",
    title: "Compliance Note",
    meta: "Note No. PL-2026-037 · Companies Act, 2013",
    blocks: [
      {
        h: "1. The rule",
        p: (
          <>
            A company&rsquo;s yearly Board&rsquo;s Report must include a set of
            disclosures listed in Rule 8. One of them, a statement on preventing
            sexual harassment at work under{" "}
            <span className="dcite">Rule 8(5)(x)</span>, applies to every
            company except One Person Companies and small companies.
          </>
        ),
      },
      {
        h: "2. For this company",
        p: (
          <>
            This company is not recorded as a small company, so that disclosure
            applies to it and must be included.
          </>
        ),
      },
    ],
    prompt: "Draft the Board's-report disclosures that attach to us.",
    connectors: ["Registers", "Board minutes"],
  },
  {
    tab: "Registers",
    title: "Compliance Note",
    meta: "Note No. PL-2026-041 · Companies Act, 2013",
    blocks: [
      {
        h: "1. The rule",
        p: (
          <>
            Every company has to keep certain official registers at its
            registered office, covering its members, debenture-holders, and
            other security holders. This is required by{" "}
            <strong className="dcite section-reference">Section 88</strong>.
          </>
        ),
      },
      {
        h: "2. For this company",
        p: (
          <>
            The register of members is in place. The register of charges,
            required by <strong className="dcite section-reference">Section 85</strong>, could not be found,
            so it is flagged for review.
          </>
        ),
      },
    ],
    prompt: "Which statutory registers are missing from our record?",
    connectors: ["MCA21 Portal", "Registers"],
  },
];

const tools = [
  {
    title: "Placedon for Word",
    body: "Check the document open in Word against the law held for its date, clause by clause, with each section and operative date shown. The add-in reads: it never edits your text or formatting.",
    href: "/product",
  },
  {
    title: "Placedon Matrix",
    body: "Hand off a company and get back the full obligation matrix, with one row per duty, marked attaches, met, or missing.",
    href: "/product/compliance-pack",
  },
  {
    title: "Annual filing checks",
    body: "Whether the financial statements (AOC-4, Section 137) and the annual return (MGT-7, Section 92) were filed in time, decided from the filing dates you supply.",
    href: "/product",
  },
  {
    title: "Platform",
    body: "Integrate Placedon into your secretarial or GRC stack through the API and the evidence contract. It is built for Indian corporate-law workflows.",
    href: "/how-it-works",
  },
];

const build = [
  {
    title: "MCP for statutory data",
    body: "Thirteen read-only tools over Placedon's engine through the open Model Context Protocol, so an agent receives the same answers, and the same refusals, as the API. No tool writes anything.",
  },
  {
    title: "Deterministic engine",
    body: "Every applicability decision is pure code, testable without a network. The model explains; it never decides.",
  },
  {
    title: "Built for India's data law",
    body: "Designed to hold data under India's DPDP Act, 2023: no personal data beyond what a request needs, an audit trail on every answer, and abstention wherever the source is missing.",
  },
];

const resources = [
  { title: "How the record works", kind: "Explainer" },
  { title: "When Placedon abstains", kind: "Explainer" },
  { title: "Source defects, preserved verbatim", kind: "Reference" },
  { title: "The frozen benchmark", kind: "Reference" },
  { title: "AGM timing, end to end", kind: "Walkthrough" },
  { title: "Reading the obligation matrix", kind: "Guide" },
];

const toolIcons: Record<string, ReactNode> = {
  "Placedon for Word": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <path d="M15 3v4h4" strokeLinejoin="round" />
      <path d="M9 13.5 10.5 17 12 14l1.5 3 1.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Placedon Matrix": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="3.5" y1="16" x2="20.5" y2="16" />
      <line x1="10.5" y1="3.5" x2="10.5" y2="20.5" />
    </svg>
  ),
  "Annual filing checks": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="7.5" y1="3" x2="7.5" y2="6.5" strokeLinecap="round" />
      <line x1="16.5" y1="3" x2="16.5" y2="6.5" strokeLinecap="round" />
      <path d="M8 14.5 10.5 17 16 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Platform: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="12" cy="19" r="2.5" />
      <path d="M7.2 7.1 10.3 17M16.8 7.1 13.7 17M7.3 6H16.7" />
    </svg>
  ),
};

const connectorIcons: Record<string, ReactNode> = {
  "MCA21 Portal": (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
    </svg>
  ),
  "Board minutes": (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
      <line x1="9" y1="12" x2="16" y2="12" />
      <line x1="9" y1="16" x2="16" y2="16" />
    </svg>
  ),
  "Secretarial software": (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3.5" y="5" width="17" height="12" rx="1.5" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="17" x2="12" y2="20" />
    </svg>
  ),
  Financials: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 18 9 11l4 3 7-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Registers: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  ),
};

/* small helper: ledger index eyebrow */
function Index({ n, label }: { n: string; label: string }) {
  return (
    <div className="dindex">
      <b>{n}</b> · {label}
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function DashboardPage() {
  const [tab, setTab] = useState(0);
  const reduce = useReducedMotion();
  const active = demos[tab];

  /* The tabs advance themselves every 2 seconds — AGM timing, board
     meetings, and on — while the section is on screen.

     Two things keep that from trapping the reader, which is what WCAG 2.2.2
     requires of anything that moves on its own for more than five seconds.
     Pointing at the panel stops it, so the moment you lean in to read, it
     holds. Choosing a tab by hand stops it for good: the reader has taken
     over and nothing should take the wheel back. Under reduced motion it
     never starts. */
  const demoSectionRef = useRef<HTMLElement>(null);
  const demoInView = useInView(demoSectionRef, { amount: 0.4 });
  /* Two separate reasons to stop, deliberately not one flag: hovering is a
     pause that ends when the pointer leaves, choosing a tab is permanent. */
  const [demoHovered, setDemoHovered] = useState(false);
  const [demoTakenOver, setDemoTakenOver] = useState(false);

  useEffect(() => {
    if (!demoInView || demoHovered || demoTakenOver || reduce) return;
    const id = setInterval(() => {
      setTab((t) => (t + 1) % demos.length);
    }, 2000);
    return () => clearInterval(id);
  }, [demoInView, demoHovered, demoTakenOver, reduce]);

  function selectTab(i: number) {
    setTab(i);
    track("demo_tab_view", { tab: demos[i].tab });
    setDemoTakenOver(true); // the reader has taken over; do not resume
  }

  return (
    <div className="dash">
      {/* NAV */}
      <SiteNav />

      {/* breadcrumb */}
      <div className="dcrumb" id="top">
        <div className="dash-container dcrumb-inner">
          <span>
            Placedon <span className="sep">/</span> Indian corporate law
          </span>
          <a href="#evidence" className="dcrumb-here" aria-label="Explore: scroll to the product in practice">
            Explore here
          </a>
        </div>
      </div>

      {/* HERO — centred type on the cream ground, no image and no entrance
          animation. It is the first thing on the page: there is nothing to
          reveal it from, and a hero that fades in delays the one statement
          the site exists to make. */}
      <section className="dhero-img dsection-flush">
        <div className="dash-container dhero-img-inner">
          <div className="dhero-img-text">
            <span className="eyebrow">
              Research · Compliance · Monitoring · Drafting
            </span>
            <AnimatedH2 as="h1">The evidence-first workspace for Indian corporate law.</AnimatedH2>
            <p className="lead">
              Placedon brings research, compliance, monitoring, and drafting
              into one place for corporate teams and their lawyers. Every answer
              and every clause traces back to the exact provision, the
              instrument that changed it, and the date it took effect. When
              Placedon cannot verify something, it abstains.
            </p>
            <div className="dhero-img-actions">
              <Link
                href="/waitlist?intent=pilot"
                className="dbtn dbtn-solid"
                onClick={() => track("request_pilot_click", { location: "hero" })}
              >
                Request a pilot
              </Link>
              <Link
                href="#evidence"
                className="dbtn dbtn-ghost"
                onClick={() => track("see_evidence_click", { location: "hero" })}
              >
                See the evidence
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HERO VIDEO — reveals on scroll, below the first screen */}
      <section className="dash-container dsection dhero-media dsection-flush">
        <Reveal>
          <HeroVideo />
        </Reveal>
      </section>

      {/* INTERACTIVE DEMO */}
      <section
        id="evidence"
        ref={demoSectionRef}
        className="dash-container dsection"
        onMouseEnter={() => setDemoHovered(true)}
        onMouseLeave={() => setDemoHovered(false)}
      >
        <Reveal>
          <div className="dcenter" style={{ marginBottom: 44 }}>
            <Index n="01" label="In practice" />
            <AnimatedH2>How compliance teams use Placedon</AnimatedH2>
            <p className="ddemo-caption">
              Illustrative example. The sample data shows the format, not a live
              answer for a real company.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="ddemo-tabs" role="tablist" aria-label="Use cases">
            {demos.map((d, i) => (
              <button
                key={d.tab}
                role="tab"
                aria-selected={i === tab}
                data-active={i === tab}
                className="ddemo-tab"
                onClick={() => selectTab(i)}
              >
                {d.tab}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className="ddemo-stage">
            <div className="ddoc">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  className="ddoc-paper"
                  /* A plain crossfade. The blur(6px) materialise this
                     replaced was a visual effect for its own sake — switching
                     tabs is a swap of content, not a dissolve, and the blur
                     made the document unreadable for a third of a second each
                     time. 180ms is inside the ≤250ms budget. */
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                >
                  <h4>{active.title}</h4>
                  <div className="ddoc-meta mono">{active.meta}</div>
                  {active.blocks.map((b, i) => (
                    <div key={i}>
                      <div className="ddoc-h">{b.h}</div>
                      <p className="ddoc-p">{b.p}</p>
                      {b.note && <div className="ddoc-note">{b.note}</div>}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="dcol">
              <div className="dcard">
                <div className="dcard-label">Prompt</div>
                <div className="dcard-prompt">{active.prompt}</div>
              </div>
              <div className="dcard">
                <div className="dcard-label">Connectors</div>
                {active.connectors.map((c) => (
                  <div className="dconn" key={c}>
                    <span className="dconn-mark">{connectorIcons[c]}</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* TOOLS */}
      <section id="tools" className="dash-container dsection">
        <Reveal>
          <div className="dcenter" style={{ marginBottom: 20 }}>
            <Index n="02" label="Tools" />
            <AnimatedH2>Tools made for the way you work</AnimatedH2>
          </div>
        </Reveal>
        <div className="dtools-grid">
          {tools.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="dtool-card">
                <span className="dtool-icon">{toolIcons[f.title]}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <Link href={f.href ?? "/product"} className="dbtn dbtn-link">
                  Learn more
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRINCIPLES — the golden rule */}
      <section className="dash-container dsection">
        <Reveal>
          <div className="dcenter" style={{ marginBottom: 44 }}>
            <Index n="03" label="The standard" />
            <AnimatedH2>The model may propose. The system must verify.</AnimatedH2>
          </div>
        </Reveal>
        <div className="prin-grid">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07} className="prin-card">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="prin-step">{p.step}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* BUILD */}
      <section className="dash-container dsection">
        <Reveal>
          <div className="dcenter">
            <Index n="04" label="Platform" />
            <AnimatedH2>Build legal products with Placedon</AnimatedH2>
            <p className="lead" style={{ marginTop: 22 }}>
              Embed the record into your platform through the API and the
              evidence contract.
            </p>
          </div>
        </Reveal>
        <div className="dbuild-grid">
          {build.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.06} className="dbuild-col">
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* RESOURCES — motif + serif title */}
      <section id="resources" className="dash-container dsection">
        <Reveal>
          <div className="dcenter">
            <Index n="05" label="Evidence" />
            <AnimatedH2>Evidence &amp; resources</AnimatedH2>
          </div>
        </Reveal>
        {/* One row, travelling continuously, pausing under the cursor.

            The list renders twice back to back and the track moves exactly
            half its width, so the loop point is invisible. The pause is pure
            CSS on :hover and :focus-within — the focus half matters, because
            a keyboard user needs a way to stop it too, and that is what makes
            continuous motion acceptable rather than something the reader is
            trapped in (WCAG 2.2.2). Under prefers-reduced-motion the track
            simply stops. */}
        <div
          className="dres-marquee"
          tabIndex={0}
          role="group"
          aria-label="Evidence and resources — scrolling; hover or focus to pause"
        >
          <div className="dres-track">
            {resources.map((r) => (
              <div className="dres-card" key={r.title}>
                <div className="dres-title">{r.title}</div>
                <span className="dres-kind">{r.kind}</span>
              </div>
            ))}
            {resources.map((r) => (
              <div className="dres-card" key={`${r.title}-dup`} aria-hidden="true">
                <div className="dres-title">{r.title}</div>
                <span className="dres-kind">{r.kind}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="dash-container dsection">
        <Reveal>
          <div className="dband">
            <h3>Placedon for Indian corporate law</h3>
            <Link href="/product" className="dbtn dbtn-ghost">
              Learn more
            </Link>
          </div>
        </Reveal>
      </section>

      {/* SECONDARY HERO — full-bleed black band, the header's echo before the
          footer (dash-container is nested inside .dhero2, not applied to the
          section itself, so the black paints edge-to-edge). */}
      <section id="pilot" className="dsection dhero2">
        <div className="dash-container">
          <Reveal>
            <AnimatedH2>See what Placedon does for compliance teams</AnimatedH2>
            <p className="lead">
              Whether you are an in-house secretary scaling filings or an advisor
              building on the record, we will help you find where to start.
            </p>
            <div className="dhero2-actions">
              <Link
                href="/waitlist?intent=pilot"
                className="dbtn dbtn-solid"
                onClick={() => track("request_pilot_click", { location: "secondary_hero" })}
              >
                Request a pilot
              </Link>
              <Link
                href="/product/compliance-pack"
                className="dbtn dbtn-ghost"
                onClick={() => track("see_evidence_click", { location: "secondary_hero" })}
              >
                See the evidence
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
