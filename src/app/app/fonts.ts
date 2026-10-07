import localFont from "next/font/local";

/**
 * The console's one sans: IBM Plex Sans, self-hosted (SIL OFL, licence in brand-kit/fonts).
 * Chosen on the real Ask screen over Inter and Geist (docs/design/LOOP.md, 2026-10-07): it
 * shares a skeleton with the IBM Plex Mono that sets every evidence line, so a claim and its
 * basis read as one family. Subset to Latin + ₹ and dashes as woff2: 69 KB, from 537 KB.
 *
 * `preload: false` because the root layout carries the variable (portals render outside
 * the console and need it) and the marketing pages must not download a face they never use.
 */
export const plexSans = localFont({
  src: "../../../brand-kit/fonts/IBMPlexSans-Variable-latin.woff2",
  variable: "--font-plex-sans",
  weight: "100 700",
  display: "swap",
  preload: false,
});
