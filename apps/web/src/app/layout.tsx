import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import {
  defaultOgImage,
  defaultOgImageHeight,
  defaultOgImageWidth,
  organization,
  siteDescription,
  siteName,
  siteTagline,
  siteUrl
} from "@/config/site";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { DM_Sans, EB_Garamond } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "700"]
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "law firm management software",
    "legal practice management",
    "matter management",
    "case management",
    "legal operations",
    "legal document analysis"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [
      {
        url: defaultOgImage,
        width: defaultOgImageWidth,
        height: defaultOgImageHeight,
        alt: siteName
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: [defaultOgImage]
  },
  icons: { icon: "/favicon.ico" },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        ebGaramond.variable,
        dmSans.variable,
        "font-sans"
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-[#F6F3EE] text-[#1A2332]">
        <OrganizationSchema org={organization} />
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
