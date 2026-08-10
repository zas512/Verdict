import { ExpensesClient } from "@/components/expenses/ExpensesClient";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ExpensesPage() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Expenses & Billing" />
      <ExpensesClient userRole={user.role} />
    </div>
  );
}
