/**
 * DESIGN LAB — three low-fidelity directions for the Ask screen, for the owner to choose
 * from. Not linked from navigation. DELETE THIS FOLDER BEFORE MERGE (PR #6).
 *
 * Every legal sentence below is the MockGateway's recorded `ask` reply (ANSWER_S96), parsed
 * by the real `parseAnswer`. Nothing here authors a statutory sentence; the source panel
 * shows only the spans the backend served, because the `ask` verb serves no provision text.
 *
 * Each direction is drawn as a fixed full-screen layer so the current console chrome does
 * not leak into the comparison. Open /app/design-lab?d=a | b | c.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUp,
  CalendarDays,
  FileCheck2,
  FileSearch,
  History,
  Mic,
  MessageSquare,
  PenLine,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Archive,
  X,
} from "lucide-react";
import { parseAnswer } from "@/lib/gateway/types";
import { groupSources } from "@/lib/thread";

export const metadata: Metadata = { title: "Design lab", robots: { index: false } };

const SERVED = `[1 of 4 sentence(s) the model wrote did not trace to admitted evidence and are not part of this summary. They are preserved in full below.]

1. Not more than fifteen months shall elapse between the date of one annual general meeting of a company and that of the next.
   — Companies Act 2013, s.96 [226:348]
2. The first annual general meeting shall be held within a period of nine months from the date of closing of the first financial year of the company.
   — Companies Act 2013, s.96 [409:524]
3. The Registrar may extend the time within which any annual general meeting, other than the first annual general meeting, shall be held, by a period not exceeding three months.
   — Companies Act 2013, s.96 [845:1043]`;

const Q1 = "How long can a company go between two annual general meetings?";
const Q2 = "What is the penalty for late filing of form MGT-7 for a small company?";
const Q3 = "Can the Registrar extend the first AGM?";

const parsed = parseAnswer(SERVED);
const { sources, refs } = groupSources(parsed.sentences);

const NAV = [
  { label: "Ask", icon: MessageSquare },
  { label: "Wall System", icon: Archive },
  { label: "Document Check", icon: FileCheck2 },
  { label: "Contracts", icon: FileSearch },
  { label: "Review tables", icon: Table2 },
  { label: "Drafts", icon: PenLine },
  { label: "Calendar", icon: CalendarDays },
  { label: "Runs", icon: History },
] as const;

const NOTICE =
  "Playbook DRAFT — not approved by a lawyer · Model hosted in UAE North — test documents only";

export default async function DesignLab({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d = "a" } = await searchParams;
  return (
    // maxWidth: app.css caps `.console-main > *` at 62rem, unlayered, so a utility cannot undo it.
    <div style={{ maxWidth: "none" }} className="fixed inset-0 z-[100] overflow-auto bg-white text-neutral-950">
      {d === "b" ? <DirectionChat /> : d === "c" ? <DirectionSplit /> : <DirectionDocument />}
      <nav
        aria-label="Directions"
        className="fixed right-3 bottom-3 z-[110] flex gap-1 rounded-md border border-neutral-300 bg-white p-1 text-xs"
      >
        {(["a", "b", "c"] as const).map((k) => (
          <Link
            key={k}
            href={`/app/design-lab?d=${k}`}
            aria-current={d === k ? "page" : undefined}
            className="rounded px-2 py-1 aria-[current=page]:bg-neutral-900 aria-[current=page]:text-white"
          >
            {k.toUpperCase()}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/* ── shared low-fi pieces ──────────────────────────────────────────────────── */

function Sidebar({ compact = false }: { compact?: boolean }) {
  return (
    <aside className="hidden w-[264px] flex-none flex-col gap-1 border-r border-neutral-200 bg-neutral-50 p-3 lg:flex">
      <div className="flex h-11 items-center gap-2 px-2 text-[15px] font-semibold">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-950 text-xs text-white">
          P
        </span>
        Placedon
      </div>
      <button className="flex h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
        <Plus size={16} aria-hidden /> New question
      </button>
      <div className="mt-1 flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-neutral-500">
        <Search size={16} aria-hidden />
        <input
          aria-label="Search this browser’s threads"
          className="w-full bg-transparent outline-none placeholder:text-neutral-500"
          placeholder="Search this browser’s threads"
        />
      </div>
      {!compact ? (
        <>
          <p className="mt-3 px-3 text-xs text-neutral-500">Today</p>
          <a className="flex h-10 items-center rounded-lg bg-neutral-200/70 px-3 text-sm">
            Gap between two AGMs
          </a>
          <a className="flex h-10 items-center rounded-lg px-3 text-sm text-neutral-700">
            Late MGT-7 for a small company
          </a>
          <p className="mt-3 px-3 text-xs text-neutral-500">Previous 7 days</p>
          <a className="flex h-10 items-center rounded-lg px-3 text-sm text-neutral-700">
            Related-party approval threshold
          </a>
        </>
      ) : null}
      <div className="mt-auto flex flex-col gap-0.5 border-t border-neutral-200 pt-2">
        {NAV.map(({ label, icon: Icon }, i) => (
          <a
            key={label}
            className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm ${i === 0 ? "font-medium text-neutral-950" : "text-neutral-700"}`}
          >
            <Icon size={16} aria-hidden /> {label}
          </a>
        ))}
        <div className="mt-2 flex h-11 items-center gap-2 border-t border-neutral-200 px-3 pt-2 text-sm text-neutral-700">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-200 text-xs">
            IH
          </span>
          In-house legal
        </div>
      </div>
    </aside>
  );
}

function Composer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[24px] border border-neutral-300 bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${className}`}
    >
      <div className="px-3 pt-2 pb-3 text-[15px] text-neutral-500">Ask about the held law…</div>
      <div className="flex items-center gap-1">
        <IconBtn label="Attach a PDF or DOCX">
          <Plus size={18} />
        </IconBtn>
        <button className="flex h-11 items-center gap-2 rounded-full px-3 text-sm text-neutral-700">
          <SlidersHorizontal size={16} aria-hidden /> Tools
        </button>
        <span className="flex-1" />
        <IconBtn label="Voice input — coming soon" disabled>
          <Mic size={18} />
        </IconBtn>
        <button
          aria-label="Send"
          className="grid h-11 w-11 place-items-center rounded-full bg-neutral-950 text-white"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className="grid h-11 w-11 place-items-center rounded-full text-neutral-700 disabled:text-neutral-400"
    >
      {children}
    </button>
  );
}

function Marker({ n, active = false }: { n: number; active?: boolean }) {
  return (
    <button
      aria-label={`Source ${n}`}
      className={`mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border px-1 align-[2px] text-[11px] leading-none font-medium ${active ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-700"}`}
    >
      {n}
    </button>
  );
}

function Status({ label, extra, glyph }: { label: string; extra?: string; glyph: string }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-neutral-600">
      <span aria-hidden className="w-3.5 text-center text-neutral-950">
        {glyph}
      </span>
      <span className="font-medium text-neutral-950">{label}</span>
      {extra ? <span>· {extra}</span> : null}
    </p>
  );
}

function Evidence({ s }: { s: (typeof sources)[number] }) {
  return (
    <p className="font-mono text-[12px] leading-5 text-neutral-600">
      {s.source} · chars {s.spans.map(([a, b]) => `${a}–${b}`).join(", ")}
    </p>
  );
}

function Refused() {
  return (
    <>
      <Status glyph="⊘" label="Not answered" extra="NO_EVIDENCE" />
      <p className="mt-2 text-[15px] leading-7 text-neutral-800">
        No provision in the held law answers this, so no answer is given and no model was called.
      </p>
    </>
  );
}

function DidNotArrive() {
  return (
    <div className="rounded-[10px] border border-dashed border-neutral-900 p-4">
      <Status glyph="⌁" label="Did not arrive — this is not a refusal" />
      <p className="mt-2 font-mono text-[12px] text-neutral-600">network · fetch failed (HTTP 502)</p>
      <button className="mt-3 h-11 rounded-lg border border-neutral-900 px-4 text-sm">
        Try again
      </button>
    </div>
  );
}

/* ── A: Document ─────────────────────────────────────────────────────────── */
/* The thread reads like a research memo. Each question is a heading, the answer is numbered
   paragraphs, and every citation sits in a right-hand margin beside the sentence it supports,
   the way a footnoted opinion reads. No bubbles anywhere. */

function DirectionDocument() {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-6 text-sm">
          <span className="font-medium">Gap between two AGMs</span>
          <span className="text-neutral-500">Read as at 7 Oct 2026</span>
        </header>
        <div className="mx-auto w-full max-w-[960px] flex-1 px-4 py-10 md:px-10">
          <section className="grid gap-x-10 md:grid-cols-[minmax(0,640px)_240px]">
            <h2 className="text-[22px] leading-8 font-semibold tracking-[-0.01em] md:col-span-2">
              {Q1}
            </h2>
            <div className="mt-3 md:col-span-2">
              <Status glyph="◐" label="Partly answered" extra={`${sources.length} source`} />
            </div>
            {parsed.sentences.map((s, i) => (
              <div key={s.n} className="contents">
                <p className="mt-5 text-[16px] leading-7">
                  <span className="mr-2 text-neutral-500 tabular-nums">{s.n}.</span>
                  {s.text}
                </p>
                <aside className="mt-5 border-l border-neutral-300 pl-3 text-[13px] leading-5 max-md:mt-1 max-md:mb-2">
                  <span className="font-semibold">[{refs[i]}] Section {s.section}</span>
                  <p className="font-mono text-[12px] text-neutral-600">
                    chars {s.span?.[0]}–{s.span?.[1]}
                  </p>
                </aside>
              </div>
            ))}
            <p className="mt-6 text-[13px] text-neutral-600 md:col-span-2">{parsed.notice}</p>
            <p className="mt-2 text-[12px] text-neutral-500 md:col-span-2">{NOTICE}</p>
          </section>

          <hr className="my-10 border-neutral-200" />
          <section className="max-w-[640px]">
            <h2 className="text-[22px] leading-8 font-semibold tracking-[-0.01em]">{Q2}</h2>
            <div className="mt-3">
              <Refused />
            </div>
          </section>
          <hr className="my-10 border-neutral-200" />
          <section className="max-w-[640px]">
            <h2 className="text-[22px] leading-8 font-semibold tracking-[-0.01em]">{Q3}</h2>
            <div className="mt-3">
              <DidNotArrive />
            </div>
          </section>
        </div>
        <div className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-3">
          <Composer className="mx-auto max-w-[960px]" />
        </div>
      </main>
    </div>
  );
}

/* ── B: Chat ─────────────────────────────────────────────────────────────── */
/* Closest to Claude/ChatGPT: centred 680px column, the user's words in a grey bubble on the
   right, the answer as plain prose with inline markers, Sources underneath. The source panel
   is an overlay sheet, shown open here on marker 1. */

function DirectionChat() {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-8 px-4 pt-10 pb-6">
          <div className="max-w-[85%] self-end rounded-[18px] bg-neutral-100 px-4 py-2.5 text-[15px] leading-6">
            {Q1}
          </div>
          <article className="flex flex-col gap-4">
            <Status glyph="◐" label="Partly answered" extra={`${sources.length} source`} />
            <p className="text-[16px] leading-7">
              {parsed.sentences.map((s, i) => (
                <span key={s.n}>
                  {s.text}
                  <Marker n={refs[i]} active={i === 0} />{" "}
                </span>
              ))}
            </p>
            <div>
              <p className="mb-2 text-[13px] font-medium">Sources</p>
              {sources.map((s) => (
                <div key={s.n} className="flex gap-3 border-t border-neutral-200 py-3">
                  <Marker n={s.n} />
                  <div>
                    <p className="text-sm font-semibold">Section {s.section}</p>
                    <Evidence s={s} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-neutral-600">{parsed.notice}</p>
            <p className="text-[12px] text-neutral-500">{NOTICE}</p>
          </article>
          <div className="max-w-[85%] self-end rounded-[18px] bg-neutral-100 px-4 py-2.5 text-[15px] leading-6">
            {Q2}
          </div>
          <article>
            <Refused />
          </article>
          <div className="max-w-[85%] self-end rounded-[18px] bg-neutral-100 px-4 py-2.5 text-[15px] leading-6">
            {Q3}
          </div>
          <article>
            <DidNotArrive />
          </article>
        </div>
        <div className="sticky bottom-0 bg-white px-4 pb-4">
          <Composer className="mx-auto max-w-[680px]" />
        </div>

        {/* source sheet, open */}
        <div className="fixed inset-y-0 right-0 z-[105] hidden w-full max-w-[440px] lg:flex flex-col border-l border-neutral-200 bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.06)]">
          <SourceBody closable />
        </div>
      </main>
    </div>
  );
}

function SourceBody({ closable = false }: { closable?: boolean }) {
  const s = sources[0];
  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-5">
        <p className="text-sm font-semibold">Source 1 · Section {s.section}</p>
        {closable ? (
          <IconBtn label="Close source">
            <X size={18} />
          </IconBtn>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 overflow-auto p-5">
        <Evidence s={s} />
        {parsed.sentences.map((x, i) => (
          <figure
            key={x.n}
            className={`border-l-2 pl-3 ${i === 0 ? "border-neutral-950 bg-neutral-100 py-2 pr-2" : "border-neutral-300 text-neutral-700"}`}
          >
            <blockquote
              className={`text-[15px] leading-7 ${i === 0 ? "underline decoration-2 underline-offset-4" : ""}`}
            >
              {x.text}
            </blockquote>
            <figcaption className="mt-1 font-mono text-[12px] text-neutral-500">
              chars {x.span?.[0]}–{x.span?.[1]}
            </figcaption>
          </figure>
        ))}
        <p className="text-[13px] leading-5 text-neutral-600">
          Only the quoted spans are shown. The full provision text, its sha256 and the date it
          came into force arrive with <span className="font-mono">citation.get</span>, which this
          screen does not call yet.
        </p>
      </div>
    </>
  );
}

/* ── C: Split ────────────────────────────────────────────────────────────── */
/* A permanent two-pane workspace: the thread on the left, the source viewer always open on
   the right. Clicking any marker changes what the viewer shows; the law is never more than
   one glance away. Sidebar shrinks to an icon rail to make room. */

function DirectionSplit() {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-14 flex-none flex-col items-center gap-1 border-r border-neutral-200 bg-neutral-50 py-3 lg:flex">
        <span className="mb-2 grid h-7 w-7 place-items-center rounded-md bg-neutral-950 text-xs text-white">
          P
        </span>
        <IconBtn label="New question">
          <Plus size={18} />
        </IconBtn>
        {NAV.map(({ label, icon: Icon }) => (
          <IconBtn key={label} label={label}>
            <Icon size={18} />
          </IconBtn>
        ))}
      </aside>
      <main className="flex min-w-0 flex-1 flex-col border-r border-neutral-200">
        <header className="flex h-14 items-center border-b border-neutral-200 px-6 text-sm font-medium">
          Gap between two AGMs
        </header>
        <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col gap-8 px-4 pt-8 pb-6">
          <p className="text-[15px] leading-6 font-medium">{Q1}</p>
          <article className="flex flex-col gap-4">
            <Status glyph="◐" label="Partly answered" extra={`${sources.length} source`} />
            <p className="text-[16px] leading-7">
              {parsed.sentences.map((s, i) => (
                <span key={s.n}>
                  {s.text}
                  <Marker n={refs[i]} active={i === 0} />{" "}
                </span>
              ))}
            </p>
            <p className="text-[13px] text-neutral-600">{parsed.notice}</p>
            <p className="text-[12px] text-neutral-500">{NOTICE}</p>
          </article>
          <hr className="border-neutral-200" />
          <p className="text-[15px] leading-6 font-medium">{Q2}</p>
          <Refused />
          <hr className="border-neutral-200" />
          <p className="text-[15px] leading-6 font-medium">{Q3}</p>
          <DidNotArrive />
        </div>
        <div className="sticky bottom-0 bg-white px-4 pb-4">
          <Composer className="mx-auto max-w-[620px]" />
        </div>
      </main>
      <section
        aria-label="Source viewer"
        className="sticky top-0 hidden h-dvh w-[440px] flex-none flex-col bg-white xl:flex"
      >
        <SourceBody />
      </section>
    </div>
  );
}
