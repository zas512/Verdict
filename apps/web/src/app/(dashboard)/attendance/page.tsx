import { AttendancePage } from "@/components/attendance/AttendancePage";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verdict - Attendance"
};

const ALLOWED_ROLES = new Set(["OWNER", "ASSOCIATE"]);

export default async function Attendance() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (!ALLOWED_ROLES.has(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Attendance Tracking & Leaves" />
      <AttendancePage />
    </div>
  );
}
