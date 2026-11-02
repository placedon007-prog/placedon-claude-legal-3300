"use server";

import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { accountRoleSchema, isRefusal, type Membership } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";
import { hasSession } from "@/lib/auth/session";

/**
 * Team: open matters, decide who may work on each, invite people.
 *
 * The browser never holds the key: every call here goes through `getGateway()` on the
 * server. Hidden controls are a courtesy; the gateway's role check (HTTP 403) is the rule,
 * and each action says that refusal in words rather than as an error code.
 */
export type TeamResult = { ok: true; message: string } | { ok: false; message: string };

const SIGNED_OUT = "Your session has ended. Sign in again.";
const NOT_AVAILABLE = "This matter is not available to you. Refresh the page.";
// Backend MIN_REASON_CHARS (gateway/verbs.py): every access change records a reason.
const MIN_REASON = 10;

const matterId = z.uuid();
const reason = z.string().trim().min(MIN_REASON, `Give a reason of at least ${MIN_REASON} characters. It is recorded with the change.`).max(500);
const matterRole = z.enum(["owner", "member", "viewer"]);

/** A failure in words. A 403 is the role check; anything else did not complete. */
function failed(error: EngineError, forbidden: string, notDone: string): { ok: false; message: string } {
  if (error.status === 403) return { ok: false, message: forbidden };
  return { ok: false, message: notDone };
}

export async function createMatterAction(input: { name: string; clientRef?: string }): Promise<TeamResult> {
  if (!(await hasSession())) return { ok: false, message: SIGNED_OUT };
  const parsed = z.object({
    name: z.string().trim().min(1, "Give the matter a name.").max(200, "Keep the name under 200 characters."),
    clientRef: z.string().trim().max(200, "Keep the client reference under 200 characters.").optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { name, clientRef } = parsed.data;
  const result = await (await getGateway()).matterCreate({ name, ...(clientRef ? { clientRef } : {}) });
  if (!result.ok) {
    // A taken name is HTTP 400 with the store's sentence (019 matters_tenant_name_idx).
    if (result.error.status === 400 && /already a matter/.test(result.error.detail ?? "")) {
      return { ok: false, message: `A matter named ${name} already exists in this firm. Choose another name.` };
    }
    return failed(result.error, "Your role cannot open matters. A lawyer or an admin can.",
      "The matter could not be confirmed as opened. Refresh the page to check before trying again.");
  }
  if (isRefusal(result.data)) return { ok: false, message: "The matter was not opened. Nothing was changed." };
  return { ok: true, message: `${result.data.name} is open. You are its owner.` };
}

export type MembersResult = { ok: true; memberships: Membership[] } | { ok: false; message: string };

export async function matterMembersAction(input: { matterId: string }): Promise<MembersResult> {
  if (!(await hasSession())) return { ok: false, message: SIGNED_OUT };
  const id = matterId.safeParse(input?.matterId);
  if (!id.success) return { ok: false, message: "That is not a matter id." };
  const result = await (await getGateway()).matterMembers(id.data);
  if (!result.ok) return failed(result.error, "Only an admin can see who has access to a matter.", "The list of people could not be read. Try again.");
  if (isRefusal(result.data)) return { ok: false, message: NOT_AVAILABLE };
  return { ok: true, memberships: result.data.memberships };
}

const GRANT_REFUSALS: Record<string, string> = {
  NOT_FOUND: "There is no matter or no active account with that id in this firm. Check the account id with the person.",
  REASON_REQUIRED: `Give a reason of at least ${MIN_REASON} characters. It is recorded with the change.`,
  FORBIDDEN: "This change was refused. Only an admin can give or remove access.",
};

export async function grantAccessAction(input: { matterId: string; actorId: string; role: string; reason: string }): Promise<TeamResult> {
  if (!(await hasSession())) return { ok: false, message: SIGNED_OUT };
  const parsed = z.object({
    matterId, actorId: z.string().trim().min(1, "Enter the person's account id.").max(100, "That is not an account id."),
    role: matterRole, reason,
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const result = await (await getGateway()).matterGrant(parsed.data);
  if (!result.ok) return failed(result.error, "Only an admin can give access to a matter.",
    "The change could not be confirmed. Refresh the list to see whether access was given.");
  if (isRefusal(result.data)) return { ok: false, message: GRANT_REFUSALS[result.data.code] ?? "Access was not given. Nothing was changed." };
  return { ok: true, message: "Access given. It is recorded with your reason." };
}

export async function revokeAccessAction(input: { matterId: string; actorId: string; reason: string }): Promise<TeamResult> {
  if (!(await hasSession())) return { ok: false, message: SIGNED_OUT };
  const parsed = z.object({ matterId, actorId: z.string().trim().min(1).max(100), reason }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const result = await (await getGateway()).matterRevoke(parsed.data);
  if (!result.ok) return failed(result.error, "Only an admin can remove access to a matter.",
    "The change could not be confirmed. Refresh the list to see whether access was removed.");
  if (isRefusal(result.data)) return { ok: false, message: GRANT_REFUSALS[result.data.code] ?? "Access was not removed. Nothing was changed." };
  if (result.data.status === "NO_ACTIVE_GRANT") return { ok: false, message: "This person had no access to remove. Nothing was changed." };
  return { ok: true, message: "Access removed. Their queued work on this matter stops before it is published." };
}

export type InviteResult = { ok: true; email: string; token: string; expiresAt: string } | { ok: false; message: string };

const INVITE_REFUSALS: Record<string, string> = {
  CONFLICT: "An account with this email already exists in this firm.",
  BAD_REQUEST: "Check the email address and role.",
};

export async function inviteAction(input: { email: string; role: string }): Promise<InviteResult> {
  if (!(await hasSession())) return { ok: false, message: SIGNED_OUT };
  const parsed = z.object({ email: z.email("Enter a real email address.").max(320), role: accountRoleSchema }).safeParse({
    email: String(input?.email ?? "").trim(), role: input?.role });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const result = await (await getGateway()).inviteCreate(parsed.data);
  if (!result.ok) {
    if (result.error.status === 400 && /live invite/.test(result.error.detail ?? "")) {
      return { ok: false, message: "This email already has an invite that has not been used." };
    }
    return failed(result.error, "Only an admin can invite people.", "The invite could not be confirmed. Try again.");
  }
  if (isRefusal(result.data)) return { ok: false, message: INVITE_REFUSALS[result.data.code] ?? "No invite was made." };
  return { ok: true, email: result.data.email, token: result.data.token, expiresAt: result.data.expires_at };
}

const INVITE_ID = z.uuid();
const GONE_INVITE = "This invite is no longer pending. It may have been used or cancelled already. Refresh the page.";

/** Withdraw an unused invite (backend 036). The row is kept, marked; its link stops working. */
export async function cancelInviteAction(input: { inviteId: string }): Promise<TeamResult> {
  if (!(await hasSession())) return { ok: false, message: SIGNED_OUT };
  const id = INVITE_ID.safeParse(input?.inviteId);
  if (!id.success) return { ok: false, message: "That is not an invite id." };
  const result = await (await getGateway()).inviteCancel(id.data);
  // NOT_FOUND arrives as a refusal on HTTP 404: used, already cancelled, or not this firm's.
  if ((!result.ok && result.error.status === 404) || (result.ok && isRefusal(result.data) && result.data.code === "NOT_FOUND")) {
    return { ok: false, message: GONE_INVITE };
  }
  if (!result.ok) {
    return failed(result.error, "Only an admin can cancel an invite.",
      "The cancellation could not be confirmed. Refresh the page to check whether the invite is still pending.");
  }
  if (isRefusal(result.data)) return { ok: false, message: "The invite was not cancelled. Nothing was changed." };
  return { ok: true, message: "Invite cancelled. Its link no longer works." };
}
