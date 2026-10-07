"use client";

/**
 * The Ask welcome line and the "what should we call you?" dialog.
 *
 * Personal on purpose, private by construction: the name, the switch and the hours of past
 * questions live in this browser's storage and are never sent anywhere. The server (and
 * the first paint) renders the neutral line; the personal one replaces it once the browser
 * is reading its own storage, so there is no hydration mismatch.
 */
import * as React from "react";
import { PlacedonMark } from "@/components/brand/placedon-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cleanName, greeting, persona } from "@/lib/greeting";
import { useActivity, useDisplayName, useNicknamesOn } from "./local-store";

/** The current minute on the client; null on the server and during hydration. */
function useMinute(): number | null {
  return React.useSyncExternalStore(
    (cb) => {
      const id = window.setInterval(cb, 30_000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

export function Welcome() {
  const minute = useMinute();
  const [name] = useDisplayName();
  const [nicknames] = useNicknamesOn();
  const activity = useActivity();

  const line =
    minute === null
      ? { hello: "", question: "What do you need to check?" }
      : greeting({
          name,
          persona: nicknames ? persona(activity) : null,
          now: new Date(minute * 60_000),
        });

  return (
    <p className="flex max-w-[720px] items-center justify-center gap-3 text-center text-display font-medium tracking-[-0.02em] text-fg">
      <PlacedonMark className="size-8 flex-none text-fg" />
      <span>
        {line.hello ? <>{line.hello} </> : null}
        {line.question}
      </span>
    </p>
  );
}

/** A quiet invitation to set a name, shown only while none is set. */
export function NameHint() {
  const minute = useMinute();
  const [name] = useDisplayName();
  const [naming, setNaming] = React.useState(false);
  if (minute === null || name) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setNaming(true)}
        className="-mt-4 min-h-11 rounded-lg px-3 text-ui text-fg-3 underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline"
      >
        What should we call you?
      </button>
      <NameDialog open={naming} onOpenChange={setNaming} />
    </>
  );
}

export function NameDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useDisplayName();
  const [draft, setDraft] = React.useState("");
  const [problem, setProblem] = React.useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanName(draft);
    if (!clean) {
      setProblem("Use letters and spaces, up to 40 characters.");
      return;
    }
    setName(clean);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setDraft(name ?? "");
          setProblem(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-title font-semibold">What should we call you?</DialogTitle>
            <DialogDescription className="text-ui text-fg-2">
              Used only for the welcome line, and kept in this browser — it is not sent anywhere.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <input
              aria-label="Your name"
              autoFocus
              value={draft}
              maxLength={40}
              onChange={(e) => {
                setDraft(e.target.value);
                setProblem(null);
              }}
              placeholder="Your first name"
              className="bare min-h-11 rounded-lg border border-line-control px-3 text-body text-fg outline-none focus-visible:border-fg"
            />
            {problem ? <p role="alert" className="text-ui text-fg">{problem}</p> : null}
          </div>
          <DialogFooter className="gap-2">
            {name ? (
              <button
                type="button"
                onClick={() => {
                  setName(null);
                  onOpenChange(false);
                }}
                className="min-h-11 rounded-lg px-4 text-body text-fg-2 hover:bg-wash-2 hover:text-fg"
              >
                Remove my name
              </button>
            ) : null}
            <button type="submit" className="min-h-11 rounded-lg bg-fg px-4 text-body font-medium text-ground hover:opacity-85">
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
