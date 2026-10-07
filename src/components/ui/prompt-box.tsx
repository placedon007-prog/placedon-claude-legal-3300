"use client";

/**
 * The /app composer. Started from the owner's 21st.dev "ChatGPT prompt input", rebuilt on
 * shadcn primitives and changed for this product:
 *  - "+" attaches a PDF or DOCX: it is stored in Wall System, then opened in Document
 *    Check. The ask verb takes no file, so the file never rides along with a question.
 *  - Tools: Research (the default), Draft (a removable chip — the next turn drafts from
 *    this thread), and two that need a file and so open their own screens.
 *  - The microphone is shown and disabled. Voice will go through server-side transcription
 *    in Mumbai; a browser speech API would send the audio abroad.
 */
import * as React from "react";
import Link from "next/link";
import { ArrowUp, FileCheck2, FileSearch, Mic, Paperclip, PenLine, Plus, Scale, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ComposerTool = "research" | "draft";

/** What happened to an attached file. The words are shown on its chip. */
export type AttachOutcome =
  | { readonly ok: true; readonly href: string }
  | { readonly ok: false; readonly message: string };

export interface PromptBoxProps {
  onSubmit: (text: string, tool: ComposerTool) => void;
  /** Store the file in Wall System; resolve with where to open it next. */
  onAttach?: (file: File) => Promise<AttachOutcome>;
  pending?: boolean;
  /** Draft needs an answered turn to draft from. */
  canDraft?: boolean;
  /** Controlled, so an answer's "Draft from this" can select it. */
  tool: ComposerTool;
  onToolChange: (tool: ComposerTool) => void;
  placeholder?: string;
  className?: string;
}

const MAX_ROWS_PX = 200;
const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const round =
  "grid size-11 place-items-center rounded-full text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg";

type Attached = { name: string; state: "storing" } | { name: string; state: "stored"; href: string } | { name: string; state: "error"; message: string };

export function PromptBox({
  onSubmit,
  onAttach,
  pending = false,
  canDraft = false,
  tool,
  onToolChange: setTool,
  placeholder,
  className,
}: PromptBoxProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [attached, setAttached] = React.useState<Attached | null>(null);

  // Grow with the text up to 200px, then scroll.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !pending;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSubmit(value.trim(), tool);
    setValue("");
    setTool("research");
  }

  async function attach(file: File | undefined) {
    if (!file || !onAttach) return;
    setAttached({ name: file.name, state: "storing" });
    const outcome = await onAttach(file);
    setAttached(
      outcome.ok
        ? { name: file.name, state: "stored", href: outcome.href }
        : { name: file.name, state: "error", message: outcome.message },
    );
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex flex-col rounded-composer border border-line-2 bg-ground p-2 shadow-float transition-colors duration-150 focus-within:border-fg",
        className,
      )}
    >
      {attached || tool === "draft" ? (
        <div className="flex flex-wrap gap-1.5 px-2 pt-1">
          {tool === "draft" ? (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-line-2 bg-wash pr-1 pl-2.5 text-ui text-fg">
              <PenLine className="size-3.5" aria-hidden />
              Draft from this thread
              <button
                type="button"
                onClick={() => setTool("research")}
                className="grid size-7 place-items-center rounded-chip text-fg-2 hover:bg-wash-2 hover:text-fg"
                aria-label="Remove Draft"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ) : null}
          {attached ? <AttachChip attached={attached} onRemove={() => setAttached(null)} /> : null}
        </div>
      ) : null}

      <Textarea
        id="question"
        name="question"
        ref={ref}
        rows={1}
        value={value}
        maxLength={500}
        aria-label={tool === "draft" ? "What should the draft say?" : "Your question"}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
        }}
        placeholder={
          tool === "draft"
            ? "Say what to draft from the answers above"
            : (placeholder ?? "Ask about Indian corporate law")
        }
        className="pb-input min-h-12 resize-none border-0 bg-transparent px-3 py-3 text-[15px] leading-6 text-fg shadow-none placeholder:text-fg-3 focus-visible:ring-0"
      />

      <div className="flex items-center gap-0.5 px-1">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => attach(e.target.files?.[0])}
        />
        <Tip label="Attach a PDF or DOCX — stored in Wall System, then checked">
          <button
            type="button"
            className={round}
            aria-label="Attach a PDF or DOCX"
            disabled={!onAttach || attached?.state === "storing"}
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </Tip>

        <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full px-3 text-body text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Tools
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" sideOffset={8} className="w-72 p-1.5">
            <ul className="flex flex-col">
              <ToolRow
                icon={Scale}
                name="Research held law"
                note={tool === "research" ? "selected" : undefined}
                onPick={() => {
                  setTool("research");
                  setToolsOpen(false);
                }}
              />
              <ToolRow
                icon={PenLine}
                name="Draft from this thread"
                note={canDraft ? undefined : "ask something first"}
                disabled={!canDraft}
                onPick={() => {
                  setTool("draft");
                  setToolsOpen(false);
                  ref.current?.focus();
                }}
              />
              <ToolRow icon={FileCheck2} name="Check a document" href="/app/document-check" note="opens its screen" />
              <ToolRow icon={FileSearch} name="Review a contract" href="/app/contracts" note="opens its screen" />
            </ul>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-1">
          <Tip label="Voice input — coming soon">
            {/* aria-disabled, not disabled: a disabled button takes no focus or hover, so
                its tooltip — the reason — could never be read. Clicking does nothing. */}
            <button
              type="button"
              aria-disabled="true"
              aria-label="Voice input — coming soon"
              onClick={(e) => e.preventDefault()}
              className={cn(round, "cursor-not-allowed text-fg-3 hover:bg-transparent hover:text-fg-3")}
            >
              <Mic className="size-5" aria-hidden />
            </button>
          </Tip>
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
    </form>
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

function AttachChip({ attached, onRemove }: { attached: Attached; onRemove: () => void }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-chip border bg-wash pr-1 pl-2.5 text-ui text-fg",
        attached.state === "error" ? "border-dashed border-fg" : "border-line-2",
      )}
    >
      <Paperclip className="size-3.5 flex-none" aria-hidden />
      <span className="truncate font-medium">{attached.name}</span>
      <span className="truncate text-fg-2">
        {attached.state === "storing" ? (
          "· storing in Wall System…"
        ) : attached.state === "stored" ? (
          <>
            · stored ·{" "}
            <Link href={attached.href} className="underline underline-offset-2">
              Open in Document Check
            </Link>
          </>
        ) : (
          `· ${attached.message}`
        )}
      </span>
      {attached.state === "storing" ? null : (
        <button
          type="button"
          onClick={onRemove}
          className="grid size-7 flex-none place-items-center rounded-chip text-fg-2 hover:bg-wash-2 hover:text-fg"
          aria-label={`Dismiss ${attached.name}`}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}
