"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";

/**
 * Consent-gated Google Analytics 4 + cookie-consent banner.
 *
 * Analytics is OFF by default and loads only after the visitor clicks Accept —
 * which is what the privacy policy promises ("only collected if you consent").
 * The choice is stored on the device under `placedon-analytics-consent` and read
 * via useSyncExternalStore (SSR-safe: the server snapshot is always "no choice").
 *
 * The Measurement ID is public (it ships in client JS), so it is baked in and
 * works on any production deploy with no extra config; override or disable it
 * with NEXT_PUBLIC_GA_ID. GA loads in production only, so local dev never
 * reaches your reports.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-DE8BMPJRVL";
const CONSENT_KEY = "placedon-analytics-consent";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function getSnapshot(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}
function getServerSnapshot(): string | null {
  return null;
}
function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage unavailable — choice applies to this visit only */
  }
  listeners.forEach((l) => l());
}

export function Analytics() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const consent = raw === "granted" ? "granted" : raw === "denied" ? "denied" : null;

  const isProduction = process.env.NODE_ENV === "production";
  const loadGA = isProduction && !!GA_ID && consent === "granted";

  return (
    <>
      {loadGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}

      {consent === null && (
        <div className="consent-banner" role="dialog" aria-label="Cookie choice">
          <p className="consent-text">
            We use Google Analytics to understand how the site is used — no
            personal data, no advertising. It stays off unless you accept.{" "}
            <a href="/cookies">How we use data</a>.
          </p>
          <div className="consent-actions">
            <button
              type="button"
              className="consent-btn consent-ghost"
              onClick={() => setConsent("denied")}
            >
              Decline
            </button>
            <button
              type="button"
              className="consent-btn consent-solid"
              onClick={() => setConsent("granted")}
            >
              Accept analytics
            </button>
          </div>
        </div>
      )}
    </>
  );
}
