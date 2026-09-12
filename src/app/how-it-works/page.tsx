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

export default function HowItWorksPage() {
  return (
    <MarketingPage page={howItWorksContent}>
      <AnswerClassExplainer />
    </MarketingPage>
  );
}
