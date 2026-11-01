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
import { formatLawDate, LAW_DATE_MIN, indiaToday, pastLawDate } from "@/lib/law-as-of";
import { cn } from "@/lib/utils";

export { SourcesChip } from "./source-picker";

/** Below 640px the chips go icon-only (44px square) so the controls fit one row; the
 *  label stays as the accessible name through `chipLabel` (sr-only there). */
export const chip =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-body text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg aria-expanded:bg-wash-2 aria-expanded:text-fg max-sm:min-w-11 max-sm:justify-center max-sm:px-0";
export const chipLabel = "max-sm:sr-only";

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

/* ── As of ────────────────────────────────────────────────────────────────── */

/**
 * "As of today", or a past date the law is read as at. A native date picker bounded to the
 * gateway's range (1 April 2014 to today). Only a past date is ever sent; the gateway may
 * still refuse it (AS_OF_UNSUPPORTED) while the feature is switched off.
 */
export function AsOfChip({ value, onChange, disabled = false }: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const today = indiaToday();
  const picked = pastLawDate(value, today);
  const label = picked ? `As of ${formatLawDate(picked)}` : "As of today";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(chip, picked && "border-fg text-fg")} disabled={disabled} aria-label={label}>
          <CalendarDays className="size-4" aria-hidden />
          <span className={chipLabel}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} collisionPadding={12} className="w-72">
        <label htmlFor="composer-as-of" className="text-body font-medium text-fg">Read the law as it stood on</label>
        <input
          id="composer-as-of"
          type="date"
          min={LAW_DATE_MIN}
          max={today}
          value={picked ?? today}
          onChange={(e) => onChange(pastLawDate(e.target.value, today) ?? null)}
          className="bare mt-2 h-11 w-full rounded-lg border border-line-control bg-ground px-3 text-body text-fg"
        />
        <p className="mt-2 text-caption text-fg-3">
          From 1 April 2014, when most of the <i>Companies Act, 2013</i> came into force. Earlier
          wording is rebuilt from India Code&rsquo;s amendment notes.
        </p>
        {picked ? (
          <button type="button" onClick={() => { onChange(null); setOpen(false); }}
            className="mt-2 min-h-11 rounded-chip border border-line-control px-3 text-ui text-fg hover:bg-wash">
            Use today&rsquo;s law
          </button>
        ) : null}
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
          <span className={cn("max-w-40 truncate", chipLabel)}>{current ? current.name : "No matter"}</span>
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
