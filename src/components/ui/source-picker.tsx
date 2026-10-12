"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, FileText, FolderOpen, Library, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SourceBody } from "@/lib/gateway/types";
import { statusLine } from "@/lib/sources";

const INDIA_SOURCE_IDS = new Set(["held", "aws_sc_judgments", "aws_hc_judgments", "sebi", "bse", "data_gov_in", "egazette", "indiankanoon", "nse", "rbi"]);
const SOURCE_MARKS: Record<string, string> = {
  bse: "BSE", data_gov_in: "DATA", egazette: "GZ", indiankanoon: "IK", nse: "NSE", rbi: "RBI",
};
const SOURCE_LOGOS: Record<string, { name: string; width: number; height: number }> = {
  held: { name: "india-code.png", width: 72, height: 26 },
  aws_hc_judgments: { name: "ecourts.png", width: 36, height: 36 },
  aws_sc_judgments: { name: "supreme-court.png", width: 36, height: 36 },
  sebi: { name: "sebi.png", width: 48, height: 24 },
  bse: { name: "bse.png", width: 48, height: 30 },
};
const SOURCE_COPY: Record<string, { label: string; note: string }> = {
  held: { label: "Companies Act 2013", note: "India Code · held corpus · exact passages" },
  aws_hc_judgments: { label: "High Court judgments", note: "eCourts collection · Dattam Labs / AWS" },
  aws_sc_judgments: { label: "Supreme Court judgments", note: "eCourts collection · Dattam Labs / AWS" },
  sebi: { label: "SEBI", note: "Securities and Exchange Board of India" },
  vault: { label: "Wall System", note: "Your stored documents · supporting material" },
};

/** The flag identifies jurisdiction; it does not imply a government affiliation. */
function IndiaFlag({ decorative = false }: { decorative?: boolean }) {
  return <svg viewBox="0 0 30 20" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "India"} aria-hidden={decorative || undefined} className="source-india-flag">
    <rect width="30" height="20" fill="#fff" />
    <path d="M0 0h30v6.67H0Z" fill="#FF9933" />
    <path d="M0 13.33h30V20H0Z" fill="#138808" />
    <circle cx="15" cy="10" r="3.1" fill="none" stroke="#000080" strokeWidth="0.8" />
    {Array.from({ length: 24 }, (_, i) => <line key={i} x1="15" y1="10" x2="15" y2="7.15" transform={`rotate(${i * 15} 15 10)`} stroke="#000080" strokeWidth="0.3" />)}
  </svg>;
}

function SourceMark({ body }: { body: SourceBody }) {
  if (body.id === "vault") return <span className="source-identity source-identity-file"><FolderOpen className="size-5" aria-hidden /></span>;
  const logo = SOURCE_LOGOS[body.id];
  if (logo) return <SourceLogo {...logo} />;
  const letters = SOURCE_MARKS[body.id];
  if (letters) return <span className="source-identity" aria-hidden="true">{letters}</span>;
  return <span className="source-identity source-identity-file"><Library className="size-5" aria-hidden /></span>;
}

function SourceLogo({ name, width, height }: { name: string; width: number; height: number }) {
  const [failed, setFailed] = React.useState(false);
  return <span className="source-identity source-identity-brand" style={{ width: Math.max(36, width), height: 40 }} aria-hidden="true">
    {failed ? <Library className="size-5" /> : <Image src={`/source-logos/${name}`} alt="" width={width} height={height} unoptimized
      className="source-provider-logo" onError={() => setFailed(true)} />}
  </span>;
}

export function SourcesChip({ bodies, failed, chosen, onToggle, onRetry, onBrowseFiles, fileCount = 0, triggerRef }: {
  bodies: readonly SourceBody[];
  failed: boolean;
  chosen: readonly string[];
  onToggle: (id: string) => void;
  onRetry?: () => void;
  onBrowseFiles?: () => void;
  fileCount?: number;
  triggerRef?: React.Ref<HTMLButtonElement>;
}) {
  const browsing = React.useRef(false);
  const [open, setOpen] = React.useState(false);
  const [motion, setMotion] = React.useState<"pointer" | "keyboard">("keyboard");
  const titleId = React.useId();
  const constraintId = React.useId();
  const india = bodies.filter((body) => body.selectable && INDIA_SOURCE_IDS.has(body.id));
  const documents = bodies.filter((body) => body.selectable && body.id === "vault");
  const otherAvailable = bodies.filter((body) => body.selectable && !INDIA_SOURCE_IDS.has(body.id) && body.id !== "vault");
  const unavailable = bodies.filter((body) => !body.selectable);
  const n = chosen.length;
  const indiaSelected = chosen.some((id) => INDIA_SOURCE_IDS.has(id));
  const inputEvents = { onPointerDownCapture: () => setMotion("pointer"), onKeyDownCapture: () => setMotion("keyboard") };

  if (failed) return <span role="status" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-fg px-3 text-ui text-fg">
    <Library className="size-4" aria-hidden /> Sources did not load
    {onRetry ? <button type="button" onClick={onRetry} className="min-h-11 rounded-chip px-2 underline underline-offset-2">Retry sources</button> : null}
  </span>;

  const renderRow = (body: SourceBody) => <SourceRow key={body.id} body={body} selected={chosen.includes(body.id)} last={n === 1 && chosen.includes(body.id)} constraintId={constraintId} onToggle={() => onToggle(body.id)} />;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button ref={triggerRef} type="button" {...inputEvents} data-motion={motion} className="source-picker-trigger" aria-label={`${n} source${n === 1 ? "" : "s"} — choose what is searched`}>
      {indiaSelected ? <IndiaFlag /> : documents.some((body) => chosen.includes(body.id)) ? <FileText className="size-4" aria-hidden /> : <Library className="size-4" aria-hidden />}
      <span key={n} className="source-picker-count" aria-live="polite">{n} source{n === 1 ? "" : "s"}</span>
    </button></PopoverTrigger>
    <PopoverContent side="top" align="start" sideOffset={8} collisionPadding={12} onCloseAutoFocus={(event) => { if (browsing.current) { event.preventDefault(); browsing.current = false; } }} className="source-picker" data-motion={motion} {...inputEvents} aria-labelledby={titleId}>
      <div className="source-picker-heading"><div><h2 id={titleId} className="text-title font-medium">Search sources</h2><p className="text-ui text-fg-3">Chosen for your next question.</p></div>
        <button type="button" className="source-picker-close" onClick={() => setOpen(false)} aria-label="Close source picker"><X className="size-4" aria-hidden /></button></div>
      <div className="source-picker-catalog">
        {india.length > 0 && <section className="source-picker-group" aria-label="India sources"><h3 className="source-picker-country"><IndiaFlag decorative /><span>India</span><span>{india.length} sources</span></h3><ul className="source-picker-list">{india.map(renderRow)}</ul></section>}
        {documents.length > 0 && <section className="source-picker-group" aria-label="Your documents"><h3 className="source-picker-section-label">Your workspace</h3><ul className="source-picker-list">{documents.map(renderRow)}</ul>{onBrowseFiles && <button type="button" className="source-vault-browse" onClick={() => { browsing.current = true; setOpen(false); onBrowseFiles(); }}><FolderOpen className="size-4" aria-hidden /><span>Choose stored files</span><span>{fileCount ? `${fileCount} attached` : "Browse"}</span></button>}</section>}
        {otherAvailable.length > 0 && <section className="source-picker-group" aria-label="Additional sources"><h3 className="source-picker-section-label">Additional sources</h3><ul className="source-picker-list">{otherAvailable.map(renderRow)}</ul></section>}
        {unavailable.length > 0 && <details className="source-picker-unavailable"><summary><span>Other sources <span className="text-fg-3">· {unavailable.length} unavailable</span></span><ChevronDown className="size-4" aria-hidden /></summary>
          <ul>{unavailable.map((body) => <li key={body.id} className="source-picker-unavailable-row"><SourceMark body={body} /><span><strong>{body.name}</strong><small>{statusLine(body)}</small></span></li>)}</ul></details>}
      </div>
      <div className="source-picker-footer"><p id={constraintId}>Keep at least one source selected. Saved for this thread.</p><p>Selection does not mean a source was searched or cited.</p></div>
    </PopoverContent>
  </Popover>;
}

function SourceRow({ body, selected, last, constraintId, onToggle }: { body: SourceBody; selected: boolean; last: boolean; constraintId: string; onToggle: () => void; }) {
  const descriptionId = React.useId();
  const copy = SOURCE_COPY[body.id];
  return <li><button type="button" role="switch" aria-label={copy ? `${copy.label} — ${body.name}` : body.name} aria-checked={selected} aria-disabled={last || undefined}
    aria-describedby={`${descriptionId}${last ? ` ${constraintId}` : ""}`} className="source-picker-row" data-selected={selected}
    onClick={() => { if (!last) onToggle(); }}>
    <SourceMark body={body} />
    <span className="source-picker-row-copy"><span className="source-picker-row-name">{copy?.label ?? body.name}</span><span id={descriptionId} className="source-picker-row-description">{copy?.note ?? statusLine(body)}</span></span>
    <span className="source-picker-switch" aria-hidden="true"><span /></span>
  </button></li>;
}
