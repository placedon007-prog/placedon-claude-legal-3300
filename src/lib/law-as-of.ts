/**
 * Ask "as of" a past date. The gateway reads each section as it stood on that date, rebuilt
 * from India Code's amendment notes, and refuses AS_OF_UNSUPPORTED while the feature is off.
 * Pure helpers shared by the composer, the server action and the answer view.
 */

/** Most of the Companies Act 2013 came into force on this date; the gateway refuses earlier. */
export const LAW_DATE_MIN = "2014-04-01";

/** Shown when the gateway refuses a past date because the feature is switched off. */
export const AS_OF_OFF_MESSAGE =
  "Past dates aren’t switched on yet. Your question is back in the box: send it again to read the law as it stands today.";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Today as YYYY-MM-DD in India (Asia/Kolkata), on the browser and the server alike, so a date
 *  picked just before midnight IST is judged against the same calendar the reader sees. */
export function indiaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** A real calendar date, YYYY-MM-DD, or null. */
function parse(iso: string): { y: number; m: number; d: number } | null {
  if (!ISO.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d ? { y, m, d } : null;
}

/** "2022-03-12" → "12 March 2022". Anything else is returned as given. */
export function formatLawDate(iso: string): string {
  const p = parse(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : iso;
}

/** The date to send: only a valid PAST date from LAW_DATE_MIN; today or nothing means current law. */
export function pastLawDate(value: string | null | undefined, today: string = indiaToday()): string | undefined {
  if (!value || !parse(value) || value >= today || value < LAW_DATE_MIN) return undefined;
  return value;
}

/** The backend's own "Law as it stood on …" block, without the sentence the banner already says. */
export function lawAsOfDetail(text: string): string | null {
  if (!text.startsWith("Law as it stood on ")) return null;
  return text.replace(/^Law as it stood on [^.]*\.\s*/, "");
}
