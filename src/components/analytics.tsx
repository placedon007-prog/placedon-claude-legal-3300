import Script from "next/script";

/**
 * Google Analytics 4.
 *
 * The Measurement ID is public (it ships in client JS), so it is baked in as a
 * default and works on any production deploy with no extra config. Override or
 * disable it by setting NEXT_PUBLIC_GA_ID (set it to an empty value to turn off).
 *
 * Loads in PRODUCTION only, so local `npm run dev` traffic never reaches GA and
 * your reports stay clean. SPA route changes are captured when "Enhanced
 * measurement" is enabled in the GA4 property (on by default).
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-DE8BMPJRVL";

export function Analytics() {
  const id = GA_ID;
  if (!id || process.env.NODE_ENV !== "production") return null;
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
