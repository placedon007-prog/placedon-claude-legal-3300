import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { gateEnabled, hasSession } from "@/lib/auth/session";
import { sessionKind } from "@/lib/auth/config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsoleSidebar } from "./console-sidebar";
import { ConsoleNotice } from "./console-notice";
import { getGateway } from "@/lib/gateway";
import { accountIdentity } from "@/lib/team";
import { FileDropGuard } from "@/components/file-drop-guard";
import "./app.css";

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

/** Cookies are read on every request, so nothing here may be prerendered. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect("/login");
  const passcode = gateEnabled();
  const kind = sessionKind();
  const account = kind === "account";
  // Accounts (and the demo, whose fixture caller is an admin) have a server identity; the
  // shared passcode has none, so it keeps the name typed into this browser.
  const me = kind === "passcode" ? null : await (await getGateway()).authMe();
  const identity = me?.ok ? accountIdentity(me.data) : null;

  return (
    <TooltipProvider delayDuration={300}>
      <FileDropGuard />
      <div className="console md:flex">
        <Suspense fallback={null}>
          <ConsoleSidebar passcode={passcode} account={account} identity={identity} serverThreads={kind !== "passcode"} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="console-main flex min-h-0 flex-1 flex-col">
            {children}
            <ConsoleNotice passcode={passcode} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
