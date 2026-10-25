"use server";

import { redirect } from "next/navigation";
import { loginGateway } from "@/lib/gateway/provider";
import { inviteAcceptOutcome, validateNewPassword } from "@/lib/auth/invite-accept";

export type InviteState = { readonly error: string | null };

/** Spend an invite token and set the password. The account's email and role come from the
 *  invite on the backend; nothing here can choose them. No session is started: the person
 *  signs in next, with the email the invite was sent to. */
export async function acceptInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token || token.length > 512) return { error: "Paste the invite code from your invitation." };
  const invalid = validateNewPassword(password, confirm);
  if (invalid) return { error: invalid };
  let gateway: Awaited<ReturnType<typeof loginGateway>>;
  try {
    gateway = await loginGateway();
  } catch {
    return { error: "Invites are not available right now. Try again shortly." };
  }
  const outcome = inviteAcceptOutcome(await gateway.invitesAccept({ token, password }));
  if (outcome.kind === "error") return { error: outcome.message };
  redirect("/login?invited=1");
}
