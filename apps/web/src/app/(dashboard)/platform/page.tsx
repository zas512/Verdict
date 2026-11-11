import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PlatformClient } from "@/components/platform/PlatformClient";

export const metadata: Metadata = {
  title: "Platform",
  description: "Super-admin platform administration: firms, users, and usage.",
  alternates: { canonical: "/platform" }
};

export default async function PlatformPage() {
  const { user } = await getSession();

  if (user?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return <PlatformClient />;
}
