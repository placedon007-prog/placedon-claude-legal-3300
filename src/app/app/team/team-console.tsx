"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AccountRole, Matter, Membership } from "@/lib/gateway/types";
import { formatIST } from "@/lib/format";
import { canManagePeople, canOpenMatters, MATTER_ROLE_WORDS } from "@/lib/team";
import {
  createMatterAction, grantAccessAction, inviteAction, matterMembersAction, revokeAccessAction,
  type InviteResult, type TeamResult,
} from "./actions";

const UNCONFIRMED = "The request could not be confirmed. Refresh the page to check before trying again.";

/** Server actions that throw (network drop mid-call) become words, never an unhandled error. */
async function attempt<T extends { ok: boolean }>(run: () => Promise<T>): Promise<T | { ok: false; message: string }> {
  try { return await run(); } catch { return { ok: false, message: UNCONFIRMED }; }
}

export function TeamConsole({ role, actorId, matters, mattersError }: {
  role: AccountRole | null; actorId: string | null; matters: Matter[]; mattersError: string | null;
}) {
  const admin = canManagePeople(role);
  return (
    <div className="team">
      <section aria-labelledby="team-matters">
        <h2 id="team-matters" className="team-h2">Matters</h2>
        <p className="text-caption text-fg-3">
          {admin ? "Every matter in this firm. Access is never given by being in the firm; each person is added to each matter."
            : "The matters you have been given access to."}
        </p>
        {canOpenMatters(role) ? <NewMatter /> : null}
        {mattersError ? <p role="alert" className="team-note">Matters could not be loaded. {mattersError}</p>
          : matters.length === 0 ? <p className="team-note">{admin || canOpenMatters(role) ? "No matters yet. Open one above." : "You have not been given access to a matter yet. Ask an admin."}</p>
          : <ul className="team-list">{matters.map((m) => <MatterRow key={m.matter_id} matter={m} admin={admin} actorId={actorId} />)}</ul>}
      </section>
      {admin ? <Invite /> : null}
    </div>
  );
}

function NewMatter() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<TeamResult | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const outcome = await attempt(() => createMatterAction({ name: String(data.get("name") ?? ""), clientRef: String(data.get("client_ref") ?? "") }));
    setBusy(false);
    setResult(outcome);
    if (outcome.ok) { form.reset(); router.refresh(); }
  }
  return (
    <form className="team-form" onSubmit={submit} aria-label="Open a matter">
      <div className="team-fields">
        <div><label htmlFor="matter-name">Matter name</label><input id="matter-name" name="name" type="text" required maxLength={200} placeholder="e.g. Acme Ltd — share buyback" /></div>
        <div><label htmlFor="matter-ref">Your client reference (optional)</label><input id="matter-ref" name="client_ref" type="text" maxLength={200} /></div>
      </div>
      <button type="submit" disabled={busy} aria-busy={busy}>{busy ? "Opening…" : "Open matter"}</button>
      <p role="status" className="team-note">{result ? (result.ok ? result.message : `Not opened. ${result.message}`) : ""}</p>
    </form>
  );
}

function MatterRow({ matter, admin, actorId }: { matter: Matter; admin: boolean; actorId: string | null }) {
  const [open, setOpen] = React.useState(false);
  const yours = matter.role ? MATTER_ROLE_WORDS[matter.role] : admin ? "No access of your own" : null;
  const panel = `people-${matter.matter_id}`;
  return (
    <li>
      <div className="team-row">
        <span className="team-row-main">
          <span className="text-body font-medium text-fg">{matter.name}</span>
          <span className="text-caption text-fg-3">{[matter.client_ref, yours && `You: ${yours}`].filter(Boolean).join(" · ")}</span>
        </span>
        {admin ? <button type="button" className="vault-text-button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>
          {open ? "Hide people" : "People"}</button> : null}
      </div>
      {open ? <div id={panel}><MatterPeople matterId={matter.matter_id} actorId={actorId} /></div> : null}
    </li>
  );
}

function MatterPeople({ matterId, actorId }: { matterId: string; actorId: string | null }) {
  const [members, setMembers] = React.useState<Membership[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState("");
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    attempt(() => matterMembersAction({ matterId })).then((r) => {
      if (!live) return;
      if (r.ok && "memberships" in r) { setMembers(r.memberships); setError(null); } else setError(r.ok ? UNCONFIRMED : r.message);
    });
    return () => { live = false; };
  }, [matterId, version]);
  const reload = (message: string) => { setNotice(message); setVersion((v) => v + 1); };
  return (
    <div className="team-people">
      <p role="status" className="team-note">{notice}</p>
      {error ? <p role="alert" className="team-note">{error}</p>
        : !members ? <p className="team-note">Loading people…</p>
        : members.length === 0 ? <p className="team-note">Nobody has access to this matter yet.</p>
        : <ul className="team-list" aria-label="People with access">{members.map((m) =>
            <Member key={m.actor_id} matterId={matterId} member={m} self={m.actor_id === actorId} onDone={reload} />)}</ul>}
      <Grant matterId={matterId} onDone={reload} />
    </div>
  );
}

function Member({ matterId, member, self, onDone }: { matterId: string; member: Membership; self: boolean; onDone: (m: string) => void }) {
  const [removing, setRemoving] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const r = await attempt(() => revokeAccessAction({ matterId, actorId: member.actor_id, reason: String(new FormData(event.currentTarget).get("reason") ?? "") }));
    setBusy(false);
    if (!r.ok) { setRefusal(r.message); return; }
    onDone(r.message);
  }
  return (
    <li>
      <div className="team-row">
        <span className="team-row-main">
          <code className="team-id">{member.actor_id}</code>
          <span className="text-caption text-fg-3">{MATTER_ROLE_WORDS[member.role]}{self ? " · You" : ""}{member.grant_reason ? ` · ${member.grant_reason}` : ""}</span>
        </span>
        {!removing ? <button type="button" className="vault-text-button" aria-label={`Remove access for ${member.actor_id}`} onClick={() => setRemoving(true)}>Remove</button> : null}
      </div>
      {removing ? (
        <form className="team-form" onSubmit={submit} aria-label="Remove access">
          <div><label htmlFor={`why-${member.actor_id}`}>Why is access being removed? Recorded with the change.</label>
            <input id={`why-${member.actor_id}`} name="reason" type="text" required minLength={10} maxLength={500} /></div>
          {refusal ? <p role="alert" className="team-note">Not removed. {refusal}</p> : null}
          <div className="team-actions">
            <button type="button" className="vault-text-button" disabled={busy} onClick={() => { setRemoving(false); setRefusal(null); }}>Cancel</button>
            <button type="submit" disabled={busy} aria-busy={busy}>{busy ? "Removing…" : "Remove access"}</button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function Grant({ matterId, onDone }: { matterId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const r = await attempt(() => grantAccessAction({ matterId, actorId: String(data.get("actor_id") ?? ""),
      role: String(data.get("role") ?? ""), reason: String(data.get("reason") ?? "") }));
    setBusy(false);
    if (!r.ok) { setRefusal(r.message); return; }
    setRefusal(null);
    form.reset();
    onDone(r.message);
  }
  return (
    <form className="team-form" onSubmit={submit} aria-label="Give a person access">
      <h3 className="text-body font-medium text-fg">Give a person access</h3>
      <p className="text-caption text-fg-3">Ask them for the account id shown on their own Team page.</p>
      <div className="team-fields">
        <div><label htmlFor={`who-${matterId}`}>Account id</label><input id={`who-${matterId}`} name="actor_id" type="text" required maxLength={100} className="mono" /></div>
        <div><label htmlFor={`role-${matterId}`}>Access</label>
          <select id={`role-${matterId}`} name="role" defaultValue="member">
            <option value="viewer">Read only</option><option value="member">Member: can work on it</option><option value="owner">Owner</option>
          </select></div>
      </div>
      <div><label htmlFor={`reason-${matterId}`}>Reason, recorded with the change</label>
        <input id={`reason-${matterId}`} name="reason" type="text" required minLength={10} maxLength={500} placeholder="e.g. Joining the diligence team" /></div>
      {refusal ? <p role="alert" className="team-note">Not given. {refusal}</p> : null}
      <button type="submit" disabled={busy} aria-busy={busy}>{busy ? "Giving access…" : "Give access"}</button>
    </form>
  );
}

function Invite() {
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const [copied, setCopied] = React.useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setCopied("");
    const r = await attempt(() => inviteAction({ email: String(data.get("email") ?? ""), role: String(data.get("role") ?? "") }));
    setBusy(false);
    setResult(r);
    if (r.ok) form.reset();
  }
  const link = result?.ok ? `${window.location.origin}/invite?token=${encodeURIComponent(result.token)}` : "";
  return (
    <section aria-labelledby="team-invite">
      <h2 id="team-invite" className="team-h2">Invite a person</h2>
      <p className="text-caption text-fg-3">They join this firm at the role you choose, with access to no matter until you add them to one.</p>
      <form className="team-form" onSubmit={submit} aria-label="Invite a person">
        <div className="team-fields">
          <div><label htmlFor="invite-email">Email</label><input id="invite-email" name="email" type="email" required maxLength={320} autoComplete="off" /></div>
          <div><label htmlFor="invite-role">Role</label>
            <select id="invite-role" name="role" defaultValue="lawyer">
              <option value="viewer">Viewer: reads, changes nothing</option>
              <option value="lawyer">Lawyer: runs work, signs off</option>
              <option value="admin">Admin: also manages people</option>
            </select></div>
        </div>
        <button type="submit" disabled={busy} aria-busy={busy}>{busy ? "Inviting…" : "Create invite"}</button>
      </form>
      <div role="status">
        {result && !result.ok ? <p className="team-note">No invite was made. {result.message}</p> : null}
        {result?.ok ? (
          <div className="team-invite-link">
            <p className="text-body text-fg">Send this link to {result.email} yourself. It is shown once and cannot be shown again.</p>
            <code className="team-id">{link}</code>
            <p className="text-caption text-fg-3">Expires <span className="mono">{formatIST(result.expiresAt)}</span>.</p>
            <button type="button" className="vault-text-button" onClick={async () => {
              try { await navigator.clipboard.writeText(link); setCopied("Copied"); } catch { setCopied("Could not copy. Select the link and copy it by hand."); }
            }}>Copy link</button>
            <p role="status" className="team-note">{copied}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
