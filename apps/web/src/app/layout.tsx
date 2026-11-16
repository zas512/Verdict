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
import { Plus_Jakarta_Sans, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
  display: "swap"
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap"
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
        plusJakartaSans.variable,
        publicSans.variable,
        "font-sans"
      )}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <OrganizationSchema org={organization} />
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
