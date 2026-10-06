"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileCheck2,
  FileSearch,
  FileText,
  History,
  MessageSquare,
  PenLine,
  Table2,
  Archive,
} from "lucide-react";

const LINKS = [
  { href: "/app", label: "Ask", icon: MessageSquare },
  { href: "/app/contracts", label: "Contracts", icon: FileSearch },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/document-check", label: "Document Check", icon: FileCheck2 },
  // Shown as "Wall System" (owner decision, 2026-10-06); the route stays /app/vault so
  // existing links and the backend's vault.* verbs are unchanged.
  { href: "/app/vault", label: "Wall System", icon: Archive },
  { href: "/app/tables", label: "Review tables", icon: Table2 },
  { href: "/app/drafts", label: "Drafts", icon: PenLine },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/runs", label: "Runs", icon: History },
] as const;

/**
 * Marks the current screen with `aria-current`, which the stylesheet also shades.
 * A nav that looks selected but tells a screen reader nothing is decoration.
 */
export function ConsoleNav({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav className="console-nav" aria-label="Console">
      {LINKS.map((l) => {
        const current = l.href === "/app" ? path === "/app" : path.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            <Icon aria-hidden />
            {l.label}
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
