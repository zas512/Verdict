import { ClientsPage } from "@/components/clients/ClientsPage";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = new Set(["OWNER", "ASSOCIATE"]);

export const metadata: Metadata = { title: "Verdict - Clients Directory" };

export default async function Clients() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (!ALLOWED_ROLES.has(user.role)) {
    redirect("/dashboard");
  }
  return (
    <>
      <HeaderUpdater title="Clients Directory" />
      <ClientsPage />
    </>
  );
}
