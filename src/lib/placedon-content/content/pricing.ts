import { pilotCta, sharedCopy, sharedStates, waitlistCta } from "./shared";
import type { PageContent } from "./types";

export const pricingContent = {
  route: "/pricing",
  eyebrow: "Participation · Pre-launch",
  headline: "Scope first. Terms before access.",
  subhead:
    "We are finalising pricing for Indian corporate-law teams with our design partners. There is no published subscription price or launch date yet, and any figures would be in rupees.",
  primaryCta: pilotCta,
  secondaryCta: waitlistCta,
  sections: [
    {
      id: "pilot",
      heading: "Pilot participation",
      claim: "Ask for a conversation about a specific compliance workflow.",
      basis:
        "We agree the scope, how it will be evaluated, data handling, duration, and any fee before access. Sending a request does not reserve a place.",
      items: [
        {
          id: "fit",
          heading: "Intended participants",
          claim:
            "Professionals and operators with a specific Companies Act workflow to review.",
          basis:
            "In your request, describe the question, how you review it, and the evidence your team needs.",
        },
        {
          id: "evaluation",
          heading: "Evaluation basis",
          claim: "Examine the evidence record and its limits.",
          basis:
            "In the pilot conversation we can agree how to assess cited results, input dependencies, and abstentions.",
        },
        {
          id: "commercial",
          heading: "Commercial position",
          claim: "No pilot fee is quoted on this site.",
          basis:
            "Any charge and cancellation terms are set out in the pilot agreement before you accept.",
        },
      ],
      action: pilotCta,
    },
    {
      id: "waitlist",
      heading: "Waitlist",
      claim: "Register interest in future access.",
      basis:
        "The form collects your contact details for access updates. Registering is free, and it does not buy a subscription or guarantee admission.",
      action: waitlistCta,
    },
    {
      id: "not-a-plan-table",
      heading: "Nothing here is a promise of features",
      claim: "The product concepts are not a list of what you would get.",
      basis:
        "Coverage, usage limits, support, and access all depend on an agreed scope. We will state pricing and availability once they are set.",
      action: { label: "Read the current product scope", href: "/product" },
    },
  ],
  microcopy: {
    pilotPrice: "By agreement before participation",
    waitlistPrice: "No charge to register interest",
    pricingStatus: sharedCopy.pricingStatus,
    payment: "No payment details are requested by this form.",
    timeline: sharedCopy.timingStatus,
    access: sharedCopy.accessNotice,
  },
  states: {
    ...sharedStates,
    empty: {
      title: "Subscription pricing is not published",
      description:
        "Request a pilot discussion or register your interest for future access updates.",
      action: pilotCta,
    },
  },
} as const satisfies PageContent;
