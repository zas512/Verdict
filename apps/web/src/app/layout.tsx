import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { DM_Sans, EB_Garamond } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Verdict — Legal Practice Intelligence",
  description: "Law firm management and RAG-based document analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) : JSX.Element {
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
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        <footer className="border-t border-[#0B1221]/10 bg-[#F6F3EE] py-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-xs text-[#1A2332]/60 sm:flex-row sm:justify-between">
            <div className="flex gap-4">
              <a href="/privacy" className="hover:text-[#C5A059] underline underline-offset-2">Privacy</a>
              <a href="/privacy" className="hover:text-[#C5A059] underline underline-offset-2">Terms</a>
              <a href="#" onClick={() => { localStorage.setItem("cookie_consent","rejected"); window.location.reload(); }} className="hover:text-[#C5A059] underline underline-offset-2">Cookies</a>
            </div>
            <span>© Verdict — PK / US / UK / AU compliant</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
