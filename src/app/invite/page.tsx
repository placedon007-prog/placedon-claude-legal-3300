import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authMode } from "@/lib/auth/config";
import { hasSession } from "@/lib/auth/session";
import { PlacedonMark } from "@/components/brand/placedon-mark";
import { InviteForm } from "./invite-form";
import "../app/app.css";
import "../login/login.css";

// The invite code may arrive in this page's URL: never send it on as a referrer, never index it.
export const metadata: Metadata = { title: "Accept your invite", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  if (await hasSession()) redirect("/app");
  if (authMode() !== "accounts") redirect("/login");
  const { token } = await searchParams;
  return (
    <div className="console auth">
      <div className="auth-panel" id="invite">
        <div className="auth-card">
          <div className="auth-card-mark"><PlacedonMark className="auth-mark-sm" title="Placedon" /></div>
          <h1 className="auth-title">Accept your invite</h1>
          <p className="auth-lede">Choose a password for the account your workspace created for you. You then sign in with the email the invite was sent to.</p>
          <InviteForm token={typeof token === "string" ? token.slice(0, 512) : ""} />
        </div>
      </div>
    </div>
  );
}
