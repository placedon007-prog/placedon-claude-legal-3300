"use client";

/**
 * The composer's source controls: the "N sources" chip and its popover, the "@" menu, the
 * "As of today" chip and the matter chip. Every name, status and coverage line comes from
 * the gateway's sources.list (generated there from checker/scope.BODIES); what each status
 * MEANS is said in words by `statusLine`, never by colour.
 */
import * as React from "react";
import { Briefcase, CalendarDays, Check, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MentionItem } from "@/lib/sources";
import { cn } from "@/lib/utils";

export { SourcesChip } from "./source-picker";

export const chip =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-body text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg aria-expanded:bg-wash-2 aria-expanded:text-fg";

/* ── the @ menu ───────────────────────────────────────────────────────────── */

export function MentionMenu({
  id,
  items,
  active,
  chosen,
  note,
  onPick,
  onHover,
}: {
  id: string;
  items: readonly MentionItem[];
  active: number;
  chosen: readonly string[];
  /** Said under the documents, e.g. that the search covers the whole firm. */
  note: string | null;
  onPick: (item: MentionItem) => void;
  onHover: (index: number) => void;
}) {
  const sources = items.filter((i) => i.kind === "source");
  const docs = items.filter((i) => i.kind === "document");
  const row = (item: MentionItem) => {
    const index = items.indexOf(item);
    const isOn = item.kind === "source" && chosen.includes(item.id);
    return (
      <li
        key={`${item.kind}:${item.id}`}
        id={`${id}-${index}`}
        role="option"
        aria-selected={index === active}
        onMouseDown={(e) => {
          e.preventDefault(); // keep focus in the textarea
          onPick(item);
        }}
        onMouseEnter={() => onHover(index)}
        className={cn(
          "flex min-h-11 cursor-pointer items-center gap-2.5 px-3 text-body text-fg",
          index === active && "bg-wash-2",
        )}
      >
        {item.kind === "document" ? (
          <FileText className="size-4 flex-none text-fg-2" aria-hidden />
        ) : (
          <span className="w-16 flex-none truncate font-mono text-caption text-fg-2">{item.short}</span>
        )}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {isOn ? <Check className="size-4 flex-none" aria-label="on" /> : null}
      </li>
    );
  };
  return (
    <div className="absolute inset-x-2 bottom-full z-30 mb-2 overflow-hidden rounded-card border border-line-2 bg-ground shadow-float">
      <ul id={id} role="listbox" aria-label="Add a source or document" className="max-h-72 overflow-y-auto py-1">
        {sources.length ? <li role="presentation" className="px-3 pt-1 pb-0.5 text-caption text-fg-3">Sources</li> : null}
        {sources.map(row)}
        {docs.length ? <li role="presentation" className="px-3 pt-2 pb-0.5 text-caption text-fg-3">Wall System documents</li> : null}
        {docs.map(row)}
        {items.length === 0 ? <li role="presentation" className="px-3 py-2 text-ui text-fg-3">Nothing matches.</li> : null}
      </ul>
      {note ? <p className="border-t border-line px-3 py-1.5 text-caption text-fg-3">{note}</p> : null}
      <p className="border-t border-line px-3 py-1.5 text-caption text-fg-3">↑ ↓ to move · Enter to add · Esc to close</p>
    </div>
  );
}

/* ── As of today ─────────────────────────────────────────────────────────── */

/** The gateway's own reason for refusing a past as_of (AS_OF_UNSUPPORTED). */
export const AS_OF_REASON =
  "This engine reads the law as it stands today. Point-in-time reconstruction is unverified against any external source, so an answer stamped with a past date would be today's text wearing one.";

export function AsOfChip() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={chip}>
          <CalendarDays className="size-4" aria-hidden />
          As of today
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className="w-72">
        <p className="text-body font-medium text-fg">Read as the law stands today</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="mt-2 block rounded-chip">
              <input
                type="date"
                disabled
                aria-label="A past date — not available"
                className="bare h-11 w-full rounded-lg border border-line-2 bg-wash px-3 text-body text-fg-3"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">{AS_OF_REASON}</TooltipContent>
        </Tooltip>
        <p className="mt-2 text-caption text-fg-3">A past date is refused (AS_OF_UNSUPPORTED). {AS_OF_REASON}</p>
      </PopoverContent>
    </Popover>
  );
}

/* ── matter ───────────────────────────────────────────────────────────────── */

export function MatterChip({
  matters,
  matterId,
  onChange,
}: {
  matters: readonly { matter_id: string; name: string }[];
  matterId: string | null;
  onChange: (id: string | null) => void;
}) {
  if (matters.length === 0) return null; // optional: nothing to file to
  const current = matters.find((m) => m.matter_id === matterId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={chip}>
          <Briefcase className="size-4" aria-hidden />
          <span className="max-w-40 truncate">{current ? current.name : "No matter"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel className="text-caption font-normal text-fg-3">File this thread to a matter</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={matterId ?? ""} onValueChange={(v) => onChange(v || null)}>
          <DropdownMenuRadioItem value="" className="min-h-11">No matter</DropdownMenuRadioItem>
          {matters.map((m) => (
            <DropdownMenuRadioItem key={m.matter_id} value={m.matter_id} className="min-h-11">
              {m.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
