import { AssociatesList } from "@/components/associates/AssociatesList";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AssociatesPage() {
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
      <AssociatesList userRole={user.role} />
    </div>
  );
}
