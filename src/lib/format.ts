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

/**
 * Translate compact engine citations into the form used in Indian legal work.
 * This is display-only: stable engine values such as `s.173(1)` stay unchanged.
 */
export function formatProvisionReference(value: string): string {
  return value
    .replace(/\bss\.\s*(\d+(?:\([a-z0-9]+\))*)/gi, "Sections $1")
    .replace(/\bs\.\s*(\d+(?:\([a-z0-9]+\))*)/gi, "Section $1")
    .replace(/\bCompanies Act 2013\b/g, "Companies Act, 2013");
}
