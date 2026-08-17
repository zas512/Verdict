import { AssociatesPage } from "@/components/associates/AssociatesPage";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { getSession } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verdict - Associates",
  description: "Firm Associates",
};

export default async function Associates() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Law Firm Associates & Staff" />
      <AssociatesPage />
    </div>
  );
}
