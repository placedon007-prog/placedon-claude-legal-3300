import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingPage } from "@/components/marketing-page";
import { LegalText } from "@/components/brand";
import {
  howItWorksContent,
  howItWorksAnswerClasses,
} from "@/lib/placedon-content/content/how-it-works";
import type { AnswerClass } from "@/lib/placedon-content/content/types";
import { pageMetadata } from "@/lib/seo";
import "./how-it-works.css";

export function generateMetadata() {
  return pageMetadata("/how-it-works");
}

/**
 * The three intended answer classes, read in a fixed order from most to least
 * settled. This complements the content's "answer-classes" section, which
 * carries prose but no items: the section states that each class has a written
 * label, a stated basis, and a boundary — this block shows them side by side.
 *
 * The classes are distinguished by their labels and text, never by colour
 * alone. The predictive class carries a plain-text "Planned" tag because its
 * own boundary copy says no validated model is presented.
 */
const CLASS_ORDER: readonly AnswerClass[] = [
  "verified_fact",
  "deterministic_conclusion",
  "predictive_signal",
];

function AnswerClassExplainer() {
  const { classExplorerLabel, classExplorerHelp } = howItWorksContent.microcopy;
  return (
    <section
      className="container hiw-classes"
      aria-labelledby="hiw-classes-title"
      data-reveal-block
    >
      <div className="hiw-classes-head">
        <p className="eyebrow">{classExplorerLabel}</p>
        <h2 id="hiw-classes-title">
          <LegalText>Three classes. Different kinds of evidence.</LegalText>
        </h2>
        <p>{classExplorerHelp}</p>
      </div>
      <div className="hiw-class-grid">
        {CLASS_ORDER.map((key, index) => {
          const item = howItWorksAnswerClasses[key];
          const planned = key === "predictive_signal";
          return (
            <article key={key} className="hiw-class">
              <div className="hiw-class-top">
                <span className="hiw-class-index mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="hiw-class-tag">
                  {planned ? "Planned" : "In scope"}
                </span>
              </div>
              <h3>
                <LegalText>{item.label}</LegalText>
              </h3>
              <span className="hiw-class-short">{item.shortLabel}</span>
              <p className="hiw-class-claim">
                <LegalText>{item.claim}</LegalText>
              </p>
              <dl>
                <div>
                  <dt>{item.evidenceLabel}</dt>
                  <dd>
                    <LegalText>{item.basis}</LegalText>
                  </dd>
                </div>
                <div>
                  <dt>Boundary</dt>
                  <dd>
                    <LegalText>{item.boundary}</LegalText>
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- the record
   The five working areas, each with a worked example. Moved here from the
   homepage (2026-10-29) — the home hero + demo now carry the overview, and
   this depth lives with the rest of the "how it works" detail. Styled with
   dashboard.css's .dfeature-* classes (loaded site-wide via site-chrome.tsx),
   using this page's own data-reveal-block instead of the homepage's
   framer-motion word-reveal, so it matches AnswerClassExplainer's pattern. */
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

function BuiltForTheRecord() {
  return (
    <section
      className="dash-container dsection"
      aria-labelledby="hiw-built-title"
      data-reveal-block
    >
      <div className="dstatement">
        <h2 id="hiw-built-title">Built for the record</h2>
        <p className="lead">
          Placedon reads the Companies Act, 2013, traces every answer back to
          its source, and works inside the tools your compliance team already
          uses. Every answer shows its citation and its operative date. When
          it cannot, it abstains.
        </p>
      </div>

      <div className="dfeature-shell" style={{ marginTop: "clamp(48px,6vw,88px)" }}>
        <div className="dfeatures">
          {features.map((f) => (
            <article className="dfeature-row" aria-labelledby={`feature-${f.n}`} key={f.title}>
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
          ))}
        </div>
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
          <Link href="/product" className="dbtn dbtn-link">
            See the product
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <MarketingPage page={howItWorksContent}>
      <BuiltForTheRecord />
      <AnswerClassExplainer />
    </MarketingPage>
  );
}
