"use client";

import { PRACTICE_AREAS, type PracticeAreaId } from "@/lib/practice-areas";
import { usePracticeArea } from "./local-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function label(id: string | null): string {
  if (!id) return "All areas";
  return PRACTICE_AREAS.find((pa) => pa.id === id)?.shortLabel ?? "All areas";
}

/** Sidebar-width practice area picker. Shows the current choice or "All areas". */
export function PracticeSelector({ collapsed }: { collapsed: boolean }) {
  const [current, setCurrent] = usePracticeArea();

  const trigger = (
    <DropdownMenuTrigger asChild>
      <button
        className="flex min-h-11 w-full items-center gap-2 rounded-card px-3 text-ui text-fg-2 hover:bg-wash-2 hover:text-fg"
        aria-label={`Practice area: ${label(current)}`}
      >
        <Briefcase className="size-4 shrink-0" aria-hidden />
        {collapsed ? null : (
          <>
            <span className="flex-1 truncate text-left">{label(current)}</span>
            <ChevronDown className="size-3.5 shrink-0 text-fg-3" aria-hidden />
          </>
        )}
      </button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{label(current)}</TooltipContent>
        </Tooltip>
      ) : trigger}
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem
          onSelect={() => setCurrent(null)}
          className={current === null ? "font-medium" : ""}
        >
          All areas
        </DropdownMenuItem>
        {PRACTICE_AREAS.map((pa) => (
          <DropdownMenuItem
            key={pa.id}
            disabled={pa.status === "coming_soon"}
            onSelect={() => setCurrent(pa.id)}
            className={current === pa.id ? "font-medium" : ""}
          >
            <span className="flex-1">{pa.label}</span>
            {pa.status === "coming_soon" ? (
              <span className="text-caption text-fg-3">Soon</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
