/**
 * Practice areas and their associated instrument sets.
 * The backend authority is checker/scope.py; this is the frontend's display layer.
 */

export type PracticeAreaId =
  | "corporate"
  | "due_diligence"
  | "transactions"
  | "capital_markets"
  | "banking_finance"
  | "disputes"
  | "litigation"
  | "arbitration"
  | "in_house"
  | "advisory"
  | "real_estate";

export interface PracticeArea {
  readonly id: PracticeAreaId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly status: "available" | "coming_soon";
}

export const PRACTICE_AREAS: readonly PracticeArea[] = [
  {
    id: "corporate",
    label: "Corporate & Governance",
    shortLabel: "Corporate",
    description: "Board resolutions, compliance, Companies Act 2013",
    status: "available",
  },
  {
    id: "due_diligence",
    label: "Due Diligence",
    shortLabel: "DD",
    description: "Legal DD checklists, document review, red flags",
    status: "available",
  },
  {
    id: "transactions",
    label: "Transactions",
    shortLabel: "Transactions",
    description: "M&A, share purchases, joint ventures, restructuring",
    status: "available",
  },
  {
    id: "capital_markets",
    label: "Capital Markets",
    shortLabel: "Cap Markets",
    description: "SEBI regulations, IPOs, listings, disclosures",
    status: "coming_soon",
  },
  {
    id: "banking_finance",
    label: "Banking & Finance",
    shortLabel: "Banking",
    description: "RBI regulations, SARFAESI, lending, security interests",
    status: "coming_soon",
  },
  {
    id: "disputes",
    label: "Disputes",
    shortLabel: "Disputes",
    description: "Contract disputes, breach claims, limitation",
    status: "coming_soon",
  },
  {
    id: "litigation",
    label: "Litigation",
    shortLabel: "Litigation",
    description: "CPC procedures, evidence, court filings",
    status: "coming_soon",
  },
  {
    id: "arbitration",
    label: "Arbitration",
    shortLabel: "Arbitration",
    description: "Domestic and international commercial arbitration",
    status: "coming_soon",
  },
  {
    id: "in_house",
    label: "In-House Counsel",
    shortLabel: "In-House",
    description: "Cross-practice queries routed by company profile",
    status: "coming_soon",
  },
  {
    id: "advisory",
    label: "Advisory",
    shortLabel: "Advisory",
    description: "Multi-instrument legal opinions and advice",
    status: "coming_soon",
  },
  {
    id: "real_estate",
    label: "Real Estate",
    shortLabel: "Real Estate",
    description: "RERA, transfer of property, stamp duty",
    status: "coming_soon",
  },
] as const;

export function practiceAreaById(id: PracticeAreaId): PracticeArea {
  const found = PRACTICE_AREAS.find((pa) => pa.id === id);
  if (!found) throw new Error(`Unknown practice area: ${id}`);
  return found;
}
