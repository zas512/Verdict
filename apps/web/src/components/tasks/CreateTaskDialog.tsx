"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { TASK_TYPE_LABEL, type AssociateOption, type TaskType } from "./types";

const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Task title must be at least 3 characters" }),
  description: z
    .string()
    .max(500, { message: "Keep the description under 500 characters" })
    .optional(),
  taskType: z.enum([
    "DOCUMENT_FILING",
    "PRINTING_BINDING",
    "CLIENT_FOLLOWUP",
    "WITNESS_BRIEFING",
    "LEGAL_RESEARCH",
    "OTHER"
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.string().min(1, { message: "Due date is required" }),
  estimatedHours: z
    .number({ message: "Enter a valid number" })
    .min(0, { message: "Hours cannot be negative" })
    .max(999, { message: "Hours look too high" })
    .optional(),
  assignedToIds: z
    .array(z.string())
    .min(1, { message: "Assign at least one associate" })
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

interface MatterOption {
  id: string;
  firmCaseNumber: string;
  clientName: string;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matterId?: string | null;
  userRole?: string;
  currentUserEmail?: string | null;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  matterId = null,
  userRole,
  currentUserEmail
}: Readonly<CreateTaskDialogProps>) {
  const queryClient = useQueryClient();
  const isAdmin = userRole === "OWNER";

  // Independent vs matter-linked. When opened from a matter page the task is
  // locked to that matter.
  const [linkedToMatter, setLinkedToMatter] = useState(Boolean(matterId));
  const [selectedMatterId, setSelectedMatterId] = useState("");
  const [matterError, setMatterError] = useState<string | null>(null);

  // Task assignment references the HR Associate table (not user accounts), so
  // this endpoint is the correct roster source. For an associate it returns
  // only themselves, matching the backend self-assign rule.
  const { data: allAssociates = [] } = useQuery<AssociateOption[]>({
    queryKey: ["task-assignees"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/assignees");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  const { data: allMatters = [] } = useQuery<MatterOption[]>({
    queryKey: ["matters"],
    queryFn: async () => {
      const res = await fetch("/api/matters");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !matterId
  });

  const callerAssociateId = useMemo(
    () =>
      allAssociates.find((a) => a.email === currentUserEmail)?.id ?? undefined,
    [allAssociates, currentUserEmail]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "DOCUMENT_FILING",
      priority: "MEDIUM",
      dueDate: todayStr(),
      estimatedHours: undefined,
      assignedToIds: []
    }
  });

  const selectedAssigneeIds: string[] = watch("assignedToIds") ?? [];

  // Pre-assign the caller to themselves for associates (backend enforces this
  // too); admins start with no assignee selected.
  useEffect(() => {
    if (!open) return;
    setLinkedToMatter(Boolean(matterId));
    setSelectedMatterId(matterId ?? "");
    setMatterError(null);
    if (isAdmin) {
      setValue("assignedToIds", []);
    } else if (callerAssociateId) {
      setValue("assignedToIds", [callerAssociateId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matterId, isAdmin, callerAssociateId]);

  const toggleAssignee = (id: string) => {
    if (!isAdmin) return; // associates can only self-assign
    const next = selectedAssigneeIds.includes(id)
      ? selectedAssigneeIds.filter((x) => x !== id)
      : [...selectedAssigneeIds, id];
    setValue("assignedToIds", next, { shouldValidate: true });
  };

  const createMutation = useMutation({
    mutationFn: async (values: CreateTaskValues) => {
      const linked = matterId ? true : linkedToMatter;
      const finalMatterId = matterId ?? (linked ? selectedMatterId : undefined);
      if (linked && !finalMatterId) {
        setMatterError("Select the matter this task relates to");
        throw new Error("Select the matter this task relates to");
      }
      setMatterError(null);

      const payload = {
        title: values.title,
        description: values.description?.trim() || undefined,
        matterId: finalMatterId || undefined,
        taskType: values.taskType,
        priority: values.priority,
        dueDate: new Date(values.dueDate).toISOString(),
        estimatedHours: values.estimatedHours ?? undefined,
        assignedToIds: values.assignedToIds
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || "Failed to create task");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Task created");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (matterId) {
        void queryClient.invalidateQueries({
          queryKey: ["matter-timeline", matterId]
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create task");
    }
  });

  const onSubmit = (values: CreateTaskValues) => createMutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[88vh] max-w-xl overflow-y-auto rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-black">
            {matterId ? "Delegate a Task" : "Create a Task"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Assign work to one or more associates — standalone or tied to a case
            or matter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Independent / Matter-linked toggle (hidden when locked to a matter) */}
          {!matterId && (
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs font-bold">
                Task Type *
              </Label>
              <div
                role="group"
                aria-label="Task type"
                className="bg-muted/40 grid grid-cols-2 gap-1 rounded-xl p-1"
              >
                <button
                  type="button"
                  aria-pressed={!linkedToMatter}
                  onClick={() => setLinkedToMatter(false)}
                  className={cn(
                    "h-9 cursor-pointer rounded-lg text-xs font-bold transition-colors",
                    !linkedToMatter
                      ? "bg-card text-foreground border-border border shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Independent Task
                </button>
                <button
                  type="button"
                  aria-pressed={linkedToMatter}
                  onClick={() => setLinkedToMatter(true)}
                  className={cn(
                    "h-9 cursor-pointer rounded-lg text-xs font-bold transition-colors",
                    linkedToMatter
                      ? "bg-card text-foreground border-border border shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" />
                    Related to a Matter
                  </span>
                </button>
              </div>
              <p className="text-muted-foreground text-[11px] font-medium">
                {linkedToMatter
                  ? "The task will appear on the matter's task board."
                  : "A standalone task not tied to any case."}
              </p>
            </div>
          )}

          {/* Matter picker when linked */}
          {(matterId || linkedToMatter) && (
            <div className="space-y-1">
              <Label
                htmlFor="taskMatter"
                className="text-foreground text-xs font-bold"
              >
                Related Matter *
              </Label>
              {matterId ? (
                <p className="border-border bg-muted/40 text-muted-foreground flex h-9 items-center rounded-xl border px-3 text-sm font-semibold">
                  This task is locked to this matter.
                </p>
              ) : (
                <>
                  <Select
                    value={selectedMatterId}
                    onValueChange={setSelectedMatterId}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 rounded-xl font-semibold",
                        matterError && "border-destructive"
                      )}
                    >
                      <SelectValue placeholder="Select a matter" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMatters.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firmCaseNumber} — {m.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {matterError && (
                    <p className="text-destructive text-xs font-semibold">
                      {matterError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <Label
              htmlFor="taskTitle"
              className="text-foreground text-xs font-bold"
            >
              Title *
            </Label>
            <Input
              id="taskTitle"
              placeholder="e.g. Draft the appeal grounds"
              {...register("title")}
              className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
            />
            {errors.title && (
              <p className="text-destructive text-xs font-semibold">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label
              htmlFor="taskDescription"
              className="text-foreground text-xs font-bold"
            >
              Description
            </Label>
            <textarea
              id="taskDescription"
              rows={3}
              placeholder="Context, deliverables, or acceptance criteria…"
              {...register("description")}
              className="border-border bg-card text-foreground focus:border-primary w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
            />
            {errors.description && (
              <p className="text-destructive text-xs font-semibold">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-xs font-bold">
              Assignees *
            </Label>
            <div className="flex flex-wrap gap-2">
              {allAssociates.length === 0 && (
                <p className="text-muted-foreground text-xs font-medium">
                  No associates in the firm roster.
                </p>
              )}
              {allAssociates.map((assoc) => {
                const name = assoc.name || assoc.email;
                const selected = selectedAssigneeIds.includes(assoc.id);
                return (
                  <button
                    key={assoc.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!isAdmin}
                    onClick={() => toggleAssignee(assoc.id)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                      "focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
                      selected
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      !isAdmin && !selected && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {errors.assignedToIds && (
              <p className="text-destructive text-xs font-semibold">
                {errors.assignedToIds.message}
              </p>
            )}
            {!isAdmin && (
              <p className="text-muted-foreground text-[11px] font-medium">
                As an associate you can only assign tasks to yourself.
              </p>
            )}
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="taskType"
                className="text-foreground text-xs font-bold"
              >
                Task Type
              </Label>
              <Controller
                control={control}
                name="taskType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 rounded-xl font-semibold">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TASK_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="taskPriority"
                className="text-foreground text-xs font-bold"
              >
                Priority
              </Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 rounded-xl font-semibold">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Due date + Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="taskDueDate"
                className="text-foreground text-xs font-bold"
              >
                Due Date *
              </Label>
              <Input
                id="taskDueDate"
                type="date"
                {...register("dueDate")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errors.dueDate && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="taskHours"
                className="text-foreground text-xs font-bold"
              >
                Estimated Hours
              </Label>
              <Input
                id="taskHours"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 4"
                {...register("estimatedHours", {
                  setValueAs: (v) =>
                    v === "" || v === undefined ? undefined : Number(v)
                })}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl font-mono text-sm"
              />
              {errors.estimatedHours && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.estimatedHours.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="rounded-xl text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
