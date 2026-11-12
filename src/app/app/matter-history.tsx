"use client";

import * as React from "react";
import { History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadMatterHistory, type MatterHistory } from "./actions";

/** Lists only the selected matter; there is deliberately no cross-matter history request. */
export function MatterHistoryMenu({ matterId, initialHistory }: { matterId: string | null; initialHistory: MatterHistory | null }) {
  const [history, setHistory] = React.useState(initialHistory);
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  return <Popover open={open} onOpenChange={(next) => {
    setOpen(next);
    if (!next || !matterId) return;
    startTransition(async () => {
      try { setHistory(await loadMatterHistory(matterId)); }
      catch { setHistory({ phase: "unavailable", message: "Matter history did not arrive. Close and reopen to retry." }); }
    });
  }}>
    <PopoverTrigger asChild><button type="button" className="flex min-h-11 items-center gap-2 rounded-chip px-3 text-ui text-fg-2 hover:bg-wash-2"><History className="size-4" aria-hidden />History</button></PopoverTrigger>
    <PopoverContent align="end" className="max-h-[60dvh] w-[min(360px,calc(100vw-24px))] overflow-y-auto p-2">
      <p className="px-2 py-2 text-body font-medium text-fg">{matterId ? "Conversations in this matter" : "Unfiled conversations"}</p>
      {!matterId ? <p className="px-2 pb-2 text-ui text-fg-2">Unfiled history is limited to this browser’s sidebar. Choose a matter before sending to save conversations in its shared history.</p>
        : pending && !history ? <p role="status" className="px-2 py-3 text-ui text-fg-3">Loading saved conversations…</p>
        : history?.phase === "unavailable" ? <p role="status" className="px-2 py-3 text-ui text-fg-2">{history.message}</p>
        : history?.phase === "loaded" && history.conversations.length ? <ul>{history.conversations.map((conversation) => <li key={conversation.conversation_id}><a href={`/app?c=${encodeURIComponent(conversation.conversation_id)}`} className="block min-h-11 rounded-chip px-2 py-3 text-body text-fg hover:bg-wash-2">{conversation.title || "Untitled conversation"}</a></li>)}</ul>
        : <p className="px-2 py-3 text-ui text-fg-3">No saved conversations in this matter.</p>}
      {matterId ? <p className="border-t border-line px-2 pt-2 text-caption text-fg-3">Loaded from this workspace’s server.</p> : null}
    </PopoverContent>
  </Popover>;
}
