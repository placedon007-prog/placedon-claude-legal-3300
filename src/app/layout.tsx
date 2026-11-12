import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@/components/analytics";
import { SmoothScroll } from "@/components/smooth-scroll";
// Lenis's own stylesheet — required by the library, not optional: it sets
// `html.lenis body { height: auto }` and the overscroll containment for
// `[data-lenis-prevent]` subtrees. Without it, nested scrollers leak their
// scroll to the page.
import "lenis/dist/lenis.css";
import "./globals.css";

// Display face. Redaction, vendored into brand-kit/fonts as woff2 (latin
// subset) and served from our own origin like every other face here.
//
// It is on Google Fonts, but `next/font/google` does not know it — Next's
// bundled font manifest predates it, so importing `{ Redaction }` is a
// type error. Vendoring is the better outcome regardless: a <link> to
// fonts.googleapis.com would disclose every visitor's IP to a third party
// on page load, before the consent banner is answered, contradicting the
// privacy policy and the consent-gated analytics.
//
// Redaction is STATIC: 400 and 700 only (plus italic 400). There is no 600
// and no variable axis — write 700 for bold display type, and never add
// font-variation-settings to a display element.
const redaction = localFont({
  src: [
    { path: "../../brand-kit/fonts/Redaction-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../brand-kit/fonts/Redaction-Italic.woff2", weight: "400", style: "italic" },
    { path: "../../brand-kit/fonts/Redaction-Bold.woff2", weight: "700", style: "normal" },
  ],
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
      data-theme="dark"
      className={`${redaction.variable} ${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SmoothScroll>
          <main id="main-content">{children}</main>
        </SmoothScroll>
        <Analytics />
      </body>
    </html>
  );
}
