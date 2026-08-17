import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { SummaryStrip } from "../ui/summary-strip";
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
    <Card className="skeuo-card bg-card text-card-foreground relative flex flex-col justify-between overflow-hidden">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-bold tracking-wider uppercase">
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
          <p className="text-muted-foreground mt-1 text-xs font-semibold">
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
      <SummaryStrip
        metrics={[
          {
            label: "My Tasks",
            value: openCount,
            indicator: `${tasks.length} total`
          },
          {
            label: "Completed",
            value: completedCount,
            indicator: "tasks done",
            accentColor: "var(--success)"
          },
          {
            label: "Overdue",
            value: overdueCount,
            indicator: "past due",
            accentColor: overdueCount > 0 ? "var(--destructive)" : undefined,
            indicatorColor:
              overdueCount > 0 ? "text-destructive font-bold" : undefined
          },
          {
            label: "This Month",
            value: thisMonthShifts,
            indicator: `${totalHours.toFixed(1)} hrs`,
            accentColor: "var(--primary)"
          }
        ]}
      />

      {/* Recent tasks */}
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardHeader className="border-border border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
            <ListTodo className="text-primary h-4 w-4" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {recent.length === 0 ? (
            <div className="space-y-2 py-10 text-center">
              <Clock className="text-muted-foreground/40 mx-auto h-10 w-10" />
              <p className="text-foreground text-sm font-bold">
                No tasks assigned yet
              </p>
              <p className="text-muted-foreground text-xs">
                Tasks assigned to you will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {recent.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-bold">
                      {task.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                      {formatDueDate(task.dueDate)}
                      {task.matter && ` • ${task.matter.firmCaseNumber}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={PRIORITY_BADGE[task.priority]}
                      className="px-2 py-0.5 text-xs font-bold uppercase"
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-muted-foreground w-20 text-right text-xs font-semibold">
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
