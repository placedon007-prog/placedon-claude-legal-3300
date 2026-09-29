import "../engine/server-guard";
import { cookies } from "next/headers";

/**
 * The runs this browser has started, newest first.
 *
 * **The gateway has no list-runs verb.** `verbs.py` serves `runs.get` and `runs.trace`
 * only, both by id. So there is no way to ask "every run for my tenant", and this app does
 * not pretend otherwise: it remembers the ids it created and labels the screen accordingly.
 * A list that silently showed only some of a tenant's runs while looking complete would be
 * the worst of the options.
 */

const COOKIE = "placedon_app_runs";
const MAX = 20;

export interface RecentRun {
  readonly id: string;
  readonly intent: string;
  readonly at: string;
  readonly label: string;
}

export async function recentRuns(): Promise<readonly RecentRun[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is RecentRun =>
        !!r &&
        typeof r === "object" &&
        typeof (r as RecentRun).id === "string" &&
        typeof (r as RecentRun).intent === "string",
    );
  } catch {
    // A cookie we cannot read is not a run list. Dropped, never guessed at.
    return [];
  }
}

export async function rememberRun(run: RecentRun): Promise<void> {
  const existing = (await recentRuns()).filter((r) => r.id !== run.id);
  const next = [run, ...existing].slice(0, MAX);
  (await cookies()).set(COOKIE, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}
