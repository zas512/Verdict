import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Associates",
  robots: { index: false, follow: true }
};

// /team was the old route for the associates directory.
export default function TeamPageRedirect() {
  permanentRedirect("/associates");
}
