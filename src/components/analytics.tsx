"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Consent-gated Google Analytics 4 + cookie-consent banner.
 *
 * Analytics is OFF by default and loads only after the visitor clicks Accept —
 * which is what the privacy policy promises. On Accept, the gtag script is
 * injected directly into <head> (more reliable than a conditionally-rendered
 * next/script). Skipped on localhost so local development never reaches GA.
 *
 * The Measurement ID is public (it ships in client JS); override with
 * NEXT_PUBLIC_GA_ID or set it empty to disable.
 */
// `||` (not `??`) so an empty NEXT_PUBLIC_GA_ID env var still falls back to the
// real ID rather than disabling analytics with a blank string.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-DE8BMPJRVL";
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
  const consent =
    raw === "granted" ? "granted" : raw === "denied" ? "denied" : null;

  useEffect(() => {
    if (consent !== "granted" || !GA_ID) return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    if (document.getElementById("ga4-src")) return; // already loaded

    const tag = document.createElement("script");
    tag.id = "ga4-src";
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(tag);

    const init = document.createElement("script");
    init.id = "ga4-init";
    init.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`;
    document.head.appendChild(init);
  }, [consent]);

  if (consent !== null) return null;

  return (
    <div className="consent-banner" role="dialog" aria-label="Cookie choice">
      <p className="consent-text">
        We use Google Analytics to understand how the site is used — no personal
        data, no advertising. It stays off unless you accept.{" "}
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
  );
}
