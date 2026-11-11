import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "Verdict — The Practice, Organized" },
  robots: { index: false, follow: false }
};

export default async function HomePage() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "SUPER_ADMIN") {
    redirect("/platform");
  }
  redirect("/dashboard");
}
