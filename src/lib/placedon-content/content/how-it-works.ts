import {
  answerClasses,
  pilotCta,
  sharedCopy,
  sharedStates,
  waitlistCta,
} from "./shared";
import type { PageContent } from "./types";

export const howItWorksContent = {
  route: "/how-it-works",
  eyebrow: "The intended method · Pre-launch",
  headline: "Ask. Verify. Cite. Or abstain.",
  subhead:
    "Before it shows an answer, Placedon tests a compliance question against the Indian statutory record: the Companies Act, 2013 and the instruments that amend it. You always see the source, which version applies, and where the answer stops.",
  primaryCta: pilotCta,
  secondaryCta: waitlistCta,
  sections: [
    {
      id: "ask",
      heading: "State the question and the relevant date.",
      claim: "An assessment begins with its facts.",
      basis:
        "The workflow records the company context, the period under review, and the question you want answered. Anything missing stays marked as missing.",
    },
    {
      id: "verify",
      heading: "Find the authority and the version in force.",
      claim: "Every answer is backed by official material.",
      basis:
        "The verification record links the provision to the instrument that amended or commenced it, and it keeps the operative date separate from the date of publication.",
      items: [
        {
          id: "source",
          heading: "Source",
          claim: "Identify the official publication.",
          basis:
            "The record keeps the reference and the exact text used.",
        },
        {
          id: "version",
          heading: "Version",
          claim: "Check what changed and when.",
          basis:
            "An amendment reference alone does not establish when the changed wording became operative.",
        },
        {
          id: "applicability",
          heading: "Applicability",
          claim: "Make the conditions explicit.",
          basis:
            "A conclusion states the inputs and exclusions it considered. When applicability is unresolved, Placedon sends it for review or abstains.",
        },
      ],
    },
    {
      id: "answer-classes",
      heading: "Three classes. Different kinds of evidence.",
      claim:
        "A statutory fact, a derived conclusion, and an estimate are not the same thing.",
      basis:
        "Each answer class has a written label, a stated basis, and a limit on what it establishes. Predictive signals are still a planned class.",
    },
    {
      id: "abstain",
      heading: "When the record is unresolved, Placedon abstains.",
      claim: "Placedon holds back any answer it cannot verify.",
      basis:
        "It identifies the reason: missing text, uncertain commencement, conflicting sources, or not enough company facts. An abstention does not mean there is no obligation.",
    },
    {
      id: "review",
      heading: "The professional decision remains yours.",
      claim:
        "An evidence record supports your review; it does not take on professional responsibility.",
      basis:
        "A qualified adviser should weigh the company's facts, the relevant law, and anything outside the stated scope before a filing or any other action.",
      action: { label: "Read questions and limits", href: "/faq" },
    },
  ],
  microcopy: {
    classExplorerLabel: "Intended answer classes",
    classExplorerHelp:
      "Select a class to read its evidence requirements and limits.",
    abstainedLabel: "Abstained: no legal answer supplied",
    sourceMissing: "Official source not established",
    dateMissing: "Operative date not established",
    inputMissing: "Required company facts not supplied",
    previewLabel: sharedCopy.conceptLabel,
    disclaimer: sharedCopy.legalDisclaimer,
  },
  states: sharedStates,
} as const satisfies PageContent;

export const howItWorksAnswerClasses = answerClasses;
