import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import {
  DM_Sans,
  Geist,
  Geist_Mono,
  Inter,
  EB_Garamond
} from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  weight: ["400", "700"]
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Verdict",
  description: "Law Firm Management System"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        dmSans.variable,
        interHeading.variable,
        ebGaramond.variable
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
        {/* impeccable-live-start */}
        <script src="http://localhost:8400/live.js?token=8a56207d-7d2e-4561-98de-e0e513fc23d2"></script>
        {/* impeccable-live-end */}
      </body>
    </html>
  );
}
