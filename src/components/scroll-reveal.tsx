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
 *   - A block reveals ONCE and is then unobserved. The earlier version replayed
 *     the reveal on every scroll pass, so a reader scrolling back up through a
 *     privacy policy watched the same paragraphs dim and lift again — motion
 *     with no information in it, and the page never settled.
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

    // Anti-flash: only blocks below the fold on load start hidden. Everything
    // already in view stays visible so legal copy never flashes on load.
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      el.setAttribute("data-reveal", rect.top >= viewportH ? "out" : "in");
    });

    // Reveal once, then stop watching the block: it stays at `in` for the rest
    // of the session, so scrolling back up does not re-dim settled copy.
    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          obs.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);

  return (
    <div ref={scope} className="reveal-scope">
      {children}
    </div>
  );
}
