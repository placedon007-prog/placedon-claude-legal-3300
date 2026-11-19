import type { Metadata } from "next";
import localFont from "next/font/local";
import { Italiana } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";
import { plexSans } from "./app/fonts";

/* Tall, condensed, high-contrast display serif — the law-firm register asked
   for (2026-10-29), replacing Fraunces as --font-display site-wide. Italiana
   is weight-400-only and has no variable axes, so the opsz/SOFT/WONK
   font-variation-settings elsewhere in the CSS are simply ignored by it
   (harmless) rather than doing anything. */
const italiana = Italiana({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const inter = localFont({
  src: "../../brand-kit/fonts/Inter-Variable.ttf",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
});
const mono = localFont({
  src: [
    { path: "../../brand-kit/fonts/IBMPlexMono-Regular.ttf", weight: "400" },
    { path: "../../brand-kit/fonts/IBMPlexMono-Medium.ttf", weight: "500" },
  ],
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Placedon — the record for Indian corporate law",
    template: "%s | Placedon",
  },
  description:
    "Placedon answers Indian corporate-law questions with the exact provision, the amending instrument, and the operative date — and abstains when it cannot verify.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-IN"
      data-theme="light"
      className={`${italiana.variable} ${inter.variable} ${mono.variable} ${plexSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <main id="main-content">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
