"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Loader2, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { TaskCard } from "./TaskCard";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { isOverdue, STATUS_COLUMNS, type Task } from "./types";

interface TasksBoardProps {
  matterId?: string | null;
  userRole?: string;
}

function KpiCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "neutral" | "accent" | "warning" | "danger";
}) {
  return (
    <div className="border-border bg-card flex items-center justify-between rounded-xl border px-3 py-2.5">
      <span className="text-muted-foreground text-[11px] font-bold tracking-wide uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-black tabular-nums",
          tone === "danger"
            ? "text-destructive"
            : tone === "warning"
              ? "text-warning"
              : tone === "accent"
                ? "text-primary"
                : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TasksBoard({
  matterId = null,
  userRole
}: Readonly<TasksBoardProps>) {
  const { user } = useAuth();
  const role = userRole ?? user?.role;
  const isStandalone = !matterId;

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const {
    data: tasks = [],
    isFetching,
    refetch
  } = useQuery<Task[]>({
    queryKey: ["tasks", matterId ?? "all"],
    queryFn: async () => {
      const query = matterId ? `?matterId=${matterId}` : "";
      const res = await fetch(`/api/tasks${query}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const overdueCount = tasks.filter(isOverdue).length;
  const openCount = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "BLOCKED"
  ).length;
  const reviewCount = tasks.filter((t) => t.status === "UNDER_REVIEW").length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isStandalone && (
          <h2 className="text-foreground text-base font-black">Task Board</h2>
        )}
        <div
          className={cn("flex items-center gap-2", !isStandalone && "ml-auto")}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
            className="gap-1.5 rounded-xl text-xs font-bold"
            aria-label="Refresh tasks"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            Sync
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="skeuo-button-primary gap-1.5 rounded-xl text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            {matterId ? "Delegate Task" : "New Task"}
          </Button>
        </div>
      </div>

      {/* KPI strip (standalone only) */}
      {isStandalone && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard label="Open" value={openCount} tone="accent" />
          <KpiCard label="In Progress" value={inProgressCount} tone="neutral" />
          <KpiCard label="Under Review" value={reviewCount} tone="warning" />
          <KpiCard label="Overdue" value={overdueCount} tone="danger" />
        </div>
      )}

      {/* Kanban columns */}
      {tasks.length === 0 && isStandalone ? (
        <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center">
          <span className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
            <ListChecks className="h-6 w-6" />
          </span>
          <p className="text-foreground text-sm font-black">No tasks yet</p>
          <p className="text-muted-foreground max-w-sm text-xs font-medium">
            Create an independent task or link one to a matter, then assign it
            to an associate.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="skeuo-button-primary mt-1 gap-1.5 rounded-xl text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) =>
              col.statuses.includes(t.status)
            );
            return (
              <section
                key={col.key}
                aria-label={col.label}
                className="border-border bg-muted/25 flex min-h-[180px] flex-col rounded-2xl border p-2"
              >
                <header className="flex items-center gap-2 px-1.5 pt-1 pb-2">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  <h3 className="text-foreground text-xs font-black tracking-wide uppercase">
                    {col.label}
                  </h3>
                  <span className="bg-card text-muted-foreground border-border ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums">
                    {colTasks.length}
                  </span>
                </header>
                <div className="flex-1 space-y-2 overflow-y-auto pb-1">
                  {colTasks.length === 0 && (
                    <p className="border-border/70 text-muted-foreground/70 rounded-xl border border-dashed px-3 py-4 text-center text-[11px] font-semibold">
                      Drop tasks here
                    </p>
                  )}
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showMatter={isStandalone}
                      onClick={() => setDetailTask(task)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {isFetching && tasks.length > 0 && (
        <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs font-semibold">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing…
        </div>
      )}

      {/* Dialogs */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        matterId={matterId}
        userRole={role}
        currentUserEmail={user?.email}
      />
      <TaskDetailDialog
        task={detailTask}
        open={Boolean(detailTask)}
        onOpenChange={(open) => {
          if (!open) setDetailTask(null);
        }}
        userRole={role}
        currentUserEmail={user?.email}
        onChanged={() => {
          // The dialogs already invalidate ["tasks"]; keep a fresh fetch for
          // the board so the kanban stays in sync.
          void refetch();
        }}
      />
    </div>
  );
}
