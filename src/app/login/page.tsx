import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { authMode, sessionConfigurationIssue } from "@/lib/auth/config";
import { PlacedonMark } from "@/components/brand/placedon-mark";
import { AccountForm } from "./account-form";
import { LoginForm } from "./login-form";
import "../app/app.css";
import "./login.css";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

/** What the product does, stated as it behaves today. No figure, no claim of accuracy. */
const PROOFS = [
  { key: "Quote", text: "Every answer carries the provision it rests on, word for word." },
  { key: "Abstain", text: "When it cannot verify, it says so and names what is missing." },
  { key: "Trace", text: "Every run is recorded step by step, and can be opened later." },
] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  if (await hasSession()) redirect("/app");
  const { next } = await searchParams;
  // Where sign-in returns to. Validated here so the form only ever carries a safe path.
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);
  const configurationIssue = sessionConfigurationIssue();
  const mode = authMode();

  return (
    <div className="console auth">
      <aside className="auth-brand" aria-labelledby="auth-brand-title">
        <div className="auth-brand-top">
          <PlacedonMark className="auth-mark" />
          <span className="auth-wordmark">Placedon</span>
        </div>
        <div className="auth-claim">
          <p className="auth-headline" id="auth-brand-title">
            A witness,
            <br />
            not a tool.
          </p>
          <ul className="auth-proofs">
            {PROOFS.map((p) => (
              <li key={p.key}>
                <span className="auth-proof-key">{p.key}</span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-foot">
          Indian corporate law · Prototype, pre-launch · Not legal advice
        </p>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-mark">
            <PlacedonMark className="auth-mark-sm" title="Placedon" />
          </div>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-lede">
            {mode === "accounts"
              ? "Use the email address your workspace invited."
              : "This console is private to pilot workspaces."}
          </p>

          {configurationIssue ? (
            <p className="auth-status" role="status">
              <span className="auth-status-key">Not configured</span>
              {configurationIssue}
            </p>
          ) : mode === "accounts" ? (
            <>
              <AccountForm />
              <details className="auth-alt">
                <summary>Use the workspace passcode</summary>
                <LoginForm compact next={nextPath} />
              </details>
            </>
          ) : (
            <>
              <LoginForm next={nextPath} />
              <p className="auth-note">
                <span className="auth-note-key">Prototype</span>
                One shared passcode per workspace, and a session that lasts a working day.
                Personal accounts come next.
              </p>
            </>
          )}

          <p className="auth-help">
            No access yet? Placedon is in private pilot.{" "}
            <Link href="/waitlist?intent=pilot">Request a pilot</Link>
          </p>
        </div>
        <footer className="auth-legal">
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/security">Security</Link>
        </footer>
      </main>
    </div>
  );
}
