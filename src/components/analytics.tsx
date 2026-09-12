import Script from "next/script";

/**
 * Google Analytics 4 — loads only when NEXT_PUBLIC_GA_ID is set.
 *
 * Set the Measurement ID (G-XXXXXXXXXX) as an environment variable on the host
 * (Vercel → Settings → Environment Variables). Until it is set, nothing loads
 * and no analytics cookies are placed — so the pre-launch site ships clean.
 *
 * SPA route changes: enable "Enhanced measurement" in the GA4 property so
 * client-side navigations are captured via browser-history events.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
