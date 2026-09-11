import type { EngineRoute } from "./types";
/**
 * Failure vocabulary for the engine boundary.
 *
 * An engine failure is NOT an abstention. An abstention is a verified product
 * state that lives inside a parsed payload; these kinds all mean the payload
 * never arrived or could not be trusted. Nothing here may ever be rendered in
 * the abstain register — `EngineError` carries no obligation, no provision and
 * no product class, so it cannot stand in for one.
 */
export type EngineErrorKind =
  | "transport_error"
  | "timeout"
  | "schema_mismatch"
  | "not_found"
  | "bad_request"
  | "server_error";
export interface EngineError {
  readonly kind: EngineErrorKind;
  /** Operator-facing sentence. Never legal copy. */
  readonly message: string;
  readonly route: EngineRoute;
  /** Present only when a response was actually received. */
  readonly status?: number;
  /** The backend's `detail` — on a 400 it names the exact offending field. */
  readonly detail?: string;
  /** 404 route list. Absent on the event-detail 404 (drift 3). */
  readonly routes?: readonly string[];
  /** Schema issues, as `path: message`, when the body did not match the contract. */
  readonly issues?: readonly string[];
}
/**
 * Every engine call returns this. Nothing throws across the boundary, and the
 * discriminant forces a caller to narrow on `ok` before any payload exists —
 * so an error has no path into a data renderer.
 */
export type EngineResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: EngineError };
export function engineOk<T>(data: T): EngineResult<T> {
  return { ok: true, data };
}
export function engineFail<T>(error: EngineError): EngineResult<T> {
  return { ok: false, error };
}
/** Transform a payload without giving the failure branch a way into `transform`. */
export function mapEngineResult<T, U>(
  result: EngineResult<T>,
  transform: (data: T) => U,
): EngineResult<U> {
  return result.ok ? engineOk(transform(result.data)) : result;
}
/** True when the engine could not be reached or its answer could not be trusted. */
export function isDegraded(kind: EngineErrorKind): boolean {
  return (
    kind === "transport_error" ||
    kind === "timeout" ||
    kind === "schema_mismatch" ||
    kind === "server_error"
  );
}
