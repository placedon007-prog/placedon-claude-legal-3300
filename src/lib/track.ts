import { ANALYTICS_COLLECTION_ENABLED, analyticsAllowed } from "./analytics-policy";
/**
 * Fire a Google Analytics event — safely.
 *
 * `gtag` only exists once the visitor has accepted analytics (see
 * components/analytics.tsx), so this is a no-op without consent, in local dev,
 * or if GA failed to load. Send only non-identifying labels here — never an
 * email, name, or free-text the visitor typed — to stay within the privacy
 * policy's analytics scope.
 */
type TrackParams = Record<string, string | number | boolean>;

export function track(event: string, params?: TrackParams): void {
  if (!ANALYTICS_COLLECTION_ENABLED || typeof window === "undefined" || !analyticsAllowed(window.location.pathname)) return;
  const w = window as unknown as {
    gtag?: (command: string, event: string, params?: TrackParams) => void;
  };
  if (typeof w.gtag === "function") {
    w.gtag("event", event, params ?? {});
  }
}
