"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getEnabledSnapshot() {
  return !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Global smooth-scroll. Skipped entirely under prefers-reduced-motion —
 * native instant scroll stays in place rather than being wrapped in Lenis.
 * `useSyncExternalStore` (server snapshot: disabled) reads the media query
 * without a setState-in-effect, so there is no hydration mismatch and no
 * cascading-render lint violation; Lenis only changes scroll physics, not
 * layout, so the one-frame upgrade is invisible either way.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(
    subscribe,
    getEnabledSnapshot,
    () => false,
  );

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis root options={{ duration: 1.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
