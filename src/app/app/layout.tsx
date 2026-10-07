import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { gateEnabled, hasSession } from "@/lib/auth/session";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsoleSidebar } from "./console-sidebar";
import { ConsoleNotice } from "./console-notice";
import "./app.css";

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

/** Cookies are read on every request, so nothing here may be prerendered. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect("/app/login");
  const passcode = gateEnabled();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="console md:flex">
        <Suspense fallback={null}>
          <ConsoleSidebar passcode={passcode} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <ConsoleNotice passcode={passcode} />
          <main className="console-main flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
