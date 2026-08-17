import LawQuotes from "@/components/auth/Quotes";
import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verdict - Sign In",
  description: "Sign in to your account"
};

export default function AuthLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 md:p-8">
      {/* Background image, full cover of the page */}
      <Image
        src="/login.webp"
        alt="bg-image"
        fill
        priority
        className="z-0 object-cover blur-xs"
      />
      {/* Dim layer & primary tint cover */}
      <div className="bg-overlay/50 absolute inset-0 z-0" />
      <div className="bg-primary/30 absolute inset-0 z-0" />

      {/* Centered Two-Sided Card */}
      <Card className="bg-card relative z-10 w-full max-w-5xl border shadow-2xl [--card-spacing:0px]">
        <CardContent className="grid min-h-145 p-0 px-0 py-0 [--card-spacing:0px] md:grid-cols-2">
          {/* Left Column: Branding Sidebar & Quotes */}
          <div className="text-primary-foreground bg-primary/90 relative hidden flex-col justify-between overflow-hidden p-8 md:flex md:p-12">
            {/* Ambient overlay gradient for premium depth */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-black/10 via-transparent to-black/10" />

            {/* Branding Section */}
            <div className="relative z-10 flex items-center gap-3">
              <Image
                src="/logo_verdict.png"
                alt="Verdict"
                width={80}
                height={90}
                className="object-contain brightness-100"
              />
              <div>
                <p className="font-garamond text-primary-foreground text-3xl leading-tight font-bold tracking-wider">
                  VERDICT
                </p>
                <p className="text-primary-foreground/80 font-sans text-sm font-semibold">
                  The Practice, Organized
                </p>
              </div>
            </div>

            {/* Quotes Section */}
            <div className="relative z-10 flex flex-1 flex-col justify-center space-y-3 py-10">
              <LawQuotes />
            </div>

            {/* Bottom branding / copyright footer */}
            <p className="text-primary-foreground/60 relative z-10 text-[11px] font-semibold tracking-wide">
              &copy; {new Date().getFullYear()} Verdict Technologies. All rights
              reserved.
            </p>
          </div>

          {/* Right Column: Page Content (Auth form/children) */}
          <div className="flex flex-col justify-center p-6 md:p-8 lg:p-12">
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
