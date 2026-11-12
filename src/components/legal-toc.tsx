"use client";

import { useEffect, useState } from "react";
import { headingId } from "./legal-document";

/**
 * Scroll-spy table of contents for legal documents.
 *
 * As the reader scrolls, the topic currently under the top of the viewport is
 * marked active — a single white marker moves down the list, one topic at a
 * time. Uses a rAF-throttled scroll listener with getBoundingClientRect (not
 * CSS `animation-timeline`, which Brave disables). The active link carries
 * `aria-current="location"` so assistive tech announces it too.
 *
 * The marker itself is CSS; under reduced motion the global transition reset
 * makes the marker snap rather than glide — the active topic is still tracked.
 */
export function LegalToc({ headings }: { headings: readonly string[] }) {
  const [active, setActive] = useState<string>(
    headings[0] ? headingId(headings[0]) : "",
  );

  useEffect(() => {
    const ids = headings.map(headingId);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // Active = the last heading whose top has passed the sticky offset band.
    const OFFSET = 130;
    let frame = 0;

    const measure = () => {
      frame = 0;
      let current = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top - OFFSET <= 0) current = el.id;
        else break;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  return (
    <nav className="legal-toc" aria-label="Document sections">
      {headings.map((heading) => {
        const id = headingId(heading);
        const isActive = active === id;
        return (
          <a
            key={heading}
            href={`#${id}`}
            data-active={isActive ? "true" : "false"}
            aria-current={isActive ? "location" : undefined}
          >
            {heading}
          </a>
        );
      })}
    </nav>
  );
}
