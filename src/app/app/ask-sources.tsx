"use client";

/**
 * The "@ sources" control that sits under the Ask box: a chip showing how many sources the
 * next question will search, opening a toggle list from `sources.list`, and a Files button
 * for the vault.
 *
 * Console rules (AGENTS.md): black and white, no colour; status is shown IN WORDS, never by
 * colour alone; 44px touch targets; works at 360px. An unavailable source is listed and
 * visible but cannot be switched on — its row is disabled and says why.
 */
import * as React from "react";
import Link from "next/link";
import { AtSign, Check, FolderOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SourceCard } from "@/lib/gateway/types";

/** The status word shown on each row. In words, so the state never depends on colour. */
const STATUS_WORD: Record<SourceCard["status"], string> = {
  available: "Available",
  KEY_MISSING: "Needs key",
  NOT_ACQUIRED: "Not acquired",
  BLOCKED: "Blocked",
};

export function AskSources({
  sources,
  selected,
  onChange,
}: {
  sources: readonly SourceCard[];
  selected: readonly string[];
  onChange: (ids: readonly string[]) => void;
}) {
  const count = selected.length;
  const chipText = count === 0 ? "Sources" : `${count} source${count === 1 ? "" : "s"}`;

  function toggle(id: string, on: boolean) {
    onChange(on ? [...selected, id] : selected.filter((x) => x !== id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-chip border border-line-2 bg-wash px-3 text-ui text-fg transition-colors hover:bg-wash-2"
          >
            <AtSign className="size-3.5 text-fg-2" aria-hidden />
            {chipText}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[320px] max-w-[calc(100vw-2rem)] p-1">
          {sources.length === 0 ? (
            <p className="px-2 py-3 text-body text-fg-2">
              No sources could be listed. Retrieval falls back to the held corpus.
            </p>
          ) : (
            <ul aria-label="Sources to search" className="flex flex-col">
              {sources.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-disabled={!s.switchable}
                      disabled={!s.switchable}
                      onClick={() => s.switchable && toggle(s.id, !on)}
                      className="flex w-full min-h-11 items-start gap-2.5 rounded-chip px-2 py-2 text-left transition-colors hover:bg-wash disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border ${on ? "border-fg bg-fg text-ground" : "border-line-control"}`}
                      >
                        {on ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-body text-fg">{s.label}</span>
                        <span className="font-mono text-caption text-fg-3">
                          {s.tier} · {STATUS_WORD[s.status]}
                          {s.switchable ? "" : s.reason ? ` — ${s.reason}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-line px-2 py-2 text-caption text-fg-3">
            Only a HELD source can make an answer verified. A greyed source says why it is off.
          </p>
        </PopoverContent>
      </Popover>

      <Link
        href="/app/documents"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-chip border border-line-2 bg-wash px-3 text-ui text-fg transition-colors hover:bg-wash-2"
      >
        <FolderOpen className="size-3.5 text-fg-2" aria-hidden />
        Files
      </Link>
    </div>
  );
}
