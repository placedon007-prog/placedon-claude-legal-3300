"use client";

/**
 * The Ask screen as a conversation thread.
 *
 * Each question is sent through the same `askAction` server action as before (the gateway
 * key never leaves the server). Only what this browser asked in this session is shown;
 * there is no list-conversations verb yet, and the screen does not pretend otherwise.
 *
 * Four registers, distinguishable without colour:
 *   answered / partial  — tick or half-filled circle, numbered sources under the answer
 *   not answered        — struck circle, the refusal code and its meaning
 *   did not arrive      — dashed border, "this is not a refusal", a retry button
 */
import * as React from "react";
import { askAction, type AskState } from "./actions";
import { PromptBox } from "@/components/ui/prompt-box";
import { groupSources, statusLabel, type StatusKind } from "@/lib/thread";

const REFUSAL: Record<string, string> = {
  NO_EVIDENCE:
    "No provision in the held law answers this, so no answer is given and no model was called.",
  NOTHING_TRACED:
    "A draft was written, but none of its sentences could be traced to a provision. Nothing from it is shown.",
  NO_MODEL: "No model was available for this question, so no answer was attempted.",
  NO_BUDGET: "The budget limit was reached before any call was made.",
};

interface Turn {
  readonly id: number;
  readonly question: string;
  readonly result: AskState | null; // null while pending
}

export function AskThread() {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [pending, startTransition] = React.useTransition();
  const nextId = React.useRef(1);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  function ask(question: string) {
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question, result: null }]);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("question", question);
      const result = await askAction({ phase: "idle" }, fd);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, result } : x)));
    });
  }

  const empty = turns.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16">
          <h2 className="text-center text-[28px] font-medium tracking-[-0.02em] text-neutral-950">
            What do you need to check?
          </h2>
          <PromptBox className="w-full max-w-[720px]" onSubmit={ask} pending={pending} />
          <div className="max-w-[560px] text-center text-[13px] leading-5 text-neutral-600">
            Answers cite the exact provision, or say plainly what cannot be answered. Not legal
            advice.
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 px-4 pt-8 pb-6">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
              {turns.map((t) => (
                <React.Fragment key={t.id}>
                  <div className="self-end max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-2.5 text-[15px] leading-6 text-neutral-950">
                    {t.question}
                  </div>
                  <Reply turn={t} onRetry={() => ask(t.question)} />
                </React.Fragment>
              ))}
              <div ref={endRef} />
            </div>
          </div>
          <div className="sticky bottom-0 bg-white/95 px-4 pt-2 pb-4 backdrop-blur-[2px]">
            <PromptBox className="mx-auto w-full max-w-[720px]" onSubmit={ask} pending={pending} />
            <div className="mx-auto mt-2 max-w-[720px] text-center text-xs text-neutral-600">
              Answers cite the exact provision, or say what cannot be answered. Not legal advice.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusLine({ kind, extra }: { kind: StatusKind; extra?: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-neutral-600">
      <StatusIcon kind={kind} />
      <span className="font-medium text-neutral-950">{statusLabel(kind)}</span>
      {extra ? <span>· {extra}</span> : null}
    </div>
  );
}

function StatusIcon({ kind }: { kind: StatusKind }) {
  const common = { width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": true } as const;
  switch (kind) {
    case "answered":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6} className="text-neutral-950">
          <path d="M2.5 7.5l3 3 6-7" />
        </svg>
      );
    case "partial":
      return (
        <svg {...common} className="text-neutral-950">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth={1.4} />
          <path d="M7 1.5a5.5 5.5 0 010 11z" fill="currentColor" />
        </svg>
      );
    case "refused":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.4} className="text-neutral-950">
          <circle cx="7" cy="7" r="5.5" />
          <path d="M3.2 10.8l7.6-7.6" />
        </svg>
      );
    case "failed":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.4} className="text-neutral-950">
          <path d="M1.5 5a8 8 0 0111 0M3.5 7.5a5 5 0 017 0" />
          <path d="M2 12L12 2" />
        </svg>
      );
    case "pending":
      return (
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-900 motion-reduce:animate-none" aria-hidden />
      );
  }
}

function Reply({ turn, onRetry }: { turn: Turn; onRetry: () => void }) {
  const r = turn.result;
  if (!r) {
    return (
      <article aria-busy="true" className="flex flex-col gap-3">
        <StatusLine kind="pending" />
      </article>
    );
  }
  if (r.phase === "invalid") {
    return <p className="text-sm text-neutral-700">{r.message}</p>;
  }
  if (r.phase === "failed") {
    const e = r.error;
    return (
      <article role="alert" className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-900 p-4">
        <StatusLine kind="failed" />
        <p className="text-[15px] leading-6 text-neutral-900">
          <strong className="font-medium">This is not a refusal.</strong> The answer never arrived,
          so nothing is known about the question either way.
        </p>
        <p className="font-mono text-xs text-neutral-600">
          {e.kind} · {e.message}
          {e.status ? ` (HTTP ${e.status})` : ""}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-lg border border-neutral-900 px-3.5 py-2 text-sm text-neutral-950 hover:bg-neutral-50"
        >
          Try again
        </button>
      </article>
    );
  }
  if (r.phase === "refused") {
    const code = r.data.code ?? "REFUSED";
    return (
      <article className="flex flex-col gap-3">
        <StatusLine kind="refused" extra={code} />
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[15px] leading-6 text-neutral-900">
          <p>{REFUSAL[code] ?? "No answer is given."}</p>
          {r.data.reason ? <p className="mt-2 text-neutral-700">{r.data.reason}</p> : null}
        </div>
      </article>
    );
  }
  if (r.phase !== "answered") return null;

  const { data, parsed } = r;
  const kind: StatusKind = data.status === "PARTIAL" ? "partial" : "answered";
  const { sources, refs } = groupSources(parsed.sentences);
  const runId = data.run_id;

  return (
    <article className="flex flex-col gap-4">
      <StatusLine
        kind={kind}
        extra={sources.length ? `${sources.length} source${sources.length > 1 ? "s" : ""}` : undefined}
      />

      {parsed.sentences.length > 0 ? (
        <p className="text-[15.5px] leading-7 text-neutral-950">
          {parsed.sentences.map((s, i) => (
            <React.Fragment key={s.n}>
              {s.text}
              <a
                href={`#t${turn.id}-s${refs[i]}`}
                aria-label={`Source ${refs[i]}`}
                className="mx-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-neutral-300 px-1 align-[2px] text-[11px] font-medium text-neutral-700 no-underline hover:border-neutral-900"
              >
                {refs[i]}
              </a>{" "}
            </React.Fragment>
          ))}
        </p>
      ) : (
        // Unparsed: show the served text verbatim. This screen never authors a legal sentence.
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-neutral-950">{parsed.raw}</pre>
      )}

      {sources.length > 0 ? (
        <section aria-label="Sources" className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[13px] font-medium text-neutral-900">
            Sources
          </div>
          <ol className="divide-y divide-neutral-200">
            {sources.map((s) => (
              <li key={s.n} id={`t${turn.id}-s${s.n}`} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border border-neutral-300 text-[11px] font-medium text-neutral-700">
                  {s.n}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  {s.section ? (
                    <div className="text-sm font-semibold text-neutral-950">Section {s.section}</div>
                  ) : null}
                  <div className="font-mono text-[11.5px] text-neutral-600">
                    {s.source}
                    {s.spans.length
                      ? ` · exact quote · chars ${s.spans.map(([a, b]) => `${a}–${b}`).join(", ")}`
                      : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {parsed.notice ? <p className="text-[13px] text-neutral-600">{parsed.notice}</p> : null}

      <div className="flex flex-wrap items-center gap-3 text-[13px] text-neutral-600">
        <span>{data.model ? `model ${data.model}` : "no model"}</span>
        {runId ? (
          <a href={`/app/runs/${runId}`} className="text-neutral-700 underline-offset-2 hover:underline">
            View run {runId.slice(0, 8)}
          </a>
        ) : null}
      </div>
    </article>
  );
}
