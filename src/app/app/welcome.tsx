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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarDays, Moon, Sunrise } from "lucide-react";
import { cleanName, greeting, PERSONA_NAME, recognise } from "@/lib/greeting";
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

const PERSONA_ICON = { "night-wolf": Moon, "early-riser": Sunrise, "weekend-warrior": CalendarDays } as const;

export function Welcome() {
  const minute = useMinute();
  const [name] = useDisplayName();
  const [nicknames] = useNicknamesOn();
  const activity = useActivity();

  const now = minute === null ? null : new Date(minute * 60_000);
  const recognition = now && nicknames ? recognise(activity, now) : null;
  const line = now
    ? greeting({ name, recognition, now })
    : { hello: "", question: "What do you need to check?" };
  const Icon = recognition ? PERSONA_ICON[recognition.persona] : null;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="max-w-[760px] text-display font-medium tracking-[-0.02em] text-fg">
        {line.hello ? (
          <>
            <span className="block">{line.hello}</span>
            <span className="block text-fg-2">{line.question}</span>
          </>
        ) : (
          line.question
        )}
      </h2>
      {recognition && Icon ? (
        // What the screen noticed, said out loud — a nickname is never a secret score.
        <p className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-wash px-3 py-1.5 text-ui text-fg-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
          <Icon className="size-3.5 text-fg" aria-hidden />
          <span>
            <span className="font-medium text-fg">{PERSONA_NAME[recognition.persona]}</span>
            {" · "}
            {capitalise(recognition.reason)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
