import {
  answerClasses,
  evidencePreview,
  pilotCta,
  sharedCopy,
  sharedStates,
  waitlistCta,
} from "./shared";
import type { PageContent } from "./types";

export const productContent = {
  route: "/product",
  eyebrow: "Product concept · Pre-launch",
  headline: "The answer. Its authority. Its limits.",
  subhead:
    "Placedon is built around an evidence record you can inspect for Indian corporate law. The views here show the intended product, not live compliance checks.",
  primaryCta: pilotCta,
  secondaryCta: waitlistCta,
  sections: [
    {
      id: "verified-answer",
      heading: "The verified answer record",
      claim: "Every answer comes with the material you need to check it.",
      basis:
        "A statutory claim names the exact provision, the instrument that applies, and the operative date. When no amendment applies, Placedon establishes that absence too, rather than inventing a reference.",
      items: [
        {
          id: "assertion",
          heading: "Assertion",
          claim: "State what the evidence supports.",
          basis:
            "Keep the legal result separate from its source and any assumptions.",
        },
        {
          id: "authority",
          heading: "Authority",
          claim: "Show the official record.",
          basis:
            "Keep the statutory words and the instrument that fixes their version.",
        },
        {
          id: "limits",
          heading: "Limits",
          claim: "State what remains unresolved.",
          basis:
            "A reviewer needs to see the missing inputs and anything outside the verified scope.",
        },
      ],
    },
    {
      id: "currency",
      heading: "How the law has moved over time",
      claim:
        "This planned view shows what the law said at different points in time.",
      basis:
        "Each confirmed change links the earlier wording, the instrument that changed it, and the evidence of when it took effect. This preview asserts no legal timeline or threshold.",
    },
    {
      id: "compliance-pack",
      heading: "The compliance evidence pack",
      claim:
        "The pack gathers the evidence for a question into one review record.",
      basis:
        "It keeps supplied company facts, verified provisions, derived conclusions, and unresolved items clearly apart. This marketing site does not generate or certify a compliance pack.",
    },
    {
      id: "company-standing",
      heading: "The company-standing check",
      claim: "A company-standing view is planned.",
      basis:
        "The idea is to organise the available company evidence and point out the gaps. No company lookup, registry connection, or certificate of compliance is offered on this site.",
    },
    {
      id: "event-log",
      heading: "The company event log",
      claim: "A dated record of relevant changes is planned.",
      basis:
        "The log would separate changes in the law from company events and keep the source of each. We are not committing to automated monitoring or delivery times.",
    },
    {
      id: "abstention",
      heading: "The abstain state",
      claim:
        "Holding back an unsupported result is part of the product.",
      basis:
        "The record names the missing evidence and the next step to resolve it. A blank result never means the company is compliant.",
      action: {
        label: "Read how verification is intended to work",
        href: "/how-it-works",
      },
    },
  ],
  microcopy: {
    previewLabel: sharedCopy.conceptLabel,
    plannedLabel: "Planned: not available on this site",
    answerTab: "Answer record",
    currencyTab: "Statutory currency",
    standingTab: "Company standing",
    eventsTab: "Company events",
    abstainedTab: "Abstained",
    evidenceDetails: "Evidence requirements",
    noLiveQuery:
      "This concept does not submit a legal question or retrieve company records.",
    noSampleFigures:
      "No statutory figure is displayed without a verified source record.",
    disclaimer: sharedCopy.legalDisclaimer,
  },
  states: {
    ...sharedStates,
    empty: {
      title: "No company record in this preview",
      description:
        "Company-standing checks are planned. This concept contains no company data.",
      action: pilotCta,
    },
  },
} as const satisfies PageContent;

export const productEvidencePreview = evidencePreview;
export const productAnswerClasses = answerClasses;
