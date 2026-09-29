import "../engine/server-guard";
import type { z } from "zod";
import { engineFail, engineOk, type EngineResult } from "../engine/errors";
import { GATEWAY_ROUTES, type GatewayRoute } from "../engine/types";
import type { GatewayProvider } from "./provider";
import {
  askResponseSchema,
  refusalSchema,
  reviewResponseSchema,
  runSchema,
  runTraceSchema,
  uploadResponseSchema,
  type AskResponse,
  type ReviewResponse,
  type Run,
  type RunTrace,
  type UploadResponse,
} from "./types";

const TIMEOUT_MS = 120_000; // a live model answer, not a page load

/**
 * The real gateway over HTTP.
 *
 * The API key is sent as `Authorization: Bearer` and exists only in this module's closure.
 * It is never logged, never placed in a URL, and never returned in an error — an operator
 * message that quotes a credential is a credential in a log file.
 */
export class HttpGateway implements GatewayProvider {
  readonly name = "http" as const;

  constructor(
    private readonly origin: string,
    private readonly key: string,
  ) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`GATEWAY_URL is not a URL: ${origin}`);
    }
    const loopback =
      parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !loopback) {
      throw new Error(
        `GATEWAY_URL must be https, or loopback for local development. Got ${parsed.protocol}//${parsed.hostname}. ` +
          "An API key over plain http on a non-loopback host is a key on the wire.",
      );
    }
  }

  private async call<S extends z.ZodType>(
    route: GatewayRoute,
    path: string,
    schema: S,
    init?: { method?: "GET" | "POST"; body?: unknown },
  ): Promise<EngineResult<z.infer<S>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(new URL(path, this.origin), {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${this.key}`,
          ...(init?.body ? { "content-type": "application/json" } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === "AbortError";
      return engineFail({
        kind: aborted ? "timeout" : "transport_error",
        route,
        message: aborted
          ? `The gateway did not answer within ${TIMEOUT_MS / 1000}s.`
          : "The gateway could not be reached.",
      });
    } finally {
      clearTimeout(timer);
    }

    let body: unknown;
    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      return engineFail({
        kind: "schema_mismatch",
        route,
        status: response.status,
        message: "The gateway answered with something that is not JSON.",
      });
    }

    if (!response.ok) {
      // A 4xx REFUSAL from a verb is a product state, not a transport failure: the
      // pipeline decided, and the decision has a code. It is parsed, not discarded.
      const refusal = refusalSchema.safeParse(body);
      if (refusal.success && (response.status === 404 || response.status === 503)) {
        return engineOk(refusal.data as z.infer<S>);
      }
      const detail =
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : undefined;
      return engineFail({
        kind:
          response.status === 401
            ? "bad_request"
            : response.status >= 500
              ? "server_error"
              : response.status === 404
                ? "not_found"
                : "bad_request",
        route,
        status: response.status,
        message:
          response.status === 401
            ? "The gateway rejected this deployment's API key."
            : `The gateway answered ${response.status}.`,
        detail,
      });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return engineFail({
        kind: "schema_mismatch",
        route,
        status: response.status,
        message: "The gateway's answer did not match the contract this app was built to.",
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      });
    }
    return engineOk(parsed.data);
  }

  ask(question: string): Promise<EngineResult<AskResponse>> {
    return this.call(GATEWAY_ROUTES.ask, GATEWAY_ROUTES.ask, askResponseSchema, {
      method: "POST",
      body: { question },
    });
  }

  reviewContract(input: {
    text: string;
    name?: string;
    testData: boolean;
  }): Promise<EngineResult<ReviewResponse>> {
    return this.call(
      GATEWAY_ROUTES.reviewContract,
      GATEWAY_ROUTES.reviewContract,
      reviewResponseSchema,
      {
        method: "POST",
        // `test_data` is a STRING input on the verb table, and only its truthiness is
        // read. Sent as "yes" so the intent is legible in a request log.
        body: {
          text: input.text,
          name: input.name ?? "contract",
          ...(input.testData ? { test_data: "yes" } : {}),
        },
      },
    );
  }

  run(runId: string): Promise<EngineResult<Run>> {
    return this.call(
      GATEWAY_ROUTES.runGet,
      GATEWAY_ROUTES.runGet.replace("{run_id}", encodeURIComponent(runId)),
      runSchema,
    );
  }

  trace(runId: string): Promise<EngineResult<RunTrace>> {
    return this.call(
      GATEWAY_ROUTES.runTrace,
      GATEWAY_ROUTES.runTrace.replace("{run_id}", encodeURIComponent(runId)),
      runTraceSchema,
    );
  }

  upload(input: { text: string; name?: string }): Promise<EngineResult<UploadResponse>> {
    return this.call(
      GATEWAY_ROUTES.documentUpload,
      GATEWAY_ROUTES.documentUpload,
      uploadResponseSchema,
      { method: "POST", body: { text: input.text, name: input.name ?? "document" } },
    );
  }
}
