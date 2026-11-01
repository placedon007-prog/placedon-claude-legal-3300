"use client";

import { isReadableVaultState } from "@/lib/vault-state";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, FolderOpen, RefreshCw, Search } from "lucide-react";
import { browseVaultAction, deleteVaultDocumentAction, retryVaultDocumentAction, type VaultBrowseResult } from "@/app/app/vault/actions";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type SelectedVaultFile = { id: string; sha256?: string; name: string };
const PAGE_SIZE = 30;
const NOTICE_MS = 15_000;
const stateLabel: Record<string, string> = {
  INGESTED: "Ready to read", PENDING: "Processing", CANNOT_READ: "Needs a text layer",
  PARTIAL: "Partly read", DELETED: "Deleted", FAILED: "Processing failed",
};

/** FAILED (backend 030): reading stopped after its retries. One click queues it once more. */
function RetryButton({ documentId, name, onDone }: { documentId: string; name: string; onDone: (message: string) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  async function retry() {
    setBusy(true);
    setMessage(null);
    let result: { ok: boolean; message: string };
    try { result = await retryVaultDocumentAction({ documentId }); }
    catch { result = { ok: false, message: "The retry could not be sent. Nothing was changed; try again." }; }
    // Success is announced by the LIST: the refresh replaces this FAILED row, and a message
    // kept here would vanish with it before anyone could read it. The button stays disabled
    // until then, so a second click cannot send a retry that is bound to be refused.
    if (result.ok) { onDone(`${name}: ${result.message}`); return; }
    setBusy(false);
    setMessage({ ok: false, text: result.message });
  }
  return <span className="vault-retry">
    <button type="button" className="vault-text-button" disabled={busy} aria-label={`Retry ${name}`} onClick={retry}>
      {busy ? "Retrying…" : "Retry"}
    </button>
    {message && <span role={message.ok ? "status" : "alert"} className="text-caption text-fg-3">{message.text}</span>}
  </span>;
}

/**
 * `vault.delete`: a confirmation that names the file and says it is permanent. The backend
 * decides who may delete (LAWYER and up, and only files they may write); a refusal stays in
 * the dialog in words, and only a confirmed deletion closes it and refreshes the list.
 */
function DeleteButton({ documentId, name, onDeleted, focusAfter }: {
  documentId: string; name: string; onDeleted: (message: string) => void; focusAfter: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const deleted = React.useRef(false);
  async function confirm() {
    setBusy(true);
    setRefusal(null);
    let result: { ok: boolean; message: string };
    try { result = await deleteVaultDocumentAction({ documentId, name }); }
    catch { result = { ok: false, message: "The deletion could not be confirmed. Refresh the list to see whether the file is still there." }; }
    setBusy(false);
    if (!result.ok) { setRefusal(result.message); return; }
    deleted.current = true;
    setOpen(false);
    onDeleted(result.message);
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); setRefusal(null); } }}>
    <button type="button" className="vault-text-button" aria-label={`Delete ${name}`} onClick={() => setOpen(true)}>Delete</button>
    <DialogContent className="vault-picker vault-delete" role="alertdialog" showCloseButton={!busy}
      onCloseAutoFocus={(event) => { if (deleted.current) { event.preventDefault(); focusAfter(); } }}>
      <DialogHeader><DialogTitle>Delete {name}?</DialogTitle>
        <DialogDescription>
          This permanently removes {name} and its searchable text from this workspace. It cannot be undone.
          A record that the file existed and was deleted is kept.
        </DialogDescription>
      </DialogHeader>
      {refusal && <p role="alert" className="text-body text-fg">Not deleted. {refusal}</p>}
      <div className="vault-picker-footer">
        <DialogClose asChild><button type="button" className="vault-text-button" disabled={busy}>Cancel</button></DialogClose>
        <button type="button" className="vault-add-button" disabled={busy} aria-busy={busy} onClick={confirm}>
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </DialogContent>
  </Dialog>;
}

/** Metadata only. Search is bounded on the server and stale responses never become rows. */
export function VaultFileBrowser({ matterId, selected = [], onToggle, capacity = 20, refreshKey = "" }: {
  matterId: string | null;
  selected?: readonly SelectedVaultFile[];
  onToggle?: (file: SelectedVaultFile) => void;
  capacity?: number;
  refreshKey?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [revision, refresh] = React.useReducer((n: number) => n + 1, 0);
  // A retry's notice belongs to the list it was given in: another search, page or matter
  // hides it, and it clears itself after NOTICE_MS so it cannot outlive what it describes.
  const scope = JSON.stringify([matterId, query, offset]);
  const [notice, setNotice] = React.useState<{ scope: string; text: string } | null>(null);
  // A deleted row takes its button with it; focus lands on the list, not on <body>.
  const listRef = React.useRef<HTMLDivElement>(null);
  // Ids the backend CONFIRMED deleted stay hidden even if a list read races the deletion.
  const [gone, setGone] = React.useState<ReadonlySet<string>>(() => new Set());
  const router = useRouter();
  React.useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  const key = JSON.stringify([matterId, query, offset, revision, refreshKey]);
  const [response, setResponse] = React.useState<{ key: string; result: VaultBrowseResult } | null>(null);
  React.useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      React.startTransition(async () => {
        let result: VaultBrowseResult;
        try { result = await browseVaultAction({ matterId, query, offset }); }
        catch { result = { ok: false, message: "Stored files could not be loaded. Please retry." }; }
        if (live) setResponse({ key, result });
      });
    }, query ? 250 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [key, matterId, query, offset]);
  const result = response?.key === key ? response.result : null;
  const data = result?.ok ? { ...result.data, documents: result.data.documents.filter((d) => !gone.has(d.document_id)) } : null;
  return <div className="vault-browser">
    <div className="vault-browser-search">
      <Search className="size-4" aria-hidden />
      <input type="search" className="bare" aria-label="Search stored filenames" placeholder="Search files by name…" maxLength={120}
        value={query} onChange={(e) => { setQuery(e.target.value); setOffset(0); }} />
      <button type="button" className="vault-icon-button" aria-label="Refresh stored files" onClick={refresh}><RefreshCw className="size-4" aria-hidden /></button>
    </div>
    {/* Always present, so screen readers announce the text when it arrives. */}
    <p role="status" className="text-caption text-fg-2">{notice?.scope === scope ? notice.text : ""}</p>
    <div className="vault-browser-list" aria-busy={!result} ref={listRef} tabIndex={-1} aria-label="Stored files">
      {!result ? <p role="status" className="vault-browser-empty">Loading stored files…</p> : !result.ok ?
        <div role="alert" className="vault-browser-empty"><p>{result.message}</p><button type="button" className="vault-text-button" onClick={refresh}>Retry</button></div> :
        data?.documents.length === 0 ? <div className="vault-browser-empty"><FolderOpen className="size-7" aria-hidden /><p>{query ? "No filenames match this search." : "No files stored in this scope yet."}</p><p className="text-caption text-fg-3">Upload a file here, or choose its matter in Wall System.</p></div> :
        <ul>{data?.documents.map((file) => {
          const checked = selected.some((d) => d.id === file.document_id);
          const readable = isReadableVaultState(file.state);
          const disabled = !readable || (!checked && selected.length >= capacity);
          const label = stateLabel[file.state] ?? "Status unavailable";
          const content = <><span className="vault-file-art"><FileText className="size-5" aria-hidden /></span>
            <span className="vault-file-copy"><strong>{file.name}</strong><span>{label}{!readable ? " · cannot attach yet" : ""}</span></span></>;
          return <li key={file.document_id}>
            {onToggle ? <button type="button" role="checkbox" aria-checked={checked} disabled={disabled}
              aria-label={`${file.name} — ${label}`} className="vault-file-row" data-selected={checked}
              onClick={() => onToggle({ id: file.document_id, sha256: file.sha256, name: file.name })}>
              {content}<span className="vault-file-check" aria-hidden>{checked ? <Check className="size-3.5" /> : null}</span>
            </button> : <div className="vault-file-row">{content}{file.state === "FAILED" && <RetryButton documentId={file.document_id} name={file.name} onDone={(message) => { setNotice({ scope, text: message }); refresh(); }} />}
              <Link className="vault-text-button" href={`/app/document-check?doc=${encodeURIComponent(file.document_id)}`}>Inspect</Link>
              <DeleteButton documentId={file.document_id} name={file.name} onDeleted={(message) => { setGone((prev) => new Set([...prev, file.document_id])); setNotice({ scope, text: message }); refresh();
                  router.refresh(); /* the page's vault counts are server-rendered */ }}
                focusAfter={() => listRef.current?.focus()} /></div>}
          </li>;
        })}</ul>}
    </div>
    <div className="vault-browser-pagination"><span>{data?.truncated ? "Refine the search to see more files." : "Searchable text copies · keep your originals"}</span>
      {offset > 0 && <button type="button" className="vault-text-button" disabled={!result} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>}
      {data?.next_offset !== null && data?.next_offset !== undefined && <button type="button" className="vault-text-button" onClick={() => setOffset(data.next_offset!)}>Next</button>}
    </div>
  </div>;
}

export function VaultPicker({ open, onOpenChange, matterId, matterName, selected, capacity, onAdd, returnFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void;
  matterId: string | null; matterName?: string;
  selected: readonly SelectedVaultFile[]; capacity: number;
  onAdd: (files: readonly SelectedVaultFile[]) => void;
  returnFocus: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="vault-picker" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }}>
      <DialogHeader><DialogTitle>Add from Wall System</DialogTitle><DialogDescription>
        {matterId ? `${matterName || "Current matter"} · matter documents` : "Unfiled workspace documents"}
      </DialogDescription></DialogHeader>
      {open && <VaultPickerContents key={matterId ?? "unfiled"} matterId={matterId} selected={selected} capacity={capacity}
        onAdd={(files) => { onAdd(files); onOpenChange(false); }} />}
    </DialogContent>
  </Dialog>;
}

function VaultPickerContents({ matterId, selected, capacity, onAdd }: {
  matterId: string | null; selected: readonly SelectedVaultFile[]; capacity: number;
  onAdd: (files: readonly SelectedVaultFile[]) => void;
}) {
  const [draft, setDraft] = React.useState<SelectedVaultFile[]>([...selected]);
  function toggle(file: SelectedVaultFile) {
    setDraft((current) => current.some((d) => d.id === file.id) ? current.filter((d) => d.id !== file.id)
      : current.length < capacity ? [...current, file] : current);
  }
  return <><VaultFileBrowser matterId={matterId} selected={draft} onToggle={toggle} capacity={capacity} />
    <div className="vault-picker-footer"><Link href="/app/vault" className="vault-text-button"><FolderOpen className="size-4" aria-hidden />Open Wall System</Link>
      <span className="text-caption text-fg-3">{draft.length} / {capacity} selected</span>
      <button type="button" className="vault-add-button" onClick={() => onAdd(draft)}>{draft.length ? `Use ${draft.length} file${draft.length === 1 ? "" : "s"}` : "Done"}</button>
    </div></>;
}
