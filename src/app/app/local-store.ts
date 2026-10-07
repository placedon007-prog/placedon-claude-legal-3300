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
