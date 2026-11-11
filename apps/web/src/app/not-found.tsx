import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — Verdict",
  // Keep error pages out of search results.
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24 text-center">
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
        <Scale className="h-7 w-7" aria-hidden="true" />
      </div>

      <p className="font-garamond text-primary mt-6 text-sm font-bold tracking-[0.2em] uppercase">
        Error 404
      </p>

      <h1 className="font-heading text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
        Page not found
      </h1>

      <p className="text-muted-foreground mt-4 max-w-md text-sm leading-6">
        The page you are looking for doesn&apos;t exist or may have been moved.
        Check the address, or use the link below to get back to safety.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
