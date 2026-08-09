import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PRIORITY_BADGE,
  STATUS_LABEL,
  formatDueDate,
  type Task
} from "@/components/tasks/types";
import { backendFetch } from "@/lib/server-api";
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListTodo,
  TriangleAlert
} from "lucide-react";
import type { ReactNode } from "react";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
}

async function fetchList<T>(endpoint: string): Promise<T[]> {
  const res = await backendFetch(endpoint).catch(() => null);
  if (!res?.ok) return [];
  return res.json().catch(() => []);
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden flex flex-col justify-between">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{label}</span>
          <span className="text-primary">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div
          className={`text-3xl font-black tracking-tight ${accent ?? "text-foreground"}`}
        >
          {value}
        </div>
        {sub && (
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ASSOCIATE landing view: their own tasks and their own attendance.
 * Reads both endpoints server-side so the JWT comes from the session cookie.
 */
export async function AssociateDashboard() {
  const [tasks, records] = await Promise.all([
    fetchList<Task>("/tasks"),
    fetchList<AttendanceRecord>("/attendance")
  ]);

  const OPEN_STATUSES = new Set([
    "PENDING",
    "IN_PROGRESS",
    "UNDER_REVIEW",
    "BLOCKED"
  ]);
  const openCount = tasks.filter((t) => OPEN_STATUSES.has(t.status)).length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const overdueCount = tasks.filter(
    (t) =>
      t.status !== "COMPLETED" &&
      t.dueDate &&
      new Date(t.dueDate).getTime() < Date.now()
  ).length;

  let totalHours = 0;
  let presentDays = 0;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  let thisMonthShifts = 0;

  for (const r of records) {
    if (r.date?.startsWith(monthKey)) thisMonthShifts += 1;
    if (r.status === "PRESENT") presentDays += 1;
    if (r.checkIn && r.checkOut) {
      const h =
        (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) /
        3_600_000;
      if (h > 0 && h < 24) totalHours += h;
    }
  }

  const recent = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <HeaderUpdater title="My Dashboard" breadcrumb="Overview" />

      {/* Personal metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="My Tasks"
          value={`${openCount} open`}
          sub={`${tasks.length} total assigned`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Completed"
          value={completedCount}
          sub="tasks marked done"
          accent="text-success"
        />
        <StatCard
          icon={<TriangleAlert className="h-4 w-4 text-destructive" />}
          label="Overdue"
          value={overdueCount}
          sub="past their due date"
          accent={overdueCount > 0 ? "text-destructive" : "text-foreground"}
        />
        <StatCard
          icon={<CalendarCheck2 className="h-4 w-4" />}
          label="This Month"
          value={`${thisMonthShifts} shifts`}
          sub={`${totalHours.toFixed(1)} hrs logged`}
        />
      </div>

      {/* Recent tasks */}
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-extrabold flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {recent.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="font-bold text-foreground text-sm">
                No tasks assigned yet
              </p>
              <p className="text-xs text-muted-foreground">
                Tasks assigned to you will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {formatDueDate(task.dueDate)}
                      {task.matter && ` • ${task.matter.firmCaseNumber}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={PRIORITY_BADGE[task.priority]}
                      className="text-xs font-bold uppercase px-2 py-0.5"
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground w-20 text-right">
                      {STATUS_LABEL[task.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
