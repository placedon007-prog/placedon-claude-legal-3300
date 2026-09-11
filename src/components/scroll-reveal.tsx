"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal-on-scroll for server-rendered content.
 *
 * Uses an IntersectionObserver, not CSS `animation-timeline: view()`, because
 * Brave disables scroll-driven animations by default. Works in every browser
 * that ships IntersectionObserver; everything else keeps the content visible.
 *
 * Anti-flash + readability contract:
 *   - Blocks already in view on load are left visible (never hidden → no flash).
 *   - Only below-the-fold blocks are set to `out` and revealed as they enter.
 *   - Reduced motion, or no IntersectionObserver, leaves everything visible.
 * Legal text is therefore always readable even if JS fails.
 */
export function ScrollReveal({
  children,
  selector,
}: {
  children: ReactNode;
  /** CSS selector (relative to this scope) for the blocks to reveal. */
  selector: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(selector),
    );
    if (targets.length === 0) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || !("IntersectionObserver" in window)) return;

    const viewportH = window.innerHeight;
    const below = targets.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= viewportH; // strictly below the fold on load
    });
    if (below.length === 0) return;

    below.forEach((el) => el.setAttribute("data-reveal", "out"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal", "in");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    below.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);

  return (
    <div ref={scope} className="reveal-scope">
      {children}
    </div>
  );
}
