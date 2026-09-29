"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Ask" },
  { href: "/app/contracts", label: "Contracts" },
  { href: "/app/runs", label: "Runs" },
] as const;

/**
 * Marks the current screen with `aria-current`, which the stylesheet also underlines.
 * A nav that looks selected but tells a screen reader nothing is decoration.
 */
export function ConsoleNav({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav className="console-nav" aria-label="Console">
      {LINKS.map((l) => {
        const current =
          l.href === "/app" ? path === "/app" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
