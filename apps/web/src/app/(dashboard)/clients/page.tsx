import { ClientsClient } from "@/components/clients/ClientsClient";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = new Set(["OWNER", "ASSOCIATE"]);

export default async function ClientsPage() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (!ALLOWED_ROLES.has(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Clients Directory" breadcrumb="Client Ledger" />
      <ClientsClient userRole={user.role} />
    </div>
  );
}
