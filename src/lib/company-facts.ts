import { z } from "zod";

/**
 * Company facts, in the backend's own vocabulary (`checker/sources/company_facts.py`).
 *
 * Eight fields, closed on purpose: no director name and no DIN (personal data). Three may be
 * typed by hand (`TYPEABLE`); the rest come only from an MCA master-data page, because
 * retyping a registered office from memory invites the error a quoted line prevents.
 * A fact is never "verified": it is what you told us, or what your uploaded page says.
 *
 * The backend does not store these. It takes them with a request (`company_facts` on `ask`
 * and `events.assess`), so this screen keeps them in this browser and says so.
 */
export const FIELDS = ["name", "cin", "status", "listed", "state", "address", "incorporated_on", "roc"] as const;
export type FactField = (typeof FIELDS)[number];

export const FIELD_LABEL: Record<FactField, string> = {
  name: "Company name",
  cin: "CIN",
  status: "Status",
  listed: "Listed",
  state: "State",
  address: "Registered office",
  incorporated_on: "Incorporated on",
  roc: "Registrar of Companies",
};

/** Fields a person may type. Order as the backend's TYPEABLE. */
export const TYPEABLE = ["listed", "state", "cin"] as const satisfies readonly FactField[];
export type TypeableField = (typeof TYPEABLE)[number];

export const isTypeable = (field: FactField): field is TypeableField =>
  (TYPEABLE as readonly string[]).includes(field);

/** Shape only, as the backend checks it. A well-formed CIN is not a real one. */
export const CIN_PATTERN = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

/** The backend's list (`mca_master_data._STATES`), used for the State choice. */
export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export const YOU_TOLD_US = "you told us";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One fact as the backend sends it (`CompanyFact.to_dict`). */
export const companyFactSchema = z.object({
  field: z.enum(FIELDS),
  value: z.string().min(1),
  basis: z.enum(["USER_FACT", "COMPANY_FACT"]),
  label: z.string(),
  quoted_span: z.string(),
  confirmed: z.boolean(),
  can_verify: z.boolean(),
});
export type CompanyFact = z.infer<typeof companyFactSchema>;

/** A fact this browser keeps: always confirmed by the person who saved it, with the date. */
export const storedFactSchema = companyFactSchema.extend({
  confirmed: z.literal(true),
  saved_on: z.string().regex(ISO_DATE),
});
export type StoredFact = z.infer<typeof storedFactSchema>;

/** Stored facts from raw storage. Anything malformed is dropped, never repaired into a guess. */
export function readStoredFacts(raw: string | null): readonly StoredFact[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const fact = storedFactSchema.safeParse(item);
      return fact.success ? [fact.data] : [];
    });
  } catch {
    return [];
  }
}

/** A typed fact, checked the way the backend's `user_fact` checks it, or the reason it is not one. */
export function typedFact(field: TypeableField, input: string, today: string):
  { ok: true; fact: StoredFact } | { ok: false; message: string } {
  const raw = input.trim();
  if (!raw) return { ok: false, message: `Enter ${FIELD_LABEL[field]}, or press Cancel to leave it as Not recorded.` };
  let value = raw;
  if (field === "cin") {
    value = raw.toUpperCase();
    if (!CIN_PATTERN.test(value)) {
      return { ok: false, message: "That is not the shape of a CIN: 21 characters, like U00000MH2010PTC000000." };
    }
  } else if (field === "listed") {
    if (raw !== "yes" && raw !== "no") return { ok: false, message: "Choose whether the company is listed." };
  } else if (!(STATES as readonly string[]).includes(raw)) {
    return { ok: false, message: "Choose a State from the list." };
  }
  return {
    ok: true,
    fact: { field, value, basis: "USER_FACT", label: YOU_TOLD_US, quoted_span: "",
      confirmed: true, can_verify: false, saved_on: today },
  };
}

/** `current` with each incoming fact replacing the one for its field. A new list, in FIELDS order. */
export function mergeFacts(current: readonly StoredFact[], incoming: readonly StoredFact[]): StoredFact[] {
  const byField = new Map<FactField, StoredFact>(current.map((f) => [f.field, f]));
  for (const f of incoming) byField.set(f.field, f);
  return FIELDS.flatMap((field) => byField.get(field) ?? []);
}

/** Where a fact came from, in plain words. */
export function sourceLine(fact: StoredFact): string {
  if (fact.basis === "USER_FACT") return `Entered by hand on ${fact.saved_on}`;
  const uploaded = fact.label.match(/(\d{4}-\d{2}-\d{2})\s*$/)?.[1];
  return uploaded ? `From an MCA master-data page uploaded on ${uploaded}` : fact.label;
}

/** A value for reading: listed is yes/no on the wire. */
export function displayValue(fact: Pick<CompanyFact, "field" | "value">): string {
  if (fact.field === "listed") return fact.value === "yes" ? "Yes" : fact.value === "no" ? "No" : fact.value;
  return fact.value;
}
