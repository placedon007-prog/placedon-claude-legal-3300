"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED = /\.(?:pdf|docx|txt|md)$/i;

/** Browser convenience only. The upload/review Server Action revalidates the bytes. */
export function fileSelectionProblem(file: File): string | null {
  if (!ALLOWED.test(file.name)) return "Choose a PDF, DOCX, TXT or MD file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return "Choose a file no larger than 10 MB.";
  return null;
}

export function FileDropInput({ id, name = "file", onSelected, onInvalid, disabled = false }: {
  id: string;
  name?: string;
  onSelected?: (file: File) => void;
  onInvalid?: () => void;
  disabled?: boolean;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  function choose(file: File | undefined, dropped: boolean) {
    if (!file) return;
    const issue = fileSelectionProblem(file);
    setProblem(issue);
    setSelected(issue ? null : file.name);
    if (issue) {
      onInvalid?.();
      if (input.current) input.current.value = "";
      return;
    }
    if (dropped && input.current) {
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.current.files = transfer.files;
      } catch {
        onInvalid?.();
        setSelected(null);
        setProblem("This browser could not attach the dropped file. Choose it instead.");
        input.current.value = "";
        return;
      }
    }
    onSelected?.(file);
  }

  return (
    <div>
      <input ref={input} id={id} name={name} type="file" accept=".pdf,.docx,.txt,.md"
        className="sr-only" disabled={disabled} aria-describedby={`${id}-help${problem ? ` ${id}-error` : ""}`}
        onChange={(event) => choose(event.currentTarget.files?.[0], false)} />
      <label htmlFor={id} className={cn("file-drop-input", dragging && "file-drop-input-active", disabled && "file-drop-input-disabled")}
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); }}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          if (event.dataTransfer.files.length !== 1) {
            onInvalid?.();
            setProblem("Choose one file at a time.");
            setSelected(null);
            if (input.current) input.current.value = "";
            return;
          }
          choose(event.dataTransfer.files[0], true);
        }}>
        <FileUp className="size-6" aria-hidden />
        <span className="font-medium">{selected ?? "Drop a document here, or choose a file"}</span>
        <span className="text-ui text-fg-2" id={`${id}-help`}>PDF, DOCX, TXT or MD · up to 10 MB · text-layer PDFs only</span>
      </label>
      {problem ? <p id={`${id}-error`} role="alert" className="form-error">{problem}</p> : null}
    </div>
  );
}
