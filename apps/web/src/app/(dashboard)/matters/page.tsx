import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { MattersPage } from "@/components/matters/MattersPage";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = new Set(["OWNER", "ASSOCIATE"]);

export const metadata: Metadata = {
  title: "Verdict - Matters List"
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
    <>
      <HeaderUpdater title="Matters & Cases Dashboard" />
      <MattersPage />
    </>
  );
}
