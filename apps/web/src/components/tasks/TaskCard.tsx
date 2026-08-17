"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarDays, MessageSquare, Paperclip, Scale } from "lucide-react";
import {
  getInitials,
  isOverdue,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  formatDueDate,
  type Task
} from "./types";

function AssigneeStack({ task }: { task: Task }) {
  const visible = task.assignees.slice(0, 3);
  const overflow = task.assignees.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((a) => (
        <Avatar
          key={a.associateId}
          size="sm"
          title={a.associate?.fullName ?? a.associateId}
          className="ring-card ring-2"
        >
          <AvatarFallback>
            {getInitials(a.associate?.fullName ?? "?")}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <span className="bg-muted text-muted-foreground ring-card flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2">
          +{overflow}
        </span>
      )}
      {task.assignees.length === 0 && (
        <span className="text-muted-foreground text-[10px] font-semibold">
          Unassigned
        </span>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  showMatter?: boolean;
}

export function TaskCard({
  task,
  onClick,
  showMatter
}: Readonly<TaskCardProps>) {
  const overdue = isOverdue(task);
  const commentCount = task.notes?.length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border bg-card w-full rounded-xl border p-3 text-left shadow-xs transition-colors",
        "hover:border-primary/40 hover:bg-card hover:shadow-sm",
        "focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
        "cursor-pointer",
        task.status === "COMPLETED" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-foreground line-clamp-2 text-xs leading-snug font-bold",
            task.status === "COMPLETED" && "line-through"
          )}
        >
          {task.title}
        </p>
        <Badge
          variant={PRIORITY_BADGE[task.priority]}
          className="shrink-0 px-2 text-[10px]"
        >
          {PRIORITY_LABEL[task.priority]}
        </Badge>
      </div>

      {task.status === "BLOCKED" && (
        <span className="bg-destructive/10 text-destructive mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
          Blocked
        </span>
      )}

      {showMatter && task.matter && (
        <span className="border-border bg-muted/60 text-muted-foreground mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
          <Scale className="h-3 w-3" />
          {task.matter.firmCaseNumber}
        </span>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <AssigneeStack task={task} />
        <div className="text-muted-foreground flex items-center gap-2.5 text-[10px] font-semibold">
          {overdue ? (
            <span className="text-destructive flex items-center gap-1 font-bold">
              <CalendarDays className="h-3 w-3" />
              Overdue
            </span>
          ) : (
            task.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )
          )}
          {commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {attachmentCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
