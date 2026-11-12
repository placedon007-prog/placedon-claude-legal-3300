import { pilotCta, sharedCopy, sharedStates, waitlistCta } from "./shared";
import type { PageContent } from "./types";

export const aboutContent = {
  route: "/about",
  eyebrow: "Purpose and accountability · Pre-launch",
  headline: "An answer should point to its source.",
  subhead:
    "Placedon is built around one requirement: an answer about Indian corporate law should name the provision, the instrument, and the operative date behind it. When the record cannot be verified, Placedon stops instead of guessing.",
  primaryCta: pilotCta,
  secondaryCta: waitlistCta,
  sections: [
    {
      id: "purpose",
      heading: "A reviewer should be able to inspect the authority behind an answer.",
      claim: "A confident tone does not make a legal point true.",
      basis:
        "Placedon shows the underlying words, the source, the date, and anything still unresolved, so the professional reviewing it can check the work.",
    },
    {
      id: "witness",
      heading: "A witness, not a tool.",
      claim: "A witness answers only from the evidence.",
      basis:
        "Placedon reports what the statutory record supports, and it flags what it cannot establish. The phrase is a product standard, not a claim of legal witness status or court approval.",
    },
    {
      id: "building-in-the-open",
      heading: "Building in the open means stating the limits first.",
      claim: "Placedon is pre-launch, and the corpus is not complete.",
      basis:
        "This site shows the workflows we intend to build and invites pilot requests. It does not claim live customers, proven accuracy results, or complete coverage of the law.",
    },
    {
      id: "team-contact",
      heading: "Contact the team about the work.",
      claim:
        "The pilot form is how you start a conversation about a compliance workflow.",
      basis:
        "Tell us your role, the review you handle, and the evidence you need. We do not publish individual biographies or credentials on this site.",
      action: pilotCta,
    },
    {
      id: "accountability",
      heading: "Questions about your data go through a separate channel.",
      claim: "You do not need to register interest to make a privacy request.",
      basis:
        "Use the privacy contact in the published policy to ask about access, correction, withdrawal, or deletion.",
      action: { label: "Read the privacy policy", href: "/privacy" },
    },
  ],
  microcopy: {
    status: sharedCopy.launchStatus,
    contact: "Contact Placedon",
    enquiryHelp: sharedCopy.sensitiveDataNotice,
    disclaimer: sharedCopy.legalDisclaimer,
  },
  states: sharedStates,
} as const satisfies PageContent;
