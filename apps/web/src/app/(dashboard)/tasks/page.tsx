import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { TasksBoard } from "@/components/tasks/TasksBoard";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = ["OWNER", "ASSOCIATE"];

export default async function TasksPage() {
  const { user } = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (!ALLOWED_ROLES.includes(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <HeaderUpdater title="Tasks" />
      <TasksBoard userRole={user.role} />
    </div>
  );
}
