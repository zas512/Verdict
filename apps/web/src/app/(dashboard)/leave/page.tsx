import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { LeaveRequests } from "@/components/leave/LeaveRequests";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = ["OWNER", "ASSOCIATE"];

export default async function LeavePage() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (!ALLOWED_ROLES.includes(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Leave Requests" />
      <LeaveRequests userRole={user.role} />
    </div>
  );
}
