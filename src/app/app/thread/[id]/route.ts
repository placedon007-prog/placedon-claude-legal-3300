import { loadThread } from "../../actions";

/**
 * GET /app/thread/{id} — the stored conversation, for the answer poll.
 *
 * A route, not a server action, on purpose. Next runs a page's server actions one at a time,
 * and each one here is a Vercel → gateway round trip of 2–17 s; a poll queued behind them
 * arrived late, and one that never settled stopped the poll for good (live, 2026-11-12: the
 * answer was stored but the page sat on "queued"). A plain request runs alongside them and
 * the caller can time it out. Same `loadThread`, so the session and id checks are unchanged.
 */
export async function GET(_request: Request, ctx: RouteContext<"/app/thread/[id]">) {
  const { id } = await ctx.params;
  return Response.json(await loadThread(id), { headers: { "cache-control": "no-store" } });
}
