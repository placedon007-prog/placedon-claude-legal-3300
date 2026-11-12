/** Private legal workspaces never participate in marketing analytics or consent prompts. */
export function analyticsAllowed(pathname: string | null): boolean {
  return Boolean(pathname) && pathname !== "/app" && !pathname!.startsWith("/app/") && pathname !== "/login" && !pathname!.startsWith("/login/");
}

/**
 * Disabled for this shared-origin build. Loading a third-party tag on marketing pages
 * lets that script observe later private SPA navigations before React effects can run.
 * Re-enable only after separate document/origin isolation is implemented and verified.
 */
export const ANALYTICS_COLLECTION_ENABLED = false;
