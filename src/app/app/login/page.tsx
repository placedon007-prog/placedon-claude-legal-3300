import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { gateEnabled, hasSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import "../app.css";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!gateEnabled() || (await hasSession())) redirect("/app");
  return (
    <div className="console console-single">
      <header className="console-bar">
        <h1>Placedon console</h1>
      </header>
      <div className="console-notices">
        <p className="notice">
          <span className="notice-key">Prototype</span>
          <span>
            One shared passcode, and a session that lasts a working day. There are no user
            accounts: everyone who signs in sees the same tenant&rsquo;s runs.
          </span>
        </p>
      </div>
      <main className="console-main">
        <h2>Sign in</h2>
        <p className="lede">This console is not public.</p>
        <LoginForm />
      </main>
    </div>
  );
}
