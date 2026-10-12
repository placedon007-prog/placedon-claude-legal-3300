"use client";

/**
 * Marketing and legal work currently share a browser document. A vendor script loaded
 * on the marketing route can observe private history changes before a React effect
 * disables it. Do not load any tag, automatic collector, or consent banner in this build.
 * Keep this component's API while a separate document/origin boundary is implemented.
 */
export function Analytics() {
  return null;
}
