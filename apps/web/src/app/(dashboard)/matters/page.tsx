import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { MattersPage } from "@/components/matters/MattersPage";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

const ALLOWED_ROLES = new Set(["OWNER", "ASSOCIATE"]);

export const metadata: Metadata = {
  title: "Matters List",
  description: "Matters & Cases Dashboard",
};

export default async function Matters() {
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
      <MattersPage userRole={user.role} />
    </div>
  );
}
