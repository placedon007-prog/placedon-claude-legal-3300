import "./server-guard";
import { z } from "zod";
import { engineFail, engineOk, type EngineResult } from "./errors";
import type { EngineProvider } from "./provider";
import {
  ENGINE_ROUTES,
  cinSchema,
  compliancePackRequestSchema,
  compliancePackSchema,
  documentCheckRequestSchema,
  documentCheckSchema,
  engineErrorBodySchema,
  eventDetailSchema,
  eventsQuerySchema,
  eventsSchema,
  healthSchema,
  instrumentAffectedSchema,
  type CompliancePack,
  type CompliancePackRequest,
  type DocumentCheckRequest,
  type DocumentCheckResult,
  type EngineRoute,
  type EventDetailResponse,
  type EventsQuery,
  type EventsResponse,
  type Health,
  type InstrumentAffectedResponse,
} from "./types";

const DEFAULT_TIMEOUT_MS = 8000;
/** The engine binds `127.0.0.1:8020` over plain HTTP. Loopback is the only host where that is allowed. */
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
export function engineOrigin(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    const loopback = LOOPBACK.has(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
      return;
    if (url.username || url.password || url.search || url.hash) return;
    if (url.pathname !== "/") return;
    return url.origin;
  } catch {
    return;
  }
}
function issuesOf(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
}
function parseBody<S extends z.ZodType>(
  schema: S,
  route: EngineRoute,
  body: unknown,
): EngineResult<z.infer<S>> {
  const parsed = schema.safeParse(body);
  if (parsed.success) return engineOk(parsed.data);
  return engineFail({
    kind: "schema_mismatch",
    route,
    message: "The engine answered in a shape this client does not recognise.",
    issues: issuesOf(parsed.error),
  });
}
/** Local request validation: a malformed call is a bad_request, reported without a round trip. */
function invalidRequest<T>(
  route: EngineRoute,
  error: z.ZodError,
): EngineResult<T> {
  return engineFail({
    kind: "bad_request",
    route,
    message: "The request does not satisfy the engine contract.",
    detail: issuesOf(error).join("; "),
  });
}
function timedOut(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

export interface HttpProviderOptions {
  readonly token?: string;
  readonly timeoutMs?: number;
  readonly fetcher?: typeof fetch;
}
/** Wire adapter for the six routes the engine actually serves. Returns, never throws. */
export class HttpEngineProvider implements EngineProvider {
  readonly name = "http" as const;
  private readonly origin: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;
  constructor(origin: string, options: HttpProviderOptions = {}) {
    const checked = engineOrigin(origin);
    if (!checked)
      throw new Error(
        "Provide an HTTPS engine origin, or plain HTTP on loopback.",
      );
    this.origin = checked;
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetcher = options.fetcher ?? fetch;
  }
  private async request(
    route: EngineRoute,
    path: string,
    body?: unknown,
  ): Promise<EngineResult<unknown>> {
    let response: Response;
    try {
      response = await this.fetcher(new URL(path, this.origin), {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Accept: "application/json",
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      if (timedOut(cause))
        return engineFail({
          kind: "timeout",
          route,
          message: `The engine did not answer within ${this.timeoutMs}ms.`,
        });
      return engineFail({
        kind: "transport_error",
        route,
        message: "The engine could not be reached.",
      });
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return engineFail({
        kind: response.ok ? "schema_mismatch" : "server_error",
        route,
        status: response.status,
        message: "The engine did not return a JSON body.",
      });
    }
    if (response.ok) return engineOk(payload);
    return engineFail(this.failure(route, response.status, payload));
  }
  /** 400 carries the offending field in `detail`; 404 carries `routes[]` — except the event-detail 404 (drift 3). */
  private failure(route: EngineRoute, status: number, payload: unknown) {
    const parsed = engineErrorBodySchema.safeParse(payload);
    const detail = parsed.success ? parsed.data.detail : undefined;
    const routes =
      parsed.success && parsed.data.error === "not_found"
        ? parsed.data.routes
        : undefined;
    if (status === 400)
      return {
        kind: "bad_request" as const,
        route,
        status,
        message: "The engine rejected the request.",
        detail,
      };
    if (status === 404)
      return {
        kind: "not_found" as const,
        route,
        status,
        message: "The engine holds no record at this address.",
        detail,
        routes,
      };
    return {
      kind: "server_error" as const,
      route,
      status,
      message: "The engine reported a failure.",
      detail,
    };
  }
  async health(): Promise<EngineResult<Health>> {
    const route = ENGINE_ROUTES.health;
    const response = await this.request(route, route);
    if (!response.ok) return response;
    return parseBody(healthSchema, route, response.data);
  }
  async compliancePack(
    request: CompliancePackRequest,
  ): Promise<EngineResult<CompliancePack>> {
    const route = ENGINE_ROUTES.compliancePack;
    const body = compliancePackRequestSchema.safeParse(request);
    if (!body.success) return invalidRequest(route, body.error);
    const response = await this.request(route, route, body.data);
    if (!response.ok) return response;
    return parseBody(compliancePackSchema, route, response.data);
  }
  async documentCheck(
    request: DocumentCheckRequest,
  ): Promise<EngineResult<DocumentCheckResult>> {
    const route = ENGINE_ROUTES.documentCheck;
    const body = documentCheckRequestSchema.safeParse(request);
    if (!body.success) return invalidRequest(route, body.error);
    const response = await this.request(route, route, body.data);
    if (!response.ok) return response;
    return parseBody(documentCheckSchema, route, response.data);
  }
  async events(
    cin: string,
    query: EventsQuery = {},
  ): Promise<EngineResult<EventsResponse>> {
    const route = ENGINE_ROUTES.events;
    const company = cinSchema.safeParse(cin);
    if (!company.success) return invalidRequest(route, company.error);
    const parameters = eventsQuerySchema.safeParse(query);
    if (!parameters.success) return invalidRequest(route, parameters.error);
    const search = new URLSearchParams(
      Object.entries(parameters.data).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ).toString();
    const path = `/v1/company/${encodeURIComponent(company.data)}/events${
      search ? `?${search}` : ""
    }`;
    const response = await this.request(route, path);
    if (!response.ok) return response;
    return parseBody(eventsSchema, route, response.data);
  }
  async event(
    cin: string,
    eventId: string,
  ): Promise<EngineResult<EventDetailResponse>> {
    const route = ENGINE_ROUTES.event;
    const company = cinSchema.safeParse(cin);
    if (!company.success) return invalidRequest(route, company.error);
    const id = z.string().trim().min(1).safeParse(eventId);
    if (!id.success) return invalidRequest(route, id.error);
    const path = `/v1/company/${encodeURIComponent(
      company.data,
    )}/events/${encodeURIComponent(id.data)}`;
    const response = await this.request(route, path);
    if (!response.ok) return response;
    return parseBody(eventDetailSchema, route, response.data);
  }
  async instrumentAffected(
    fragment: string,
  ): Promise<EngineResult<InstrumentAffectedResponse>> {
    const route = ENGINE_ROUTES.instrumentAffected;
    const value = z.string().trim().min(1).safeParse(fragment);
    if (!value.success) return invalidRequest(route, value.error);
    const path = `/v1/instruments/${encodeURIComponent(value.data)}/affected`;
    const response = await this.request(route, path);
    if (!response.ok) return response;
    return parseBody(instrumentAffectedSchema, route, response.data);
  }
}
