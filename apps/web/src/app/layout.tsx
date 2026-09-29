import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { DM_Sans, EB_Garamond } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

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
      </body>
    </html>
  );
}
