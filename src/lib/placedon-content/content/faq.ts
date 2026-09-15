import { pilotCta, sharedCopy, sharedStates, waitlistCta } from "./shared";
import type { FaqEntry, PageContent } from "./types";

export const faqEntries = [
  {
    id: "scope",
    category: "scope",
    question: "What is Placedon being built to cover?",
    answer: [
      "Placedon starts with Indian corporate law under the Companies Act, 2013, along with the rules and instruments needed to pin down a provision's operative text.",
      "Coverage is still being built, so we do not promise a complete corpus or a published list of verified provisions.",
      "Tax, employment law, securities regulation, and case-law research are not covered.",
    ],
  },
  {
    id: "availability",
    category: "access",
    question: "Can I use Placedon for a live compliance question now?",
    answer: [
      "This site presents a pre-launch product concept, not a live legal-answer service.",
      "The answer record, the law-over-time view, and the company-standing view describe how the product is meant to work, not checks you can run today.",
      "You can request a pilot discussion or register your interest, but neither confirms access.",
    ],
  },
  {
    id: "audience",
    category: "scope",
    question: "Who is Placedon for?",
    answer: [
      "Placedon is intended first for advocates, corporate lawyers, in-house counsel, Company Secretaries (ICSI), and Chartered Accountants (ICAI) who review corporate compliance. That includes the Practising Company Secretary who carries a book of client companies.",
      "It should also help founders and operators understand what evidence to take to those professionals.",
      "The record keeps the statutory basis, the company facts you supply, and the judgment still needed clearly apart.",
    ],
  },
  {
    id: "abstention",
    category: "evidence",
    question: "What does it mean when Placedon abstains?",
    answer: [
      "An abstention means Placedon cannot establish the evidence needed to answer the question.",
      "The record points to the gap, such as missing statutory text, uncertain commencement, or not enough company facts, and holds back the unsupported result.",
      "It does not mean that the company has no obligation or that a filing can be omitted.",
    ],
  },
  {
    id: "accuracy",
    category: "evidence",
    question:
      "Does a verified answer mean the result is guaranteed to be correct?",
    answer: [
      "No accuracy guarantee or validated performance rate is claimed for this pre-launch product.",
      "A 'verified' label points to a documented statutory basis. It does not mean every input is correct or every exception has been resolved.",
      "A qualified professional still needs to review the evidence and how it applies before acting.",
    ],
  },
  {
    id: "answer-classes",
    category: "evidence",
    question: "How do the answer classes differ?",
    answer: [
      "A verified fact reports supported statutory text. A deterministic conclusion applies a verified rule to the facts you state.",
      "A predictive signal would estimate a likely outcome, and it carries its assumptions and uncertainty rather than a factual label.",
      "These are separate classes. Predictive signals are still planned, and no validated predictive model is shown here.",
    ],
  },
  {
    id: "point-in-time",
    category: "evidence",
    question: "Why does the operative date matter?",
    answer: [
      "An assessment is about the version of the law in force for the period under review.",
      "The record keeps three dates apart: when the text was published, the evidence of when it commenced, and the date your company question is about.",
      "If the applicable version cannot be established, Placedon abstains rather than assume today's text answers a question about the past.",
    ],
  },
  {
    id: "sources",
    category: "evidence",
    question: "Where would the statutory evidence come from?",
    answer: [
      "The source policy uses official statutory publications and official instruments, obtained through permitted access.",
      "The record keeps the source reference and the exact words used. We do not scrape, and a secondary summary never stands in for statutory authority.",
      "This does not mean a complete official-source corpus or a government integration is already in place.",
    ],
  },
  {
    id: "legal-advice",
    category: "scope",
    question: "Is this legal advice, or a replacement for my adviser?",
    answer: [
      "No. The site and product concept are not legal advice and do not establish an attorney-client relationship.",
      "The product gives you an evidence record to review; a qualified adviser weighs the facts, how the law applies, and anything outside the stated scope.",
      "Using Placedon does not transfer filing responsibility or professional liability to the product.",
    ],
  },
  {
    id: "filings",
    category: "scope",
    question: "Will Placedon submit MCA or ROC filings for my company?",
    answer: [
      "No filing submission service is offered on this site.",
      "The planned company-standing and event views are about reviewing evidence, not an authorised connection to the Ministry of Corporate Affairs or a Registrar of Companies.",
      "Do not submit portal passwords, digital-signature credentials, or filing documents through the enquiry form.",
    ],
  },
  {
    id: "form-data",
    category: "data",
    question: "What information does a waitlist or pilot request need?",
    answer: [
      "To register interest, we need your email address and your consent to send access updates. A pilot request also needs a non-confidential description of the workflow and your consent to reply about it.",
      "Name, organisation, and professional role are optional. Broader product updates are a separate optional choice.",
      "Please do not submit client information or documents. The published privacy notice names the operator, the processors, how long data is kept, and the privacy contact.",
    ],
  },
  {
    id: "training",
    category: "data",
    question: "Will submitted data be used to train AI models?",
    answer: [
      "Our policy keeps submitted form and pilot data out of model training.",
      "We check provider contracts and settings before accepting data, and we do not claim those controls have already been audited.",
      "Any pilot that involves company data needs an agreed data-handling scope before anything is transferred.",
    ],
  },
  {
    id: "security",
    category: "data",
    question: "What security assurances can I rely on today?",
    answer: [
      "This site states proposed security requirements, not a certification of a production service.",
      "Before a pilot accepts data, we confirm hosting locations, processors, access controls, retention, deletion, and incident contacts for the actual deployment.",
      "No independent audit, certification, or India-only hosting guarantee is claimed here.",
    ],
  },
  {
    id: "pricing",
    category: "access",
    question: "What will Placedon cost?",
    answer: [
      "We are finalising pricing with design partners, and no subscription price is published.",
      "Registering interest is free. Any pilot fee, scope, and cancellation terms are agreed before you take part.",
      "The enquiry form does not collect payment details or create a purchase obligation.",
    ],
  },
  {
    id: "launch-date",
    category: "access",
    question:
      "When will Placedon launch, and does the waitlist guarantee access?",
    answer: [
      "We have not announced a public launch date, and registering interest does not guarantee access.",
      "Registering records your interest for access updates while we build out coverage and the pilot scope.",
      "There is no promised queue position, response deadline, or feature delivery date.",
    ],
  },
  {
    id: "chatgpt",
    category: "comparison",
    question: "How is Placedon intended to differ from ChatGPT?",
    answer: [
      "Placedon's scope is narrower than ChatGPT's general research use.",
      "OpenAI describes ChatGPT research as gathering and synthesising information with citations. Placedon's record specifically requires the provision, the instrument, and the operative date for an Indian corporate-law answer.",
      "This is a difference in scope and verification, not a tested claim that Placedon is more accurate or that ChatGPT cannot cite sources.",
    ],
    sources: [
      {
        title: "OpenAI: ChatGPT for research",
        url: "https://openai.com/academy/research/",
      },
    ],
  },
  {
    id: "harvey",
    category: "comparison",
    question: "How is Placedon intended to differ from Harvey?",
    answer: [
      "Placedon is a pre-launch concept focused on a specific statutory evidence record. Harvey describes a broader legal-AI platform.",
      "Harvey's published platform covers legal research, document analysis, and workflows. Placedon's focus is verifying Companies Act, 2013 provisions and their versions.",
      "No comparative performance test, feature-equivalence claim, or replacement recommendation is made.",
    ],
    sources: [
      {
        title: "Harvey: platform overview",
        url: "https://www.harvey.ai/platform",
      },
    ],
  },
  {
    id: "correction",
    category: "evidence",
    question: "What should I do if a result or source appears wrong?",
    answer: [
      "Do not rely on a disputed result while the issue remains unresolved.",
      "In a future pilot, keep the question, the assessment date, and the source reference, and raise the issue through the agreed pilot contact. Do not send confidential material through a public form.",
      "An unsupported claim is held back pending review. This site does not offer a live correction service or a guaranteed response time.",
    ],
  },
] as const satisfies readonly FaqEntry[];

export const faqContent = {
  route: "/faq",
  eyebrow: "Questions and limits · Pre-launch",
  headline: "What we're building, and what we don't claim yet.",
  subhead:
    "These answers cover what Placedon is meant to do, the evidence standard it holds to, and how to get access. Until it runs as a live service, this describes intent, not proven behaviour.",
  primaryCta: pilotCta,
  secondaryCta: waitlistCta,
  sections: [
    {
      id: "questions",
      heading: "Read the scope before relying on a claim.",
      claim:
        "Pre-launch descriptions are not evidence of production performance.",
      basis:
        "The answers below distinguish intended behaviour, planned features, and matters that still require agreement.",
    },
    {
      id: "pilot-discussion",
      heading: "Have a workflow to review?",
      claim: "A pilot request can describe the evidence your team needs.",
      basis:
        "Keep it non-confidential; scope and terms must be agreed before any access or data transfer.",
      action: pilotCta,
    },
  ],
  microcopy: {
    searchLabel: "Search questions",
    searchPlaceholder: "Search by topic",
    clearSearch: "Clear search",
    allCategories: "All topics",
    expandAll: "Expand all answers",
    collapseAll: "Collapse all answers",
    showAnswer: "Show answer",
    hideAnswer: "Hide answer",
    sourcesLabel: "Source for the comparison",
    disclaimer: sharedCopy.legalDisclaimer,
  },
  states: {
    ...sharedStates,
    empty: {
      title: "No matching question",
      description:
        "Clear the search or try a broader topic, such as scope, privacy, or pricing.",
    },
  },
} as const satisfies PageContent;

export const faqCategories = [
  { value: "scope", label: "Scope and responsibility" },
  { value: "evidence", label: "Evidence and abstention" },
  { value: "data", label: "Data and security" },
  { value: "access", label: "Access and pricing" },
  { value: "comparison", label: "Product comparisons" },
] as const;
