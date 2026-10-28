import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { gateEnabled, hasSession } from "@/lib/auth/session";
import { sessionKind } from "@/lib/auth/config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsoleSidebar } from "./console-sidebar";
import { ConsoleNotice } from "./console-notice";
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
  const account = sessionKind() === "account";

  return (
    <TooltipProvider delayDuration={300}>
      <FileDropGuard />
      <div className="console md:flex">
        <Suspense fallback={null}>
          <ConsoleSidebar passcode={passcode} account={account} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <ConsoleNotice passcode={passcode} />
          <div className="console-main flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
