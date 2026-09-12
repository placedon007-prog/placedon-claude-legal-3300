/**
 * India-locale formatting helpers.
 *
 * Kept in one place so every surface renders time and figures the Indian way:
 * timestamps in IST, and money/counts in the Indian grouping system
 * (lakh/crore — ₹1,00,00,000, not ₹10,000,000).
 */

/** Format an ISO timestamp as e.g. "11 Sep 2026, 05:30 IST". Returns the input on a bad value. */
export function formatIST(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date}, ${time} IST`;
}

/** Group a number the Indian way (2,50,000). */
export function formatIndianNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

/** Rupees with the Indian grouping and the ₹ symbol (₹1,00,00,000). */
export function formatIndianRupees(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}
