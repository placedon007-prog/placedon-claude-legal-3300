import { z } from "zod";

/**
 * Company facts, in the backend's own vocabulary (`checker/sources/company_facts.py`).
 *
 * Eight fields, closed on purpose: no director name and no DIN (personal data). Three may be
 * typed by hand (`TYPEABLE`); the rest come only from an MCA master-data page, because
 * retyping a registered office from memory invites the error a quoted line prevents.
 * A fact is never "verified": it is what you told us, or what your uploaded page says.
 *
 * The firm's confirmed facts are the COMPANY PROFILE (backend `company_profile.get/set`,
 * migration 032), one per firm, plus `company_class`, which the calendar needs and the MCA
 * page reader does not read. Against a backend without the profile, they stay in this browser.
 */
export const FIELDS = ["name", "cin", "status", "listed", "state", "address", "incorporated_on", "roc"] as const;
export type McaField = (typeof FIELDS)[number];
/** The profile's fields: the eight above, plus the class the calendar needs. */
export const PROFILE_FIELDS = [...FIELDS, "company_class"] as const;
export type FactField = (typeof PROFILE_FIELDS)[number];

/** checker/company_profile.CompanyClass, in the backend's words. */
export const COMPANY_CLASSES = [
  ["private", "Private"], ["public", "Public"], ["opc", "One person company"],
] as const;
export type CompanyClass = (typeof COMPANY_CLASSES)[number][0];

export const FIELD_LABEL: Record<FactField, string> = {
  name: "Company name",
  cin: "CIN",
  status: "Status",
  listed: "Listed",
  state: "State",
  address: "Registered office",
  incorporated_on: "Incorporated on",
  roc: "Registrar of Companies",
  company_class: "Company class",
};

/** Fields a person may type: the backend's TYPEABLE, plus the class. */
export const TYPEABLE = ["listed", "state", "cin", "company_class"] as const satisfies readonly FactField[];
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

/** A confirmed fact, as kept in the profile (or this browser): with the date it was saved. */
export const storedFactSchema = companyFactSchema.extend({
  field: z.enum(PROFILE_FIELDS),
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
  } else if (field === "company_class") {
    if (!COMPANY_CLASSES.some(([c]) => c === raw)) return { ok: false, message: "Choose the company class." };
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
  return PROFILE_FIELDS.flatMap((field) => byField.get(field) ?? []);
}

/** Where a fact came from, in plain words. */
export function sourceLine(fact: StoredFact): string {
  if (fact.basis === "USER_FACT") return `Entered by hand on ${fact.saved_on}`;
  const uploaded = fact.label.match(/(\d{4}-\d{2}-\d{2})\s*$/)?.[1];
  return uploaded ? `From an MCA master-data page uploaded on ${uploaded}` : fact.label;
}

/** A value for reading: listed is yes/no on the wire. */
export function displayValue(fact: { readonly field: FactField; readonly value: string }): string {
  if (fact.field === "listed") return fact.value === "yes" ? "Yes" : fact.value === "no" ? "No" : fact.value;
  if (fact.field === "company_class") return COMPANY_CLASSES.find(([c]) => c === fact.value)?.[1] ?? fact.value;
  return fact.value;
}

/** One fact as `company_profile.get`/`set` serve it, with who confirmed it and when. */
export const profileFactSchema = z.object({
  field: z.enum(PROFILE_FIELDS),
  value: z.string().min(1),
  basis: z.enum(["USER_FACT", "COMPANY_FACT"]),
  label: z.string(),
  quoted_span: z.string(),
  uploaded_on: z.string().nullable(),
  confirmed: z.literal(true),
  can_verify: z.boolean(),
  confirmed_by: z.string(),
  confirmed_at: z.string().nullable(),
});
export type ProfileFact = z.infer<typeof profileFactSchema>;

/** A served profile fact in the shape the screens already render. */
export function fromProfile(f: ProfileFact): StoredFact {
  return { field: f.field, value: f.value, basis: f.basis, label: f.label, quoted_span: f.quoted_span,
    confirmed: true, can_verify: false, saved_on: (f.confirmed_at ?? "").slice(0, 10) || f.uploaded_on || "" };
}

/** What `company_profile.set` takes for one fact. */
export function toProfileInput(f: StoredFact) {
  return { field: f.field, value: f.value, basis: f.basis, quoted_span: f.quoted_span,
    source_label: f.label, confirmed: true as const };
}

/** A profile date as YYYY-MM-DD for a date input: the MCA page writes DD/MM/YYYY. */
export function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (ISO_DATE.test(value)) return value;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

/** Where the profile lives: the server's company profile, or this browser (older backend). */
export type ProfileLoad =
  | { readonly mode: "server"; readonly facts: readonly StoredFact[] }
  | { readonly mode: "browser" }
  /** The profile could not be read just now. Never treated as "no profile". */
  | { readonly mode: "unavailable" };
