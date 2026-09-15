import { pilotCta, sharedCopy, sharedStates, waitlistCta } from "./shared";
import type { PageContent } from "./types";

export const securityContent = {
  route: "/security",
  eyebrow: "Data handling and source discipline · Pre-launch",
  headline: "Security claims require evidence too.",
  subhead:
    "We are defining how Placedon handles data before any pilot, guided by India's Digital Personal Data Protection Act, 2023. This page states the standard we intend to meet, not a certified live system.",
  primaryCta: pilotCta,
  secondaryCta: waitlistCta,
  sections: [
    {
      id: "source-discipline",
      heading: "Official sources. Traceable authority.",
      claim:
        "The statutory record is limited to official publications.",
      basis:
        "We do not scrape. Statutory material comes only through permitted official channels, and a third-party summary never stands in for the operative provision.",
    },
    {
      id: "data-minimisation",
      heading: "The request form is not a document intake channel.",
      claim:
        "A pilot enquiry needs a description of the workflow, not a client file.",
      basis:
        "The forms collect your contact details and, if you choose, some professional context. Please do not submit confidential documents, identity records, or filing credentials.",
      action: { label: "Read the data-collection notice", href: "/cookies" },
    },
    {
      id: "training",
      heading: "We do not train on your submitted data.",
      claim:
        "Our policy keeps submitted form and pilot data out of model training.",
      basis:
        "Before we accept any pilot data, we check provider terms and account settings against that policy. This is a condition for going live, not a claim about an audited system.",
    },
    {
      id: "pilot-review",
      heading: "Agree the data boundaries before a pilot.",
      claim: "A pilot needs a written data-handling scope.",
      basis:
        "That review covers the data categories, who can access them, the processors involved, where data is stored, how long it is kept, how it is deleted, and who to contact about incidents.",
      items: [
        {
          id: "access",
          heading: "Access and protection",
          claim:
            "Access should be limited to the people and services needed for the agreed purpose.",
          basis:
            "Authentication, permissions, transport protection, and storage controls all have to be verified in the real environment.",
        },
        {
          id: "providers",
          heading: "Processors and transfers",
          claim:
            "We disclose provider names and processing locations before any intake.",
          basis:
            "Hosting, mail, storage, and any model provider may have different retention and international-transfer arrangements.",
        },
        {
          id: "incidents",
          heading: "Incident handling",
          claim: "Someone is assigned to report and respond to incidents.",
          basis:
            "The pilot agreement names a monitored contact and sets out how incidents are assessed and reported.",
        },
      ],
    },
    {
      id: "current-limits",
      heading: "What this site does not establish",
      claim: "No security certification or independent audit is claimed.",
      basis:
        "Nothing published here establishes an India-only hosting guarantee, a service-level commitment, or production security controls.",
      action: { label: "Read the privacy template", href: "/privacy" },
    },
  ],
  microcopy: {
    postureLabel: "Proposed requirements; verification pending",
    sensitiveData: sharedCopy.sensitiveDataNotice,
    securityContactLabel: "Report a security concern",
    securityContactHelp:
      "Describe the affected page and the issue without passwords, personal data, or confidential files.",
    sourceUnavailable: "Source unavailable: no legal result supplied",
    disclaimer: sharedCopy.legalDisclaimer,
  },
  states: {
    ...sharedStates,
    empty: {
      title: "No assurance report published",
      description:
        "No certification or independent audit is claimed. Security arrangements must be reviewed before pilot data is accepted.",
    },
  },
} as const satisfies PageContent;
