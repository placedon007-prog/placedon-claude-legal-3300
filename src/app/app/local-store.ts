"use client";

/**
 * What this BROWSER remembers: the threads it started and whether the sidebar is expanded.
 *
 * There is no all-threads verb (`conversation.list` needs a matter), so the sidebar lists
 * only these, and says so. Storage can be missing or throw (private windows, blocked site
 * data); every read falls back to the empty state rather than breaking the screen.
 */
import * as React from "react";
import type { LocalThread } from "@/lib/thread";
import { activityAt, cleanName, MAX_ACTIVITY, type Activity } from "@/lib/greeting";

const THREADS_KEY = "placedon.console.threads.v1";
const SIDEBAR_KEY = "placedon.console.sidebar.v1";
const CHANGED = "placedon:local-store";
const MAX_THREADS = 50;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage refused. The screen still works; it just will not remember.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/* useSyncExternalStore needs a stable snapshot, so the raw string is the snapshot and the
   parse happens in a memo. */
function useStored(key: string): string | null {
  return React.useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

export function useLocalThreads(): LocalThread[] {
  const raw = useStored(THREADS_KEY);
  return React.useMemo(() => {
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as LocalThread[]) : [];
    } catch {
      return [];
    }
  }, [raw]);
}

/** Record a turn: the thread moves to the top, keeping its first title. */
export function rememberThread(id: string, title: string): void {
  let list: LocalThread[] = [];
  try {
    const parsed: unknown = JSON.parse(read(THREADS_KEY) ?? "[]");
    if (Array.isArray(parsed)) list = parsed as LocalThread[];
  } catch {
    list = [];
  }
  const existing = list.find((t) => t?.id === id);
  const next: LocalThread = { id, title: existing?.title ?? title.slice(0, 80), at: new Date().toISOString() };
  write(THREADS_KEY, JSON.stringify([next, ...list.filter((t) => t?.id !== id)].slice(0, MAX_THREADS)));
}

/** Collapsed (icon rail) is the default; expanded is remembered per browser. */
export function useSidebarExpanded(): [boolean, (v: boolean) => void] {
  const raw = useStored(SIDEBAR_KEY);
  const set = React.useCallback((v: boolean) => write(SIDEBAR_KEY, v ? "expanded" : "collapsed"), []);
  return [raw === "expanded", set];
}

/* ── the welcome line: name, switch, and when questions are asked ─────────── */

const NAME_KEY = "placedon.console.name.v1";
const GREETING_KEY = "placedon.console.greeting.v1";
const ACTIVITY_KEY = "placedon.console.activity.v1";

/** What the user asked to be called. Kept in this browser only. */
export function useDisplayName(): [string | null, (name: string | null) => void] {
  const raw = useStored(NAME_KEY);
  const set = React.useCallback((name: string | null) => {
    if (name === null) {
      try {
        window.localStorage.removeItem(NAME_KEY);
      } catch {
        // nothing to remove
      }
      window.dispatchEvent(new Event(CHANGED));
    } else write(NAME_KEY, name);
  }, []);
  return [cleanName(raw), set];
}

/** Nicknames from usage are on unless switched off. */
export function useNicknamesOn(): [boolean, (on: boolean) => void] {
  const raw = useStored(GREETING_KEY);
  const set = React.useCallback((on: boolean) => write(GREETING_KEY, on ? "on" : "off"), []);
  return [raw !== "off", set];
}

export function useActivity(): Activity[] {
  const raw = useStored(ACTIVITY_KEY);
  return React.useMemo(() => {
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as Activity[]) : [];
    } catch {
      return [];
    }
  }, [raw]);
}

/** Record that a question was asked now: day, hour and weekday only. */
export function recordActivity(now: Date): void {
  let list: Activity[] = [];
  try {
    const parsed: unknown = JSON.parse(read(ACTIVITY_KEY) ?? "[]");
    if (Array.isArray(parsed)) list = parsed as Activity[];
  } catch {
    list = [];
  }
  write(ACTIVITY_KEY, JSON.stringify([...list, activityAt(now)].slice(-MAX_ACTIVITY)));
}

/** Forget the usage pattern (the menu's "Forget my pattern"). */
export function forgetActivity(): void {
  try {
    window.localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    // nothing to forget
  }
  window.dispatchEvent(new Event(CHANGED));
}
