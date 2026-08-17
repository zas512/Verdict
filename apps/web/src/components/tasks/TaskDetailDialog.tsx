"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Link2,
  MessageSquare,
  Plus,
  Scale,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { uploadTaskFile } from "./cloudinary";
import {
  formatDate,
  formatDueDate,
  getInitials,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Task,
  type TaskStatus
} from "./types";

const STATUS_BADGE: Record<TaskStatus, string> = {
  PENDING: "bg-muted-foreground/10 text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  UNDER_REVIEW: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  BLOCKED: "bg-destructive/10 text-destructive"
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  currentUserEmail?: string | null;
  onChanged: () => void;
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  userRole,
  currentUserEmail,
  onChanged
}: Readonly<TaskDetailDialogProps>) {
  const queryClient = useQueryClient();
  const [localTask, setLocalTask] = useState<Task | null>(task);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  const isAdmin = userRole === "OWNER";

  // Resolve the caller's associate id from any nested associate object so we
  // can gate assignee-only actions without a separate lookup.
  const currentUserId = useMemo(() => {
    if (!localTask) return undefined;
    const people = [
      localTask.createdBy,
      ...localTask.assignees.map((a) => a.associate),
      ...localTask.notes.map((n) => n.author),
      ...localTask.attachments.map((a) => a.uploadedBy)
    ].filter((p): p is NonNullable<typeof p> => Boolean(p));
    return people.find((p) => p.email === currentUserEmail)?.id;
  }, [localTask, currentUserEmail]);

  const isAssignee = Boolean(
    currentUserId &&
    localTask?.assignees.some((a) => a.associateId === currentUserId)
  );
  const isCreator = Boolean(
    currentUserId && localTask?.createdById === currentUserId
  );

  const invalidateTask = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    if (localTask?.matterId) {
      void queryClient.invalidateQueries({
        queryKey: ["matter-timeline", localTask.matterId]
      });
    }
    onChanged();
  };

  const applyResult = (updated: Task) => {
    setLocalTask(updated);
    invalidateTask();
  };

  const statusMutation = useMutation({
    mutationFn: async (status: TaskStatus) => {
      if (!localTask) throw new Error("No task selected");
      const res = await fetch(`/api/tasks/${localTask.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update task");
      return data as Task;
    },
    onSuccess: applyResult,
    onError: (err: Error) => toast.error(err.message || "Update failed")
  });

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!localTask) throw new Error("No task selected");
      const res = await fetch(`/api/tasks/${localTask.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add comment");
      return data as Task;
    },
    onSuccess: (updated) => {
      setNoteText("");
      applyResult(updated);
    },
    onError: (err: Error) => toast.error(err.message || "Comment failed")
  });

  const submitNote = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setAddingNote(true);
    noteMutation.mutate(trimmed, { onSettled: () => setAddingNote(false) });
  };

  // ---- Attachments ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!localTask) return;
    setUploading(true);
    try {
      const uploaded = await uploadTaskFile(file);
      const res = await fetch(`/api/tasks/${localTask.id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "FILE",
          fileUrl: uploaded.secureUrl,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          cloudinaryPublicId: uploaded.publicId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to attach file");
      toast.success("File attached");
      applyResult(data as Task);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!localTask) throw new Error("No task selected");
      const res = await fetch(`/api/tasks/${localTask.id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "LINK",
          fileUrl: linkUrl.trim(),
          label: linkLabel.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add link");
      return data as Task;
    },
    onSuccess: (updated) => {
      toast.success("Link added");
      setLinkUrl("");
      setLinkLabel("");
      setShowLinkForm(false);
      applyResult(updated);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add link")
  });

  // ---- Delete ----
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!localTask) throw new Error("No task selected");
      const res = await fetch(`/api/tasks/${localTask.id}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete task");
      return data;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      setConfirmingDelete(false);
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onChanged();
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed")
  });

  if (!localTask) return null;

  const canDelete = isAdmin || isCreator;
  const status = localTask.status;

  const actionButton = (label: string, action: () => void, busy: boolean) => (
    <Button
      type="button"
      onClick={action}
      disabled={busy}
      className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </Button>
  );

  // PATCH /status is the single transition path: admins may set any status
  // (including approving UNDER_REVIEW), associates may advance their own task
  // but cannot approve UNDER_REVIEW→COMPLETED themselves (backend enforces).
  const primaryAction =
    status === "PENDING" ? (
      actionButton(
        "Start Work",
        () => statusMutation.mutate("IN_PROGRESS"),
        statusMutation.isPending
      )
    ) : status === "IN_PROGRESS" ? (
      <div className="flex flex-wrap gap-2">
        {actionButton(
          "Submit for Review",
          () => statusMutation.mutate("UNDER_REVIEW"),
          statusMutation.isPending
        )}
        {actionButton(
          "Mark Complete",
          () => statusMutation.mutate("COMPLETED"),
          statusMutation.isPending
        )}
      </div>
    ) : status === "UNDER_REVIEW" ? (
      isAdmin ? (
        actionButton(
          "Approve & Complete",
          () => statusMutation.mutate("COMPLETED"),
          statusMutation.isPending
        )
      ) : (
        <p className="text-muted-foreground text-xs font-semibold">
          Under review — awaiting approval to complete.
        </p>
      )
    ) : status === "COMPLETED" ? (
      actionButton(
        "Reopen",
        () => statusMutation.mutate("IN_PROGRESS"),
        statusMutation.isPending
      )
    ) : null;

  // Backend gates status changes to assignees (or admins), so only show the
  // action row to those roles — creators who aren't assignees can still
  // comment and attach.
  const canAct = isAdmin || isAssignee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-foreground text-lg font-black">
              {localTask.title}
            </DialogTitle>
            <Badge
              variant={PRIORITY_BADGE[localTask.priority]}
              className="px-2 text-[10px]"
            >
              {PRIORITY_LABEL[localTask.priority]}
            </Badge>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                STATUS_BADGE[status]
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Meta */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold">
            {localTask.matter && (
              <span className="border-border bg-muted/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                <Scale className="h-3 w-3" />
                {localTask.matter.firmCaseNumber}
              </span>
            )}
            {localTask.dueDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Due {formatDueDate(localTask.dueDate)}
              </span>
            )}
            {localTask.estimatedHours != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {localTask.estimatedHours} h est.
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              Created {formatDate(localTask.createdAt)}
              {localTask.createdBy && (
                <span className="text-foreground">
                  by {localTask.createdBy.fullName}
                </span>
              )}
            </span>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-xs font-bold">
              Assignees
            </Label>
            <div className="flex flex-wrap gap-2">
              {localTask.assignees.length === 0 && (
                <p className="text-muted-foreground text-xs font-medium">
                  Unassigned
                </p>
              )}
              {localTask.assignees.map((a) => (
                <span
                  key={a.id}
                  className="border-border bg-card text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
                >
                  <Avatar size="sm" title={a.associate?.fullName ?? "?"}>
                    <AvatarFallback>
                      {getInitials(a.associate?.fullName ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  {a.associate?.fullName ?? "Unknown"}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {localTask.description && (
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs font-bold">
                Description
              </Label>
              <p className="border-border bg-muted/40 text-foreground rounded-xl border px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                {localTask.description}
              </p>
            </div>
          )}

          {/* Status actions */}
          {(canAct || isAssignee) && primaryAction && (
            <div className="border-border bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5">
              {primaryAction}
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-foreground text-xs font-bold">
                Attachments ({localTask.attachments.length})
              </Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onFileSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 rounded-xl text-xs font-bold"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload file
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLinkForm((v) => !v)}
                  className="gap-1.5 rounded-xl text-xs font-bold"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Add link
                </Button>
              </div>
            </div>

            {showLinkForm && (
              <div className="border-border bg-muted/30 flex flex-wrap items-end gap-2 rounded-xl border p-2.5">
                <div className="min-w-[180px] flex-1 space-y-1">
                  <Label
                    htmlFor="linkUrl"
                    className="text-foreground text-[10px] font-bold"
                  >
                    URL *
                  </Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    placeholder="https://…"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="bg-card h-8 rounded-lg text-xs"
                  />
                </div>
                <div className="min-w-[140px] flex-1 space-y-1">
                  <Label
                    htmlFor="linkLabel"
                    className="text-foreground text-[10px] font-bold"
                  >
                    Label
                  </Label>
                  <Input
                    id="linkLabel"
                    placeholder="e.g. Case brief"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    className="bg-card h-8 rounded-lg text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!linkUrl.trim() || addingLink}
                  onClick={() => {
                    setAddingLink(true);
                    linkMutation.mutate(undefined, {
                      onSettled: () => setAddingLink(false)
                    });
                  }}
                  className="gap-1 rounded-lg text-xs font-bold"
                >
                  {addingLink ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Add
                </Button>
              </div>
            )}

            {localTask.attachments.length === 0 && (
              <p className="text-muted-foreground text-xs font-medium">
                No attachments yet.
              </p>
            )}
            <div className="space-y-1.5">
              {localTask.attachments.map((att) =>
                att.kind === "FILE" ? (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {att.fileName || "Attachment"}
                    </span>
                    <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
                      {att.uploadedBy?.fullName ?? ""} ·{" "}
                      {formatDate(att.createdAt)}
                    </span>
                  </a>
                ) : (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{att.label || att.fileUrl}</span>
                    <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
                      {att.uploadedBy?.fullName ?? ""} ·{" "}
                      {formatDate(att.createdAt)}
                    </span>
                  </a>
                )
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1.5 text-xs font-bold">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments ({localTask.notes.length})
            </Label>
            <div className="space-y-2">
              {localTask.notes.length === 0 && (
                <p className="text-muted-foreground text-xs font-medium">
                  No comments yet. Start the discussion.
                </p>
              )}
              {localTask.notes.map((n) => (
                <div
                  key={n.id}
                  className="border-border bg-muted/30 rounded-xl border px-3 py-2.5"
                >
                  <div className="text-muted-foreground flex items-center gap-2 text-[10px] font-bold">
                    <Avatar size="sm" title={n.author?.fullName ?? "?"}>
                      <AvatarFallback>
                        {getInitials(n.author?.fullName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground">
                      {n.author?.fullName ?? "Unknown"}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-foreground mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {n.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    submitNote();
                  }
                }}
                placeholder="Add a comment… (Ctrl/⌘ + Enter to post)"
                className="border-border bg-card text-foreground focus:border-primary w-full flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none"
              />
              <Button
                type="button"
                size="sm"
                disabled={!noteText.trim() || addingNote}
                onClick={submitNote}
                className="gap-1.5 rounded-xl text-sm font-bold"
              >
                {addingNote ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between gap-2 border-t pt-4">
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirmingDelete) {
                  deleteMutation.mutate();
                } else {
                  setConfirmingDelete(true);
                  setTimeout(() => setConfirmingDelete(false), 4000);
                }
              }}
              className={cn(
                "text-destructive hover:text-destructive gap-1.5 rounded-xl text-xs font-bold",
                confirmingDelete &&
                  "bg-destructive/10 border-destructive/30 border"
              )}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {confirmingDelete ? "Confirm delete?" : "Delete task"}
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-sm font-bold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
