import type { AccountRole, UsageStatus } from "./gateway/types";
import { formatIndianRupees } from "./format";

/** Mirrors backend gateway/roles.py: matters.create is LAWYER; invites and access are ADMIN.
 *  Hiding a control is a courtesy; the gateway's 403 is the rule. */
export const canOpenMatters = (role: AccountRole | null) => role === "lawyer" || role === "admin";
export const canManagePeople = (role: AccountRole | null) => role === "admin";

export const ROLE_WORDS: Record<AccountRole, string> = {
  viewer: "Viewer: reads the firm's work, changes nothing",
  lawyer: "Lawyer: runs work and signs off findings",
  admin: "Admin: also invites people and controls access",
};

export const MATTER_ROLE_WORDS = {
  owner: "Owner",
  member: "Member",
  viewer: "Read only",
} as const;

/** Two decimals only when there are paise, so ₹700 stays ₹700. */
function rupees(value: number): string {
  return formatIndianRupees(Math.round(value * 100) / 100);
}

/**
 * One line for this firm's spend this month, or null when there is nothing honest to say.
 * `tenant: null` is "not reported", never ₹0, and an unreadable ledger says so.
 */
export function usageLine(usage: UsageStatus): string | null {
  if ("status" in usage) {
    return usage.code === "NO_LEDGER" ? "This month's usage could not be read. That does not mean nothing is left." : null;
  }
  if (!usage.readable) return "This month's usage could not be read. That does not mean nothing is left.";
  if (!usage.tenant) return null;
  return `Used ${rupees(usage.tenant.month_inr)} of ${rupees(usage.tenant.month_cap_inr)} this month`;
}
