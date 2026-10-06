"use client";

/**
 * The conversation composer for /app.
 *
 * Adapted from a 21st.dev "ChatGPT prompt input" component the owner supplied, changed for
 * this product:
 *  - black and white only (owner decision, 2026-10-06);
 *  - the tool menu lists Placedon's own screens instead of image/web/code tools, and a
 *    tool that is not "Ask" NAVIGATES to its screen rather than pretending the Ask verb
 *    can do it;
 *  - "+" leads to Document Check, because the ask verb takes no file;
 *  - the microphone is shown but disabled: server-side transcription in India is not
 *    connected yet, and browser speech APIs would send audio abroad.
 *
 * Radix Tooltip and Popover are used for keyboard and screen-reader behaviour (focus
 * management, Escape to close, aria wiring) that a hand-rolled popover would get wrong.
 */
import * as React from "react";
import Link from "next/link";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  ArrowUp,
  FileCheck2,
  FileSearch,
  Mic,
  PenLine,
  Plus,
  Scale,
  SlidersHorizontal,
} from "lucide-react";

function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={6}
          className="z-50 rounded-md bg-black px-2 py-1 text-xs text-white"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

const TOOLS = [
  { id: "ask", name: "Research held law", icon: Scale, href: null },
  { id: "check", name: "Check a document", icon: FileCheck2, href: "/app/document-check" },
  { id: "contract", name: "Review a contract", icon: FileSearch, href: "/app/contracts" },
  { id: "draft", name: "Draft", icon: PenLine, href: "/app/drafts" },
] as const;

export interface PromptBoxProps {
  /** Called with the trimmed question. */
  onSubmit: (question: string) => void;
  pending?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptBox({ onSubmit, pending = false, placeholder, className }: PromptBoxProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const [toolsOpen, setToolsOpen] = React.useState(false);

  // Grow with the text up to 200px, then scroll.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !pending;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <form
        onSubmit={submit}
        className={cn(
          "flex flex-col rounded-[24px] border border-neutral-300 bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-neutral-500",
          className,
        )}
      >
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <textarea
          id="question"
          name="question"
          ref={ref}
          rows={1}
          value={value}
          maxLength={500}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          placeholder={placeholder ?? "Ask about Indian corporate law"}
          className="pb-input min-h-12 w-full resize-none border-0 bg-transparent px-3 py-3 text-[15px] leading-6 text-neutral-950 placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="flex items-center gap-1 px-1 pb-0.5">
          <Tip label="Check a document">
            <Link
              href="/app/document-check"
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-800 hover:bg-neutral-100"
            >
              <Plus className="h-5 w-5" aria-hidden />
              <span className="sr-only">Check a document</span>
            </Link>
          </Tip>

          <PopoverPrimitive.Root open={toolsOpen} onOpenChange={setToolsOpen}>
            <PopoverPrimitive.Trigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-neutral-800 hover:bg-neutral-100"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Research held law
              </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="top"
                align="start"
                sideOffset={6}
                className="z-50 w-60 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-md"
              >
                <ul className="flex flex-col">
                  {TOOLS.map((t) => {
                    const Icon = t.icon;
                    const inner = (
                      <>
                        <Icon className="h-4 w-4" aria-hidden />
                        <span>{t.name}</span>
                      </>
                    );
                    const cls =
                      "flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-100";
                    return (
                      <li key={t.id}>
                        {t.href ? (
                          <Link href={t.href} className={cls} onClick={() => setToolsOpen(false)}>
                            {inner}
                          </Link>
                        ) : (
                          <button type="button" className={cls} onClick={() => setToolsOpen(false)}>
                            {inner}
                            <span className="ml-auto text-xs text-neutral-500">current</span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>

          <div className="ml-auto flex items-center gap-1">
            <Tip label="Voice input is not connected yet">
              <span tabIndex={0} className="inline-flex">
                <button
                  type="button"
                  disabled
                  className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400"
                >
                  <Mic className="h-5 w-5" aria-hidden />
                  <span className="sr-only">Voice input, not connected yet</span>
                </button>
              </span>
            </Tip>
            <Tip label={pending ? "Waiting for the answer" : "Send"}>
              <button
                type="submit"
                disabled={!canSend}
                className="pb-send flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
                <span className="sr-only">{pending ? "Waiting for the answer" : "Send"}</span>
              </button>
            </Tip>
          </div>
        </div>
      </form>
    </TooltipPrimitive.Provider>
  );
}
