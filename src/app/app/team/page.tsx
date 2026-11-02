import type { Metadata } from "next";
import { getGateway } from "@/lib/gateway";
import { requireSession } from "@/lib/auth/session";
import { canManagePeople, ROLE_WORDS, teamList, usageLine } from "@/lib/team";
import { TeamConsole } from "./team-console";

export const metadata: Metadata = { title: "Team", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireSession();
  const gateway = await getGateway();
  // Read on the server, in parallel; the key never leaves it.
  const [me, matters, usage] = await Promise.all([gateway.authMe(), gateway.mattersList(), gateway.usageStatus()]);
  const role = me.ok ? me.data.role : null;
  // usage.status is LAWYER: a viewer's 403 means "not yours to read", so no line at all.
  // Only an admin may read who is in the firm and who is invited; nobody else is asked.
  const [people, invites] = canManagePeople(role)
    ? await Promise.all([gateway.peopleList(), gateway.invitesList()]).then(([p, i]) =>
        [teamList(p, (d) => d.people), teamList(i, (d) => d.invites)] as const)
    : [null, null];
  const usageText = usage.ok ? usageLine(usage.data) : usage.error.status === 403 ? null : "This month's usage could not be read right now.";

  return (
    <>
      <h1>Team</h1>
      <p className="lede">Open matters and decide who may work on each — for example, give a colleague read-only access to one client&rsquo;s matter.</p>
      <section aria-label="Your account" className="team-account">
        {me.ok ? (
          <>
            <p className="text-body text-fg">{me.data.email ?? "Signed in"} · {ROLE_WORDS[me.data.role]}</p>
            <p className="text-caption text-fg-3">Your account id <code className="team-id">{me.data.actor_id}</code> — an admin needs it to give you access to a matter.</p>
          </>
        ) : (
          <p role="alert" className="text-body text-fg">Your account could not be read, so only what every role may see is shown. {me.error.message}</p>
        )}
        {usageText ? <p className="text-body text-fg-2">{usageText}</p> : null}
      </section>
      <TeamConsole role={role} actorId={me.ok ? me.data.actor_id : null}
        matters={matters.ok ? matters.data.matters : []} mattersError={matters.ok ? null : matters.error.message}
        people={people} invites={invites} />
    </>
  );
}
