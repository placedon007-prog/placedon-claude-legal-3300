/**
 * Placedon gateway — public surface.
 *
 * Server-only. Import `getGateway()` in a Server Component, a Server Action or a route
 * handler, never in a `"use client"` module: the API key would be inlined into the public
 * bundle. Every method returns `EngineResult<T>`, so a transport failure can never be
 * rendered as an abstention.
 */
export { getGateway, type GatewayProvider } from "./provider";
export * from "./types";
