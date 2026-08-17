"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SummaryStrip } from "../ui/summary-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  PieChart,
  Send,
  XCircle
} from "lucide-react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveType {
  id: string;
  name: string;
  annualAllotment: number;
  carriesForward: boolean;
}

interface LeaveBalance {
  id: string;
  associateId: string;
  leaveTypeId: string;
  year: number;
  allotted: number;
  used: number;
  leaveType?: { id: string; name: string } | null;
}

interface LeaveRequest {
  id: string;
  associateId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  approverId?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  leaveType?: { id: string; name: string } | null;
  associate?: { id: string; fullName: string; email: string | null } | null;
}

const applySchema = z
  .object({
    leaveTypeId: z.string().min(1, { message: "Select a leave type" }),
    startDate: z.string().min(1, { message: "Start date is required" }),
    endDate: z.string().min(1, { message: "End date is required" }),
    reason: z
      .string()
      .max(1000, { message: "Keep the reason under 1000 characters" })
      .optional()
  })
  .refine(
    (d) =>
      !d.startDate ||
      !d.endDate ||
      new Date(d.endDate).getTime() >= new Date(d.startDate).getTime(),
    {
      message: "End date must be on or after the start date",
      path: ["endDate"]
    }
  );

type ApplyValues = z.infer<typeof applySchema>;

const STATUS_BADGE: Record<LeaveStatus, "amber" | "emerald" | "destructive"> = {
  PENDING: "amber",
  APPROVED: "emerald",
  REJECTED: "destructive"
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function dayCount(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`).getTime();
  const e = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((e - s) / 86_400_000) + 1;
}

export function LeaveRequests({ userRole }: Readonly<{ userRole?: string }>) {
  const queryClient = useQueryClient();
  const isOwner = userRole === "OWNER";

  const { data: leaveTypes = [], isLoading: typesLoading } = useQuery<
    LeaveType[]
  >({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const res = await fetch("/api/leave/types");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<
    LeaveRequest[]
  >({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const res = await fetch("/api/leave");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: balances = [], isLoading: balancesLoading } = useQuery<
    LeaveBalance[]
  >({
    queryKey: ["leave-balances"],
    queryFn: async () => {
      const res = await fetch("/api/leave/balances");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: todayStr(),
      endDate: todayStr(),
      reason: ""
    }
  });

  const applyMutation = useMutation({
    mutationFn: async (values: ApplyValues) => {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: values.leaveTypeId,
          startDate: values.startDate,
          endDate: values.endDate,
          reason: values.reason?.trim() || undefined
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || "Failed to submit leave request");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Leave request submitted for approval");
      reset({
        leaveTypeId: "",
        startDate: todayStr(),
        endDate: todayStr(),
        reason: ""
      });
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit leave request");
    }
  });

  const decideMutation = useMutation({
    mutationFn: async ({
      id,
      status
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
    }) => {
      const res = await fetch(`/api/leave/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || "Failed to update leave request");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Leave request updated");
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update leave request");
    }
  });

  const onSubmit = (values: ApplyValues) => applyMutation.mutate(values);

  // OWNER balances are firm-wide; aggregate by leave type.
  const balanceRows = useMemo(() => {
    if (isOwner) {
      const map = new Map<
        string,
        { name: string; allotted: number; used: number }
      >();
      for (const b of balances) {
        const key = b.leaveTypeId;
        const name = b.leaveType?.name ?? "Leave";
        const entry = map.get(key) ?? { name, allotted: 0, used: 0 };
        entry.allotted += b.allotted;
        entry.used += b.used;
        map.set(key, entry);
      }
      return [...map.values()];
    }
    return balances.map((b) => ({
      name: b.leaveType?.name ?? "Leave",
      allotted: b.allotted,
      used: b.used
    }));
  }, [balances, isOwner]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* 1. Summary Metrics */}
      <SummaryStrip
        metrics={[
          {
            label: "Total Requests",
            value: stats.total
          },
          {
            label: "Pending",
            value: stats.pending,
            accentColor: "var(--warning)"
          },
          {
            label: "Approved",
            value: stats.approved,
            accentColor: "var(--success)"
          },
          {
            label: "Rejected",
            value: stats.rejected,
            accentColor: "var(--destructive)"
          }
        ]}
      />

      {/* Apply + Balances */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Apply form */}
        <Card className="skeuo-card bg-card text-card-foreground lg:col-span-2">
          <CardHeader className="border-border border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
              <CalendarDays className="text-primary h-4 w-4" />
              Apply for Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label
                  htmlFor="leaveTypeId"
                  className="text-foreground text-xs font-bold"
                >
                  Leave Type *
                </Label>
                <Controller
                  control={control}
                  name="leaveTypeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 rounded-xl font-semibold">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.annualAllotment} days/year)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.leaveTypeId && (
                  <p className="text-destructive text-xs font-semibold">
                    {errors.leaveTypeId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="startDate"
                    className="text-foreground text-xs font-bold"
                  >
                    Start Date *
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register("startDate")}
                    className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
                  />
                  {errors.startDate && (
                    <p className="text-destructive text-xs font-semibold">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="endDate"
                    className="text-foreground text-xs font-bold"
                  >
                    End Date *
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register("endDate")}
                    className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
                  />
                  {errors.endDate && (
                    <p className="text-destructive text-xs font-semibold">
                      {errors.endDate.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="reason"
                  className="text-foreground text-xs font-bold"
                >
                  Reason
                </Label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="Optional context for the firm owner…"
                  {...register("reason")}
                  className="border-border bg-card text-foreground focus:border-primary w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
                />
                {errors.reason && (
                  <p className="text-destructive text-xs font-semibold">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || typesLoading}
                className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Request</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Balances */}
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardHeader className="border-border border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
              <PieChart className="text-primary h-4 w-4" />
              {isOwner ? "Firm Leave Balances" : "My Leave Balances"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {balancesLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-4 text-xs font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading balances...
              </div>
            ) : balanceRows.length === 0 ? (
              <p className="text-muted-foreground py-4 text-xs font-medium">
                No leave balances have been configured for this firm yet.
              </p>
            ) : (
              balanceRows.map((b) => {
                const remaining = Math.max(0, b.allotted - b.used);
                return (
                  <div
                    key={b.name}
                    className="border-border/60 bg-muted/30 flex items-center justify-between rounded-xl border px-3 py-2.5"
                  >
                    <div>
                      <p className="text-foreground text-sm font-bold">
                        {b.name}
                      </p>
                      <p className="text-muted-foreground text-xs font-medium">
                        {b.allotted} allotted · {b.used} used
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-lg leading-none font-black">
                        {remaining}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px] font-semibold tracking-wide uppercase">
                        remaining
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requests list */}
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardHeader className="border-border flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
            <Clock className="text-primary h-4 w-4" />
            Leave Requests
          </CardTitle>
          <span className="text-muted-foreground text-xs font-semibold">
            {requests.length} total
          </span>
        </CardHeader>
        <CardContent className="p-4">
          {requestsLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="space-y-2 py-12 text-center">
              <CalendarDays className="text-muted-foreground/40 mx-auto h-10 w-10" />
              <p className="text-foreground text-sm font-bold">
                No leave requests yet
              </p>
              <p className="text-muted-foreground text-xs">
                {isOwner
                  ? "Associates' leave applications will appear here for approval."
                  : "Your leave applications will appear here."}
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {requests.map((req) => {
                const days = dayCount(req.startDate, req.endDate);
                return (
                  <li key={req.id} className="py-3.5">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground text-sm font-black">
                            {req.leaveType?.name ?? "Leave"}
                          </span>
                          <Badge
                            variant={STATUS_BADGE[req.status]}
                            className="px-2 py-0.5 text-xs font-bold uppercase"
                          >
                            {STATUS_LABEL[req.status]}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs font-medium">
                          {formatDate(req.startDate)} →{" "}
                          {formatDate(req.endDate)}
                          <span className="font-bold">
                            {" "}
                            · {days} day{days > 1 ? "s" : ""}
                          </span>
                          {req.associate?.fullName &&
                            ` · ${req.associate.fullName}`}
                        </p>
                        {req.reason && (
                          <p className="text-foreground bg-card border-border/50 mt-1.5 inline-block rounded-lg border px-2 py-1 text-xs font-semibold">
                            {req.reason}
                          </p>
                        )}
                      </div>

                      {isOwner && req.status === "PENDING" && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              decideMutation.mutate({
                                id: req.id,
                                status: "REJECTED"
                              })
                            }
                            disabled={decideMutation.isPending}
                            className="border-border h-8 gap-1 rounded-xl text-xs font-bold"
                          >
                            <XCircle className="text-destructive h-3.5 w-3.5" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              decideMutation.mutate({
                                id: req.id,
                                status: "APPROVED"
                              })
                            }
                            disabled={decideMutation.isPending}
                            className="skeuo-button-primary h-8 gap-1 rounded-xl text-xs font-bold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
