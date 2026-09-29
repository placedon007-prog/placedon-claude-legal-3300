import "../engine/server-guard";
import type { EngineResult } from "../engine/errors";
import type {
  AskResponse,
  ReviewResponse,
  Run,
  RunTrace,
  UploadResponse,
} from "./types";

/**
 * The gateway seen by the rest of the app — one method per `/v2` verb the backend
 * actually serves. Every method returns `EngineResult`; none throw, so a transport
 * failure has no path into a data renderer and can never be shown in the abstain
 * register.
 *
 * Server-only. `getGateway()` reads the origin and the API KEY from the environment at
 * call time; a client bundle that imported this trips `server-guard` and fails loudly
 * rather than shipping the key to a browser.
 */
export interface GatewayProvider {
  readonly name: "mock" | "http";
  ask(question: string): Promise<EngineResult<AskResponse>>;
  reviewContract(input: {
    text: string;
    name?: string;
    /** Required while the deployment region is unconfirmed — PLAN_22 D3. */
    testData: boolean;
  }): Promise<EngineResult<ReviewResponse>>;
  run(runId: string): Promise<EngineResult<Run>>;
  trace(runId: string): Promise<EngineResult<RunTrace>>;
  upload(input: { text: string; name?: string }): Promise<EngineResult<UploadResponse>>;
}

/**
 * Resolve the gateway for this process.
 *
 * `GATEWAY_URL` and `PLACEDON_GATEWAY_KEY` are read HERE, inside the function, never at
 * module load: Mock vs Http is a deployment concern, not something baked into a bundle.
 *
 * **No URL, or no key → Mock.** Not an error: the prototype has to run and demo with no
 * backend. But a URL WITH NO KEY is a misconfiguration and says so, because every `/v2`
 * verb needs one — silently falling back to fixtures that look like real answers is the
 * failure this whole boundary exists to prevent.
 */
export async function getGateway(): Promise<GatewayProvider> {
  const origin = process.env.GATEWAY_URL?.trim();
  const key = process.env.PLACEDON_GATEWAY_KEY?.trim();
  if (!origin) {
    const { MockGateway } = await import("./mock");
    return new MockGateway();
  }
  if (!key) {
    throw new Error(
      "GATEWAY_URL is set but PLACEDON_GATEWAY_KEY is not. Every /v2 verb requires an " +
        "API key that resolves to a tenant; without one the gateway answers 401. " +
        "Unset GATEWAY_URL to run on the MockGateway instead.",
    );
  }
  const { HttpGateway } = await import("./http");
  return new HttpGateway(origin, key);
}
