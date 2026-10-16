"use client";

/**
 * The /app composer, v2. Started from the owner's 21st.dev "ChatGPT prompt input", rebuilt
 * on shadcn primitives. The source selector uses attributed official identity assets;
 * Files exposes both uploads and the scoped Wall System browser.
 *
 *  - Files: stores a PDF or DOCX in Wall System, a chip per file.
 *  - N sources: which bodies of law the question is searched against (sources.list). The
 *    choice is remembered per thread by the caller.
 *  - "@": the same sources inline, plus Wall System documents found by name as you type.
 *  - As of today: a past date is disabled, with the gateway's AS_OF_UNSUPPORTED reason.
 *  - Matter: optional, when the firm has matters.
 *  - Tools: Research (default), Draft (a removable chip), and two that open their screens.
 *  - Unavailable voice input is omitted; no browser speech API handles legal questions.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowUp, ChevronRight, FileCheck2, FileSearch, FileText, FolderOpen, Globe2, Paperclip, Upload, PenLine, Scale, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { AsOfChip, MatterChip, MentionMenu, SourcesChip, chip } from "@/components/ui/composer-parts";
import type { SourceBody, SourceIntegration } from "@/lib/gateway/types";
import { mentionMatches, type MentionItem } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { VaultPicker, type SelectedVaultFile } from "@/components/ui/vault-browser";

export type ComposerTool = "research" | "draft" | "web";
export type WebMode = "GENERAL_WEB" | "CASE_DISCOVERY";

/** What happened to an attached file. The words are shown on its chip. */
export type AttachOutcome =
  | { readonly ok: true; readonly href: string; readonly id: string; readonly state: string }
  | { readonly ok: false; readonly message: string };

/** Wall System documents found for "@", or why none could be looked up. */
export type DocumentLookup =
  | { readonly ok: true; readonly hits: readonly { id: string; name: string }[]; readonly note: string }
  | { readonly ok: false; readonly message: string };

export interface PromptBoxProps {
  onSubmit: (text: string, tool: ComposerTool, fileIds: readonly string[], webMode: WebMode, webConsent: boolean) => void;
  checkDocument?: (id: string) => Promise<{ state: string; note: string }>;
  matterLocked?: boolean;
  onAttach?: (file: File) => Promise<AttachOutcome>;
  pending?: boolean;
  canDraft?: boolean;
  tool: ComposerTool;
  onToolChange: (tool: ComposerTool) => void;
  /** sources.list bodies; `failed` when they did not arrive (the default is then used). */
  sources: { bodies: readonly SourceBody[]; integrations: readonly SourceIntegration[]; failed: boolean; refreshing?: boolean; failureMessage?: string };
  chosen: readonly string[];
  onToggleSource: (id: string) => void;
  onRetrySources?: () => void;
  matters: readonly { matter_id: string; name: string }[];
  matterId: string | null;
  onMatter: (id: string | null) => void;
  findDocuments?: (query: string) => Promise<DocumentLookup>;
  /** Imperative access to the composer — used to restore a draft after a sign-in detour. */
  composerRef?: React.Ref<ComposerHandle>;
  className?: string;
}

/** The minimal imperative surface a parent needs: put text back into the composer. */
export interface ComposerHandle {
  setText: (text: string) => void;
}

const MAX_ROWS_PX = 200;
const subscribeReady = () => () => {};
const readyInBrowser = () => true;
const readyOnServer = () => false;
const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PLACEHOLDER = "Ask about Indian corporate law. Type @ to add a source or document.";
const MENU_ID = "composer-mention-menu";

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-72">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type Attached = { key: string; name: string } & (
  | { state: "storing" }
  | { state: "stored"; href: string; id: string; readiness: string; note?: string }
  | { state: "error"; message: string }
);

/** The "@query" being typed just before the caret, or null. */
function mentionAt(text: string, caret: number): { query: string; start: number } | null {
  const m = /(^|\s)@([^\s@]{0,40})$/.exec(text.slice(0, caret));
  return m ? { query: m[2], start: caret - m[2].length - 1 } : null;
}

export function PromptBox(props: PromptBoxProps) {
  const {
    onSubmit, onAttach, pending = false, canDraft = false, tool, onToolChange: setTool,
    sources, chosen, onToggleSource, onRetrySources, matters, matterId, onMatter, findDocuments, checkDocument, matterLocked, composerRef, className,
  } = props;
  const hydrated = React.useSyncExternalStore(subscribeReady, readyInBrowser, readyOnServer);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const filesButtonRef = React.useRef<HTMLButtonElement>(null);
  const sourcesButtonRef = React.useRef<HTMLButtonElement>(null);
  const vaultOrigin = React.useRef<"files" | "sources">("files");
  const openingVault = React.useRef(false);
  const uploadingBatch = React.useRef(false);
  const [filesOpen, setFilesOpen] = React.useState(false);
  const [vaultOpen, setVaultOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [webMode, setWebMode] = React.useState<WebMode>("GENERAL_WEB");
  const [webConsent, setWebConsent] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [files, setFiles] = React.useState<Attached[]>([]);
  const [docs, setDocs] = React.useState<{ id: string; name: string }[]>([]);
  const [mention, setMention] = React.useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = React.useState(0);
  const [found, setFound] = React.useState<{ query: string; result: DocumentLookup } | null>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  // Restore a parked draft on demand (after a sign-in detour). Imperative, so the parent can
  // refill the composer once without a controlled-value effect fighting what the user types.
  React.useImperativeHandle(composerRef, () => ({ setText: (text: string) => { setValue(text); setWebConsent(false); } }), []);

  // Documents for "@", looked up by what was typed (3+ characters), a moment after typing stops.
  const query = mention?.query ?? "";
  React.useEffect(() => {
    if (!findDocuments || query.length < 3) return;
    let live = true;
    const t = window.setTimeout(() => {
      findDocuments(query).then((r) => {
        if (live) setFound({ query, result: r });
      }).catch(() => { if (live) setFound({ query, result: { ok: false, message: "Document search is temporarily unavailable. Try again." } }); });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [query, findDocuments]);

  const lookup = found?.query === query ? found.result : null;
  const sourceItems: MentionItem[] = sources.bodies
    .filter((b) => b.selectable)
    .map((b) => ({ kind: "source", id: b.id, short: b.short, label: b.name }));
  const docItems: MentionItem[] =
    query.length >= 3 && lookup?.ok
      ? lookup.hits.map((h) => ({ kind: "document", id: h.id, short: "DOC", label: h.name }))
      : [];
  const items = mention ? mentionMatches([...sourceItems, ...docItems], mention.query) : [];
  const menuNote =
    query.length < 3
      ? "Type 3 letters to search Wall System documents."
      : lookup && !lookup.ok
        ? lookup.message
        : lookup?.ok
          ? lookup.note
          : null;

  const waitingForFiles = files.some((f) => f.state !== "stored" || f.readiness !== "INGESTED");
  const overAttachmentLimit = files.length + docs.length > 20;
  const webReady = tool === "web" && value.trim().length >= 3 && value.trim().length <= 800
    && webConsent && files.length === 0 && docs.length === 0;
  const canSend = hydrated && !pending && (tool === "web" ? webReady
    : value.trim().length >= 8 && !waitingForFiles && !sources.failed && !overAttachmentLimit);
  const processingIds = files.filter((f) => f.state === "stored" && ["PENDING", "UNKNOWN"].includes(f.readiness)).map((f) => f.state === "stored" ? f.id : "").join(",");
  React.useEffect(() => {
    if (!processingIds || !checkDocument) return;
    let live = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.visibilityState !== "hidden") {
        await Promise.all(processingIds.split(",").map(async (id) => {
          try {
            const result = await checkDocument(id);
            if (live) setFiles((all) => all.map((f) => f.state === "stored" && f.id === id ? { ...f, readiness: result.state, note: result.note } : f));
          } catch {
            if (live) setFiles((all) => all.map((f) => f.state === "stored" && f.id === id
              ? { ...f, note: "Document status is temporarily unavailable. Checking again shortly." } : f));
          }
        }));
      }
      if (live) timer = setTimeout(poll, Math.min(30000, 1500 * 2 ** Math.min(attempt++, 5)));
    };
    timer = setTimeout(poll, 1500);
    return () => { live = false; clearTimeout(timer); };
  }, [processingIds, checkDocument]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSubmit(value.trim(), tool, [...new Set([...docs.map((d) => d.id), ...files.flatMap((f) => f.state === "stored" && f.readiness === "INGESTED" ? [f.id] : [])])], webMode, webConsent);
    setDocs([]);
    setFiles([]);
    setValue("");
    setWebConsent(false);
    if (tool !== "web") setTool("research");
    setMention(null);
  }

  function track(text: string, caret: number) {
    const m = mentionAt(text, caret);
    setMention(m);
    if (!m || m.query !== mention?.query) setActive(0);
  }

  function pick(item: MentionItem) {
    if (item.kind === "source") {
      if (!chosen.includes(item.id)) onToggleSource(item.id);
    } else if (files.length + docs.length < 20 && !docs.some((d) => d.id === item.id) && !files.some((f) => f.state === "stored" && f.id === item.id)) {
      setDocs((d) => [...d, { id: item.id, name: item.label }]);
      if (!chosen.includes("vault")) onToggleSource("vault");
    }
    // Remove the typed "@query"; the choice now shows as a chip or in the sources count.
    if (mention) {
      const end = mention.start + 1 + mention.query.length;
      setValue((v) => v.slice(0, mention.start) + v.slice(end));
    }
    setMention(null);
    ref.current?.focus();
  }

  async function attach(list: FileList | null) {
    if (!list || !onAttach || uploadingBatch.current) return;
    uploadingBatch.current = true;
    const batch = Array.from(list).slice(0, Math.max(0, 20 - files.length - docs.length))
      .map((file) => ({ file, key: crypto.randomUUID() }));
    // Reserve every slot before the first await, including files still waiting to upload.
    setFiles((current) => [...current, ...batch.map(({ file, key }) => ({ key, name: file.name, state: "storing" as const }))]);
    for (const { file, key } of batch) {
      let outcome: AttachOutcome;
      try { outcome = await onAttach(file); } catch { outcome = { ok: false, message: "Upload interrupted. Remove this file and attach it again." }; }
      setFiles((f) =>
        f.map((x) =>
          x.key !== key
            ? x
            : outcome.ok
              ? { key, name: file.name, state: "stored", href: outcome.href, id: outcome.id, readiness: outcome.state }
              : { key, name: file.name, state: "error", message: outcome.message },
        ),
      );
    }
    uploadingBatch.current = false;
    if (fileRef.current) fileRef.current.value = "";
  }

  function openVault(origin: "files" | "sources") {
    vaultOrigin.current = origin;
    openingVault.current = origin === "files";
    setFilesOpen(false);
    setVaultOpen(true);
  }
  function useVaultFiles(next: readonly SelectedVaultFile[]) {
    const uploaded = new Set(files.flatMap((f) => f.state === "stored" ? [f.id] : []));
    const unique = next.filter((d) => !uploaded.has(d.id)).slice(0, Math.max(0, 20 - files.length));
    setDocs([...unique]);
    if (unique.length && !chosen.includes("vault")) onToggleSource("vault");
  }

  const menuOpen = mention !== null;

  return (
    <form
      onSubmit={submit}
      className={cn(
        "relative flex flex-col rounded-composer border border-line-2 bg-ground p-2 shadow-float transition-colors duration-150 focus-within:border-fg",
        className,
      )}
    >
      {menuOpen ? (
        <MentionMenu
          id={MENU_ID}
          items={items}
          active={Math.min(active, Math.max(items.length - 1, 0))}
          chosen={chosen}
          note={menuNote}
          onPick={pick}
          onHover={setActive}
        />
      ) : null}

      {tool === "draft" || files.length || docs.length ? (
        <div className="flex flex-wrap gap-1.5 px-2 pt-1">
          {tool === "draft" ? (
            <Chip icon={PenLine} label="Draft from this thread" onRemove={() => setTool("research")} removeLabel="Remove Draft" />
          ) : null}
          {files.map((f) => (
            <FileChip key={f.key} file={f} onRemove={() => setFiles((all) => all.filter((x) => x.key !== f.key))} />
          ))}
          {docs.map((d) => (
            <Tip
              key={d.id}
              label="Selected for this request. The gateway checks document readiness and matter access before reading; a law research answer does not claim document grounding."
            >
              <span className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-chip border border-line-2 bg-wash pr-1 pl-2.5 text-ui text-fg">
                <FileText className="size-3.5 flex-none" aria-hidden />
                <span className="truncate">{d.name}</span>
                <Link href={`/app/document-check?doc=${encodeURIComponent(d.id)}`} className="text-fg-2 underline underline-offset-2">
                  Check
                </Link>
                <button
                  type="button"
                  onClick={() => setDocs((all) => all.filter((x) => x.id !== d.id))}
                  className="grid size-11 place-items-center rounded-chip text-fg-2 hover:bg-wash-2 hover:text-fg"
                  aria-label={`Remove ${d.name}`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            </Tip>
          ))}
        </div>
      ) : null}

      <Textarea
        id="question"
        name="question"
        disabled={!hydrated}
        ref={ref}
        rows={1}
        value={value}
        maxLength={tool === "web" ? 800 : 8000}
        aria-label={tool === "draft" ? "What should the draft say?" : "Your question"}
        role="combobox"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? MENU_ID : undefined}
        aria-autocomplete="list"
        aria-activedescendant={menuOpen && items.length ? `${MENU_ID}-${Math.min(active, items.length - 1)}` : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          if (tool === "web") setWebConsent(false);
          track(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => track(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (menuOpen) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (items.length ? (i + 1) % items.length : 0));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
              return;
            }
            if (e.key === "Enter" && items.length) {
              e.preventDefault();
              pick(items[Math.min(active, items.length - 1)]);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setMention(null);
              return;
            }
          }
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
        }}
        placeholder={tool === "draft" ? "Say what to draft from the answers above" : tool === "web" ? "Ask about current public reporting…" : PLACEHOLDER}
        className="pb-input min-h-12 resize-none border-0 bg-transparent px-3 py-3 text-[15px] leading-6 text-fg shadow-none placeholder:text-fg-3 focus-visible:ring-0"
      />

      {waitingForFiles ? <p role="status" className="px-3 pb-2 text-caption text-fg-2">A document is not ready to read. Wait for processing, or remove it to send without it.</p> : null}
      {overAttachmentLimit ? <p role="alert" className="px-3 pb-2 text-caption text-fg-2">Attach at most 20 files. Remove a file before sending.</p> : null}
      {tool === "research" && (docs.length > 0 || files.length > 0) ? <p className="px-3 pb-2 text-caption text-fg-3">Choose one readable file to ask for a document review. Legal research does not read attachments yet.</p> : null}
      {tool === "web" ? <div className="space-y-2 px-3 pb-3 text-ui">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Public web research type">
          <button type="button" aria-pressed={webMode === "GENERAL_WEB"} onClick={() => { setWebMode("GENERAL_WEB"); setWebConsent(false); }} className="min-h-11 rounded-chip border border-line-control px-3 aria-pressed:bg-fg aria-pressed:text-ground">Web search</button>
          <button type="button" aria-pressed={webMode === "CASE_DISCOVERY"} onClick={() => { setWebMode("CASE_DISCOVERY"); setWebConsent(false); }} className="min-h-11 rounded-chip border border-line-control px-3 aria-pressed:bg-fg aria-pressed:text-ground">Cases and reporting</button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 rounded-card border border-line p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg">
          <input type="checkbox" checked={webConsent} onChange={(e) => setWebConsent(e.target.checked)} className="mt-1 size-4 accent-fg" />
          <span>Send only this question to Exa for public web research. Do not include client-confidential details. Files, matter details, and conversation history are not sent.</span>
        </label>
        {files.length || docs.length ? <p role="alert" className="text-caption text-fg-2">Remove attached files before searching the public web.</p> : null}
        {value.trim().length > 800 ? <p role="alert" className="text-caption text-fg-2">Shorten this question to 800 characters for web research.</p> : null}
      </div> : null}
      <div className="flex flex-wrap items-center gap-0.5 px-1">
        {tool !== "web" ? <>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => attach(e.target.files)}
        />
        <Popover open={filesOpen} onOpenChange={setFilesOpen}>
          <PopoverTrigger asChild><button ref={filesButtonRef} type="button" className={chip} disabled={pending}>
            <Paperclip className="size-4" aria-hidden />Files
          </button></PopoverTrigger>
          <PopoverContent side="top" align="start" className="composer-files-menu"
            onCloseAutoFocus={(event) => { if (openingVault.current) { event.preventDefault(); openingVault.current = false; } }}>
            <button type="button" disabled={!onAttach} onClick={() => { setFilesOpen(false); fileRef.current?.click(); }}><Upload className="size-4" aria-hidden /><span>Upload files<small>PDF or Word document</small></span></button>
            <button type="button" onClick={() => openVault("files")}><FolderOpen className="size-4" aria-hidden /><span>Add from Wall System<small>Choose your stored documents</small></span><ChevronRight className="size-4" aria-hidden /></button>
            <Link href="/app/vault"><FolderOpen className="size-4" aria-hidden />Open Wall System</Link>
          </PopoverContent>
        </Popover>
        <SourcesChip bodies={sources.bodies} integrations={sources.integrations} failed={sources.failed} failureMessage={sources.failureMessage} refreshing={sources.refreshing} chosen={chosen} onToggle={onToggleSource} onRetry={onRetrySources}
          triggerRef={sourcesButtonRef} onBrowseFiles={() => openVault("sources")} fileCount={docs.length + files.length} />
        <VaultPicker open={vaultOpen} onOpenChange={setVaultOpen} matterId={matterId}
          matterName={matters.find((m) => m.matter_id === matterId)?.name} selected={docs} capacity={Math.max(0, 20 - files.length)}
          onAdd={useVaultFiles} returnFocus={() => (vaultOrigin.current === "sources" ? sourcesButtonRef : filesButtonRef).current?.focus()} />
        {!matterLocked && files.length === 0 && docs.length === 0 ? <MatterChip matters={matters} matterId={matterId} onChange={onMatter} /> : null}
        <AsOfChip />
        </> : null}
        <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={chip}>
              <SlidersHorizontal className="size-4" aria-hidden />
              {tool === "draft" ? "Draft" : tool === "web" ? "Web research" : "Research"}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" sideOffset={8} className="w-72 p-1.5">
            <ul className="flex flex-col">
              <ToolRow icon={Scale} name="Research held law" note={tool === "research" ? "selected" : undefined}
                onPick={() => { setTool("research"); setToolsOpen(false); }} />
              <ToolRow icon={Globe2} name="Research the public web" note={tool === "web" ? "selected" : "Only your question is sent"}
                onPick={() => { setTool("web"); setWebConsent(false); setToolsOpen(false); ref.current?.focus(); }} />
              <ToolRow icon={PenLine} name="Draft from this thread" note={canDraft ? undefined : "ask something first"} disabled={!canDraft}
                onPick={() => { setTool("draft"); setToolsOpen(false); ref.current?.focus(); }} />
              <ToolRow icon={FileCheck2} name="Check a document" href="/app/document-check" note="opens its screen" />
              <ToolRow icon={FileSearch} name="Review a contract" href="/app/contracts" note="opens its screen" />
            </ul>
          </PopoverContent>
        </Popover>

        {tool !== "web" ? <button type="button" className={chip} onClick={() => { setTool("web"); setWebConsent(false); ref.current?.focus(); }}><Globe2 className="size-4" aria-hidden />Web search</button> : null}

        <div className="ml-auto flex items-center gap-1">
          <Tip label={pending ? "Waiting for the answer" : "Send"}>
            <button
              type="submit"
              disabled={!canSend}
              aria-label={pending ? "Waiting for the answer" : "Send"}
              className="pb-send grid size-11 place-items-center rounded-full bg-fg text-ground transition-opacity duration-150 hover:opacity-85 disabled:bg-line-2 disabled:text-fg-3"
            >
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </Tip>
        </div>
      </div>
      {value.length > 0 ? <div className="flex justify-between px-3 pt-1 pb-1 text-caption text-fg-3"><span>{value.trim().length < (tool === "web" ? 3 : 8) ? `Write at least ${tool === "web" ? 3 : 8} characters.` : "Enter to send · Shift + Enter for a new line"}</span><span>{value.length.toLocaleString()} / {tool === "web" ? "800" : "8,000"}</span></div> : null}
    </form>
  );
}

function Chip({
  icon: Icon,
  label,
  onRemove,
  removeLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-line-2 bg-wash pr-1 pl-2.5 text-ui text-fg">
      <Icon className="size-3.5" aria-hidden />
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="grid size-11 place-items-center rounded-chip text-fg-2 hover:bg-wash-2 hover:text-fg"
        aria-label={removeLabel}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

function FileChip({ file, onRemove }: { file: Attached; onRemove: () => void }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex min-h-11 max-w-full flex-wrap items-center gap-1.5 rounded-chip border bg-wash pr-1 pl-2.5 text-ui text-fg",
        file.state === "error" ? "border-dashed border-fg" : "border-line-2",
      )}
    >
      <Paperclip className="size-3.5 flex-none" aria-hidden />
      <span className="truncate font-medium">{file.name}</span>
      <span className="min-w-0 break-words text-fg-2">
        {file.state === "storing" ? (
          "· storing in Wall System…"
        ) : file.state === "stored" ? (
          <>
            · {file.readiness === "INGESTED" ? "ready to read" : file.readiness === "PARTIAL" ? "partly read — open to inspect" : file.readiness === "CANNOT_READ" ? "cannot be read" : "processing"} ·{" "}
            <Link href={file.href} className="inline-flex min-h-11 items-center underline underline-offset-2">
              Open in Document Check
            </Link>
          </>
        ) : (
          `· ${file.message}`
        )}
      </span>
      {file.state === "storing" ? null : (
        <button
          type="button"
          onClick={onRemove}
          className="grid size-11 flex-none place-items-center rounded-chip text-fg-2 hover:bg-wash-2 hover:text-fg"
          aria-label={`Dismiss ${file.name}`}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
      {file.state === "stored" && file.note ? <span className="basis-full pb-2 pr-2 text-caption text-fg-2">
        {file.note}{file.note.startsWith("Sign in") ? <> <a href="/login" className="inline-flex min-h-11 items-center underline underline-offset-2">Sign in</a></> : null}
      </span> : null}
    </span>
  );
}

function ToolRow({
  icon: Icon,
  name,
  note,
  href,
  disabled,
  onPick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  note?: string;
  href?: string;
  disabled?: boolean;
  onPick?: () => void;
}) {
  const cls =
    "flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-body text-fg transition-colors duration-150 hover:bg-wash-2 disabled:cursor-not-allowed disabled:text-fg-3 disabled:hover:bg-transparent";
  const inner = (
    <>
      <Icon className="size-4 flex-none" aria-hidden />
      <span>{name}</span>
      {note ? <span className="ml-auto text-caption text-fg-3">{note}</span> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      ) : (
        <button type="button" className={cls} disabled={disabled} onClick={onPick}>
          {inner}
        </button>
      )}
    </li>
  );
}
