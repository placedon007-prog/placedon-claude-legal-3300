"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, Fragment, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { track } from "@/lib/track";
import "./dashboard.css";

/* ---------------------------- heading with word-reveal typography
   Words rise from behind a clipped edge rather than fading up. A fade sets
   every word to opacity 0 first, so on a five-word heading the last word was
   still invisible three quarters of a second in — the headline read as a
   fragment ("How…") for most of the reveal. A mask wipe paints each word at
   full contrast or not at all. */
const EASE: [number, number, number, number] = [0.2, 0, 0, 1];

const h2Container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const h2Word: Variants = {
  hidden: { y: "110%" },
  show: {
    y: "0%",
    transition: { duration: 0.42, ease: EASE },
  },
};
function AnimatedH2({ children }: { children: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <h2>{children}</h2>;
  const words = children.split(" ");
  return (
    <motion.h2
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
    </motion.h2>
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
 * Text never starts at `opacity: 0`. Cream on ink falls under the 4.5:1 AA
 * floor below roughly alpha 0.48, so a fade from zero leaves a window where
 * the words are on screen and unreadable — the reason headings looked broken
 * while scrolling. Reveals start at --reveal-floor (0.55) and mostly move.
 *
 * `mode="surface"` animates transform only. An ancestor at opacity < 1 becomes
 * a backdrop root, which silently kills `backdrop-filter` on any glass inside
 * it, so anything carrying glass must use this mode.
 */
const REVEAL_FLOOR = 0.55;

function Reveal({
  children,
  delay = 0,
  className,
  mode = "text",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  mode?: "text" | "surface";
}) {
  const reduce = useReducedMotion();

  // Reduced motion renders the final state — no movement, no fade.
  const variants: Variants = reduce
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: mode === "surface" ? 1 : REVEAL_FLOOR, y: 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.32, delay, ease: EASE },
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

/* ------------------------------------------------------------- content */
/* Each feature: what it is, why it matters, one worked example, and where it
   honestly stands. Examples reuse only references already stated on this page. */
type Feature = {
  n: string;
  area: string;
  title: string;
  lead: string;
  body: string[];
  example: ReactNode;
  status: string;
};
const features: Feature[] = [
  {
    n: "01",
    area: "Research",
    title: "Read the law as it stood on the day",
    lead: "Ask about a section, give a date, and get the wording that was in force on that date.",
    body: [
      "Most research tools show you today's text. That works until the question is about last year's board meeting, or a notice sent out before a rule changed. Placedon keeps each version of a provision next to the notification that replaced it, so it can tell you what the law said on the date your file cares about, not the date you happen to be asking.",
      "Every answer comes back with three things: the provision, the instrument that set its wording, and the date that wording took effect. If you want to check the answer yourself, those three are all you need.",
    ],
    example: (
      <>
        Asked what <strong className="dcite section-reference">Section 96(1)</strong> required for the year
        ending <span className="dcite">2026-03-31</span>, Placedon answers: an
        AGM within six months of the year&rsquo;s end, and no more than fifteen
        months after the last one. The section and its operative date sit
        under the answer.
      </>
    ),
    status: "In development · Companies Act, 2013 first",
  },
  {
    n: "02",
    area: "Compliance",
    title: "Start from the company, not the paperwork",
    lead: "Describe the company once. Placedon works out which duties under the Act apply to it.",
    body: [
      "You tell it what the company is: its class, when it was incorporated, who its directors are, its capital and its turnover. From that it builds a matrix with a row for each duty the Act places on a company like yours. Each row says whether the duty applies, whether it has been met, or exactly which fact is missing before anyone can say.",
      "The rows come from the Act, not from whatever happens to be in the folder. A company that has uploaded nothing still gets a full matrix, and the empty rows are usually the ones worth looking at first.",
    ],
    example: (
      <>
        Board meetings under <strong className="dcite section-reference">Section 173(1)</strong>: at least
        four a year, no more than 120 days apart. Three held so far,{" "}
        <span className="dcite">96 days</span> since the last. The next one is
        due before <span className="dcite">2026-10-14</span>.
      </>
    ),
    status: "In development · first duties include Section 96 and Section 173",
  },
  {
    n: "03",
    area: "Document check",
    title: "A second reader for every draft",
    lead: "Give it a notice, a set of minutes or a resolution, and it checks the document against the law the document relies on.",
    body: [
      "It asks what a careful reviewer would ask. Is this the kind of document it says it is? Does the rule it cites apply to this company on this date? Is that rule still current, or has it been amended since? Is anything the law requires simply not there?",
      "It also knows what not to flag. A check written for minutes won't fire on a notice, and a document it can't identify comes back marked as uncertain, not covered in defects it made up.",
    ],
    example: (
      <>
        A notice relies on a provision that was amended after the notice was
        drafted. Placedon marks the reference as out of date and names the
        instrument that changed it, so you know what to correct.
      </>
    ),
    status: "In development",
  },
  {
    n: "04",
    area: "Monitoring",
    title: "Know when the law moves under you",
    lead: "When a new notification is published, see which provisions it touches and which of your answers depend on them.",
    body: [
      "Indian corporate law mostly changes through rules and notifications, not through headline amendments to the Act. A limit moves in the Gazette, and nobody tells the folder of resolutions that relied on the old one.",
      "Placedon keeps a dated log of those changes and links each one to the provisions it affects. When something you relied on changes, the record tells you, with the notification and its date attached.",
    ],
    example: (
      <>
        <span className="dcite">G.S.R. 880(E)</span> revised the small-company
        limits under <strong className="dcite section-reference">Section 2(85)</strong> from{" "}
        <span className="dcite">2025-12-01</span>. Placedon records the
        notification and links it to every duty that turns on small-company
        status.
      </>
    ),
    status: "Planned",
  },
  {
    n: "05",
    area: "Drafting",
    title: "Drafts that carry their authority",
    lead: "Write board resolutions, notices and Board's report sections in Word, with the source attached to each clause.",
    body: [
      "Drafting is where old law gets copied forward. A template written three years ago still cites what it cited then, and nobody checks, because the document looks finished.",
      "In the Word add-in, each clause keeps its section and the date its wording took effect. If the law under a clause changes, you can see which clause is affected without rereading the whole draft.",
    ],
    example: (
      <>
        A Board&rsquo;s report drafted under{" "}
        <strong className="dcite section-reference">Section 134</strong>, where each disclosure shows the
        provision it answers to and the date that provision took its current
        form.
      </>
    ),
    status: "Prototype · Microsoft Word",
  },
  {
    n: "06",
    area: "Abstention",
    title: "It tells you when it doesn't know",
    lead: "If Placedon cannot prove an answer, it holds back and tells you what is missing.",
    body: [
      "A 2024 Stanford study found that leading legal AI tools produced false or unsupported answers on 17 to 33 percent of queries. A wrong answer that sounds certain does more damage than no answer. So when part of a provision can't be decided, or the instrument that fixes a figure isn't in the record, Placedon stops and says so.",
      "An abstention still tells you something. It names the missing instrument or fact and the step that would settle it, so you know exactly what to go and get. A blank row never means you are compliant.",
    ],
    example: (
      <>
        Does the company have a director resident in India under{" "}
        <strong className="dcite section-reference">Section 149(3)</strong>? Not answered. That turns on
        the days each director spent in India, and those are not on record.
      </>
    ),
    status: "Built into every answer",
  },
];

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
          <a href="#product" className="dcrumb-here" aria-label="Explore: scroll to the product overview">
            Explore here
          </a>
        </div>
      </div>

      {/* HERO — image backdrop, text left, actions top-right */}
      <section className="dhero-img dsection-flush">
        <Image
          className="dhero-img-photo"
          src="/media/hero-chamber.jpg"
          alt="A grand, empty classical legislative chamber, the seat of the record."
          fill
          priority
          sizes="100vw"
        />
        <div className="dhero-img-scrim" aria-hidden="true" />
        <div className="dash-container dhero-img-inner">
          <Reveal className="dhero-img-text">
            <span className="eyebrow">
              Research · Compliance · Monitoring · Drafting
            </span>
            <h1>The evidence-first workspace for Indian corporate law.</h1>
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
          </Reveal>
        </div>
      </section>

      {/* HERO VIDEO — reveals on scroll, below the first screen */}
      <section className="dash-container dsection dhero-media dsection-flush">
        <Reveal mode="surface">
          <HeroVideo />
        </Reveal>
      </section>

      {/* STATEMENT + FEATURES */}
      <section id="product" className="dash-container dsection">
        <Reveal>
          <div className="dstatement">
            <Index n="01" label="The record" />
            <AnimatedH2>Built for the record</AnimatedH2>
            <p className="lead">
              Placedon reads the Companies Act, 2013, traces every answer back
              to its source, and works inside the tools your compliance team
              already uses. Every answer shows its citation and its operative
              date. When it cannot, it abstains.
            </p>
          </div>
        </Reveal>

        <div className="dfeature-shell" style={{ marginTop: "clamp(48px,6vw,88px)" }}>
          <div className="dfeatures">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <article className="dfeature-row" aria-labelledby={`feature-${f.n}`}>
                  <div className="dfeature-head">
                    <span className="dfeature-area mono">
                      {f.n} · {f.area}
                    </span>
                    <h3 className="dfeature-title" id={`feature-${f.n}`}>
                      {f.title}
                    </h3>
                    <p className="dfeature-lead">{f.lead}</p>
                  </div>
                  <div>
                    {f.body.map((para) => (
                      <p className="dfeature-body" key={para.slice(0, 24)}>
                        {para}
                      </p>
                    ))}
                    <div className="dfeature-example">
                      <span className="dfeature-example-label mono">Example</span>
                      <p>{f.example}</p>
                    </div>
                    <p className="dfeature-status mono">{f.status}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <aside className="daside">
              <div className="daside-title">Evidence over confidence</div>
              <div className="daside-chips">
                <span className="chip chip-met">Verified</span>
                <span className="chip chip-attaches">Attaches</span>
                <span className="chip chip-abstain">Abstained</span>
              </div>
              <p>
                Every answer traces to a provision, an instrument, and an
                operative date. Nothing ships while it cannot be verified.
              </p>
              <Link href="/how-it-works" className="dbtn dbtn-link">
                How the record works
              </Link>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* INTERACTIVE DEMO */}
      <section id="evidence" className="dash-container dsection">
        <Reveal>
          <div className="dcenter" style={{ marginBottom: 44 }}>
            <Index n="02" label="In practice" />
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
                onClick={() => {
                  setTab(i);
                  track("demo_tab_view", { tab: d.tab });
                }}
              >
                {d.tab}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal mode="surface">
          <div className="ddemo-stage">
            <div className="ddoc">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  className="ddoc-paper"
                  initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
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
                    <span className="dconn-mark" />
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
            <Index n="03" label="Tools" />
            <AnimatedH2>Tools made for the way you work</AnimatedH2>
          </div>
        </Reveal>
        <div className="dfeatures">
          {tools.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="dfeature-row">
                <div className="dfeature-head">
                  <span className="dfeature-title">{f.title}</span>
                </div>
                <div>
                  <p className="dfeature-body">{f.body}</p>
                  <Link href={f.href ?? "/product"} className="dbtn dbtn-link dfeature-learn">
                    Learn more
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRINCIPLES — the golden rule */}
      <section className="dash-container dsection">
        <Reveal>
          <div className="dcenter" style={{ marginBottom: 44 }}>
            <Index n="04" label="The standard" />
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
            <Index n="05" label="Platform" />
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
            <Index n="06" label="Evidence" />
            <AnimatedH2>Evidence &amp; resources</AnimatedH2>
          </div>
        </Reveal>
        <div className="dres-grid">
          {resources.map((r, i) => (
            <Reveal key={r.title} delay={(i % 3) * 0.05} className="dres-card">
              <div className="dres-foot">
                <div className="dres-title">{r.title}</div>
                <span className="dres-kind">
                  {r.kind}
                </span>
              </div>
            </Reveal>
          ))}
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

      {/* SECONDARY HERO */}
      <section id="pilot" className="dash-container dsection dhero2">
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
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
