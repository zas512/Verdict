import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { MattersList } from "@/components/matters/MattersList";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = new Set(["OWNER", "ASSOCIATE"]);

export default async function MattersPage() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (!ALLOWED_ROLES.has(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Matters & Cases Dashboard" />
      <MattersList userRole={user.role} />
    </div>
  );
}
