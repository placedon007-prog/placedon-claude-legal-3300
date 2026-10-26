/**
 * The composer's sources: which bodies of law a question is searched against.
 *
 * Pure — no React, no storage, no I/O — so it is tested on Node's runner. Every name,
 * status and coverage line comes from the gateway's `sources.list` (generated there from
 * checker/scope.BODIES); this module only decides what the screen says about them.
 */
import type { Searched, SourceBody } from "./gateway/types";

/** What the gateway marks default_on (today: the held Companies Act). */
export function defaultSourceIds(bodies: readonly SourceBody[]): string[] {
  return bodies.filter((b) => b.default_on).map((b) => b.id);
}

/** Plain recovery guidance for source-catalogue failures; never expose gateway internals. */
export function sourceCatalogFailureMessage(kind: string, status?: number): string {
  if (status === 401 || status === 403) {
    return "The gateway rejected this app’s access key. For local development, restart the gateway and website together so they use the same key; for a hosted workspace, ask the administrator to check gateway credentials.";
  }
  if (status === 404) return "This gateway does not expose the source catalogue yet. Update the backend gateway, then retry.";
  if (status === 429) return "The source service is busy. Your question and source choices are unchanged; wait briefly, then retry.";
  if (status !== undefined && status >= 500) return "The gateway returned a temporary service error. Your question and source choices are unchanged; retry shortly.";
  if (status === 400) return "The gateway rejected the source-catalogue request. Update the website and gateway together, then retry.";
  if (kind === "schema_mismatch") return "The gateway returned a source catalogue in an unsupported format. Update the website and gateway together, then retry.";
  if (kind === "session") return "Your session has ended. Sign in again, then reload the source catalogue.";
  if (kind === "timeout") return "The gateway took too long to respond. Your question and source choices are unchanged; retry when the service is available.";
  if (kind === "not_found") return "This gateway does not provide a compatible source catalogue. Update the website and gateway together, then retry.";
  if (kind === "bad_request") return "The gateway rejected the source-catalogue request. Update the website and gateway together, then retry.";
  if (kind === "server_error") return "The gateway returned a temporary service error. Your question and source choices are unchanged; retry shortly.";
  return "The gateway could not be reached. Check that it is running and reachable, then retry. This is a connection problem, not an empty source list.";
}

/** A stored choice, kept only if every id is a selectable source; otherwise the default. */
export function chosenOrDefault(bodies: readonly SourceBody[], stored: unknown): string[] {
  const selectable = new Set(bodies.filter((b) => b.selectable).map((b) => b.id));
  if (!Array.isArray(stored) || stored.length === 0) return defaultSourceIds(bodies);
  const valid = stored.filter((x): x is string => typeof x === "string" && selectable.has(x));
  if (valid.length === 0) return defaultSourceIds(bodies);
  return bodies.filter((b) => valid.includes(b.id)).map((b) => b.id);
}

/** Switch one source on or off, keeping register order; an unselectable one is ignored. */
export function toggleSource(chosen: readonly string[], id: string, bodies: readonly SourceBody[]): string[] {
  const target = bodies.find((b) => b.id === id);
  if (!target?.selectable) return bodies.filter((b) => chosen.includes(b.id)).map((b) => b.id);
  // The gateway treats [] as defaults; keep the final source on instead of lying about none.
  if (chosen.includes(id) && chosen.length === 1) return [...chosen];
  const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
  return bodies.filter((b) => next.includes(b.id)).map((b) => b.id);
}

/** What choosing a source means, in words. Status is never carried by colour. */
export function statusLine(b: SourceBody): string {
  if (!b.available) return b.reason ?? b.note;
  if (b.id === "vault") return "Find excerpts in selected documents; they are not legal authority.";
  if (b.id === "held") return "Held law · exact passages and coverage limits";
  if (b.status === "available") return b.reason ?? b.note;
  switch (b.status) {
    case "IN_CORPUS":
      return "Held";
    case "CURRENT_ONLY":
      return "Current text only";
    case "CLIENT":
      return "Your documents — select files to search their text";
    default:
      return "Not held — will be refused, with the reason";
  }
}

export interface MentionItem {
  readonly kind: "source" | "document";
  readonly id: string;
  /** Mono short code for a source; "DOC" for a document. */
  readonly short: string;
  readonly label: string;
}

/**
 * The "@" menu: short-code prefix first, then a word of the name starting with the query,
 * then the query anywhere. Stable within each rank, so the register's order holds.
 */
export function mentionMatches(items: readonly MentionItem[], query: string): MentionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  const rank = (i: MentionItem): number => {
    if (i.short.toLowerCase().startsWith(q)) return 0;
    if (i.label.toLowerCase().split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) return 1;
    if (i.label.toLowerCase().includes(q) || i.short.toLowerCase().includes(q)) return 2;
    return 3;
  };
  return items
    .map((item, index) => ({ item, index, r: rank(item) }))
    .filter((x) => x.r < 3)
    .sort((a, b) => a.r - b.r || a.index - b.index)
    .map((x) => x.item);
}

/**
 * The quiet line under an answer, read from `envelope.searched`:
 *   "Searched: Companies Act, 2013 (read) · … · as of 2026-10-08"
 *   "Not searched: SEBI_LODR, SEBI_OTHER, …" — selectable sources left off.
 * An envelope without `searched` (an older gateway) yields no line rather than a guess.
 */
export function searchedLines(
  searched: Searched | undefined | null,
  bodies: readonly SourceBody[],
): { searched: string | null; notSearched: string | null } {
  if (!searched) return { searched: null, notSearched: null };
  const name = (id: string) => bodies.find((b) => b.id === id)?.name ?? id;
  const parts = searched.bodies.map((row) => {
    if (row.read) return `${name(row.id)} (read)`;
    if (row.status === "CLIENT") return `${name(row.id)} (not read by a research question)`;
    if (row.status === "UNAVAILABLE") return `${name(row.id)} (unavailable)`;
    if (row.status === "CURRENT_ONLY") return `${name(row.id)} (current text only — refused)`;
    return `${name(row.id)} (not held — refused)`;
  });
  if (searched.defaulted) parts.push("the default");
  parts.push(`as of ${searched.as_of}`);
  const asked = new Set(searched.bodies.map((r) => r.id));
  const off = bodies.filter((b) => b.selectable && !asked.has(b.id)).map((b) => b.short);
  return {
    searched: `Searched: ${parts.join(" · ")}`,
    notSearched: off.length ? `Not searched: ${off.join(", ")}` : null,
  };
}

/** Where the model that wrote the answer ran, from the run's own steps; null if unstated. */
export function modelRegion(steps: readonly { model: string | null; region: string | null }[]): string | null {
  return steps.find((s) => s.model && s.region)?.region ?? null;
}
