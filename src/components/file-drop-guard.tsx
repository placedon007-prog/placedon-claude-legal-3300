"use client";

import * as React from "react";
import { guardFileDrops } from "@/lib/file-drop";

/** Keeps a stray file drop from navigating the console away from unsaved work. */
export function FileDropGuard() {
  React.useEffect(() => guardFileDrops(window), []);
  return null;
}
