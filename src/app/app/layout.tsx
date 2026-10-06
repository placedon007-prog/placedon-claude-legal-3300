import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { gateEnabled, hasSession } from "@/lib/auth/session";
import { logoutAction } from "./actions";
import { ConsoleNav } from "./console-nav";
import "./app.css";

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

/** Cookies are read on every request, so nothing here may be prerendered. */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasSession())) redirect("/app/login");
  const open = !gateEnabled();

  return (
    <div className="console">
      <aside className="console-side">
        <div className="console-brand">
          <span className="mark" aria-hidden>
            P
          </span>
          Placedon
        </div>
        <Link href="/app" className="console-new">
          <Plus size={14} aria-hidden />
          New question
        </Link>
        <ConsoleNav>
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </ConsoleNav>
      </aside>

      <div className="console-body">
        {/* Standing notices. Each states a limit of THIS deployment, and each is on every
          screen because a limit shown once is a limit forgotten. */}
        <div className="console-notices">
          <p className="notice">
            <span className="notice-key">Playbook</span>
            <span>
              <strong>DRAFT — not approved by a lawyer.</strong> The rules below
              are ordinary market defaults for an Indian mutual NDA, not any
              firm&rsquo;s adopted standard. Every finding is a potential issue
              against that draft, never a statement of law.
            </span>
          </p>
          <p className="notice">
            <span className="notice-key">Residency</span>
            <span>
              <strong>Test documents only.</strong> The model is hosted in{" "}
              <span className="mono">UAE North</span>. No client contract may be
              sent to it until that region is confirmed acceptable for client
              data.
            </span>
          </p>
          {open ? (
            <p className="notice">
              <span className="notice-key">Access</span>
              <span>
                <strong>No passcode is configured.</strong> This console is open
                to anyone who can reach it. Set{" "}
                <span className="mono">APP_PASSCODE</span> before putting it
                anywhere but a laptop.
              </span>
            </p>
          ) : null}
        </div>

        <main className="console-main">{children}</main>
      </div>
    </div>
  );
}
