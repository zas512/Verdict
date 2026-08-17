/**
 * Shared types for the Tasks surface. Mirrors the API's serialized
 * TaskEntity (see apps/api/src/modules/tasks/entities/task.entity.ts).
 */

export type TaskStatus =
  "PENDING" | "IN_PROGRESS" | "UNDER_REVIEW" | "COMPLETED" | "BLOCKED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskType =
  | "DOCUMENT_FILING"
  | "PRINTING_BINDING"
  | "CLIENT_FOLLOWUP"
  | "WITNESS_BRIEFING"
  | "LEGAL_RESEARCH"
  | "OTHER";

export interface AssociateMin {
  id: string;
  fullName: string;
  email: string | null;
}

export interface TaskNote {
  id: string;
  authorId: string;
  note: string;
  createdAt: string;
  author?: AssociateMin | null;
}

export interface TaskAttachment {
  id: string;
  kind: "FILE" | "LINK";
  fileUrl: string;
  label?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  cloudinaryPublicId?: string | null;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: AssociateMin | null;
}

export interface TaskAssignee {
  id: string;
  associateId: string;
  assignedAt: string;
  associate?: AssociateMin | null;
}

export interface TaskMatter {
  id: string;
  firmCaseNumber: string;
  clientName: string;
}

export interface Task {
  id: string;
  firmId: string;
  matterId?: string | null;
  hearingId?: string | null;
  createdById: string;
  title: string;
  description?: string | null;
  taskType?: TaskType | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  estimatedHours?: number | null;
  completionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  matter?: TaskMatter | null;
  createdBy?: AssociateMin | null;
  assignees: TaskAssignee[];
  notes: TaskNote[];
  attachments: TaskAttachment[];
}

export interface AssociateOption {
  id: string;
  name?: string | null;
  email: string | null;
}

export const STATUS_COLUMNS: {
  key: string;
  label: string;
  statuses: TaskStatus[];
  dot: string;
}[] = [
  {
    key: "todo",
    label: "To Do",
    statuses: ["PENDING"],
    dot: "bg-muted-foreground/50"
  },
  {
    key: "inprogress",
    label: "In Progress",
    statuses: ["IN_PROGRESS", "BLOCKED"],
    dot: "bg-primary"
  },
  {
    key: "review",
    label: "Under Review",
    statuses: ["UNDER_REVIEW"],
    dot: "bg-warning"
  },
  {
    key: "done",
    label: "Done",
    statuses: ["COMPLETED"],
    dot: "bg-success"
  }
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "To Do",
  IN_PROGRESS: "In Progress",
  UNDER_REVIEW: "Under Review",
  COMPLETED: "Done",
  BLOCKED: "Blocked"
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical"
};

export const PRIORITY_BADGE: Record<
  TaskPriority,
  "secondary" | "navy" | "amber" | "destructive"
> = {
  LOW: "secondary",
  MEDIUM: "navy",
  HIGH: "amber",
  CRITICAL: "destructive"
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  DOCUMENT_FILING: "Document Filing",
  PRINTING_BINDING: "Printing & Binding",
  CLIENT_FOLLOWUP: "Client Follow-up",
  WITNESS_BRIEFING: "Witness Briefing",
  LEGAL_RESEARCH: "Legal Research",
  OTHER: "Other"
};

export function getInitials(nameStr: string): string {
  const parts = nameStr.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameStr.substring(0, 2).toUpperCase();
}

export function formatDate(dateIso?: string | null): string {
  if (!dateIso) return "-";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatDueDate(dateIso?: string | null): string {
  if (!dateIso) return "No due date";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short"
  });
}

export function isOverdue(task: Pick<Task, "status" | "dueDate">): boolean {
  if (!task.dueDate) return false;
  const statuses: TaskStatus[] = ["PENDING", "IN_PROGRESS", "UNDER_REVIEW"];
  if (!statuses.includes(task.status)) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export function isAssignee(
  task: Pick<Task, "assignees">,
  associateId?: string | null
): boolean {
  if (!associateId) return false;
  return task.assignees.some((a) => a.associateId === associateId);
}
