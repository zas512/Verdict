"use client";

import Script from "next/script";

/**
 * Google Analytics 4 loader.
 *
 * Only renders when NEXT_PUBLIC_GA_MEASUREMENT_ID is set — this keeps the app
 * fully functional in dev / before GA is configured. The measurement ID is a
 * public identifier (visible in page source), so exposing it is expected.
 */
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
