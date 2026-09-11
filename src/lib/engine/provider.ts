import "./server-guard";
import type { EngineResult } from "./errors";
import type {
  CompliancePack,
  CompliancePackRequest,
  DocumentCheckRequest,
  DocumentCheckResult,
  EventDetailResponse,
  EventsQuery,
  EventsResponse,
  Health,
  InstrumentAffectedResponse,
} from "./types";

/**
 * The engine seen by the rest of the app — one method per route the backend
 * actually serves (six, no more). Every method returns an `EngineResult`;
 * none throw. A caller must narrow on `.ok` before a payload exists, so a
 * transport failure has no path into a data renderer and can never be shown
 * in the abstain register.
 *
 * Server-only. Selected through `getEngine()`, which reads the origin from the
 * environment at call time — a client bundle that imported this would trip
 * `server-guard` and fail loudly rather than leak the origin or token.
 */
export interface EngineProvider {
  readonly name: "mock" | "http";
  health(): Promise<EngineResult<Health>>;
  compliancePack(
    request: CompliancePackRequest,
  ): Promise<EngineResult<CompliancePack>>;
  documentCheck(
    request: DocumentCheckRequest,
  ): Promise<EngineResult<DocumentCheckResult>>;
  /**
   * Events are NOT scoped to the company: the backend echoes `cin` but never
   * filters on it (drift 4). The parameter is kept for URL shape and forward
   * compatibility only — no UI may promise "this company's events".
   */
  events(cin: string, query?: EventsQuery): Promise<EngineResult<EventsResponse>>;
  event(
    cin: string,
    eventId: string,
  ): Promise<EngineResult<EventDetailResponse>>;
  instrumentAffected(
    fragment: string,
  ): Promise<EngineResult<InstrumentAffectedResponse>>;
}

/**
 * Resolve the engine for this process.
 *
 * `PLACEDON_API_ORIGIN` is read HERE, inside the function, not at module load:
 * the choice of Mock vs Http is therefore a deployment concern (one line in
 * `.env.local`), never baked into a bundle. Unset origin → Mock, so the app
 * runs and demos with no backend. An origin that fails the loopback/HTTPS
 * check in `http.ts` throws at construction — a misconfiguration should be
 * loud, not a silent fall back to fixtures that look like real answers.
 *
 * The env vars are unprefixed on purpose: never `NEXT_PUBLIC_*`, which would
 * inline the values into client JavaScript.
 */
export async function getEngine(): Promise<EngineProvider> {
  const origin = process.env.PLACEDON_API_ORIGIN?.trim();
  if (!origin) {
    const { MockEngineProvider } = await import("./mock");
    return new MockEngineProvider();
  }
  const { HttpEngineProvider } = await import("./http");
  return new HttpEngineProvider(origin, {
    token: process.env.PLACEDON_API_TOKEN?.trim() || undefined,
  });
}
