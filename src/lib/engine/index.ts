/**
 * Placedon legal engine — public surface.
 *
 * Server-only. Import `getEngine()` in a Server Component or a route handler,
 * never in a `"use client"` module. Every method returns `EngineResult<T>`;
 * a failure can never be rendered as an abstention.
 */
export { getEngine, type EngineProvider } from "./provider";
export {
  type EngineResult,
  type EngineError,
  type EngineErrorKind,
  engineOk,
  engineFail,
  mapEngineResult,
  isDegraded,
} from "./errors";
export * from "./types";
