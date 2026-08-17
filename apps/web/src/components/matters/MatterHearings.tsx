"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table } from "@/components/table";
import type { ColumnConfig } from "@/types/tableTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Gavel, Loader2, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// Log Outcome Schema
const logOutcomeSchema = z.object({
  status: z.enum(["HELD", "ADJOURNED", "SINE_DIE", "DECIDED"]),
  proceedingsSummary: z
    .string()
    .min(5, { message: "Proceedings summary must be at least 5 characters" }),
  orderSheetUrl: z.string().optional(),
  nextDate: z.string().optional(),
  nextPurpose: z.string().optional(),
  attendeeAssociateIds: z.array(z.string()).optional()
});

type LogOutcomeValues = z.infer<typeof logOutcomeSchema>;

// Schedule Hearing Schema
const scheduleHearingSchema = z.object({
  hearingDate: z.string().min(1, { message: "Hearing date is required" }),
  purpose: z
    .string()
    .min(3, { message: "Purpose must be at least 3 characters" }),
  presidingJudge: z.string().optional(),
  attendeeAssociateIds: z.array(z.string()).optional()
});

type ScheduleHearingValues = z.infer<typeof scheduleHearingSchema>;

interface Associate {
  id: string;
  name?: string | null;
  email: string;
}

interface Hearing {
  id: string;
  matterId: string;
  hearingDate: string;
  purpose: string;
  presidingJudge?: string | null;
  proceedingsSummary?: string | null;
  orderSheetUrl?: string | null;
  nextDate?: string | null;
  nextPurpose?: string | null;
  status: "SCHEDULED" | "HELD" | "ADJOURNED" | "SINE_DIE" | "DECIDED";
  createdById: string;
  createdAt: string;
  attendees: Array<{
    id: string;
    hearingId: string;
    associateId: string;
  }>;
}

interface MatterHearingsProps {
  id: string;
  userRole: string | undefined;
}

export function MatterHearings({
  id,
  userRole
}: Readonly<MatterHearingsProps>) {
  const queryClient = useQueryClient();
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const canEdit = userRole === "OWNER" || userRole === "ASSOCIATE";

  // 1. Fetch Hearings list
  const {
    data: hearings = [],
    isLoading,
    refetch,
    isRefetching
  } = useQuery<Hearing[]>({
    queryKey: ["matter-hearings", id],
    queryFn: async () => {
      const res = await fetch(`/api/matters/${id}/hearings`);
      if (!res.ok) {
        throw new Error("Failed to fetch hearings");
      }
      return res.json();
    }
  });

  // 2. Fetch Associates for attendee check listing
  const { data: associates = [] } = useQuery<Associate[]>({
    queryKey: ["associates"],
    queryFn: async () => {
      const res = await fetch("/api/associates");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const associateMap = useMemo(() => {
    return new Map(associates.map((a) => [a.id, a.name || a.email]));
  }, [associates]);

  const upcomingColumns: ColumnConfig<Hearing>[] = [
    {
      key: "hearingDate",
      header: "Court Date",
      sortable: true,
      accessor: (h) => new Date(h.hearingDate),
      render: (h) => (
        <span className="text-foreground font-bold">
          {new Date(h.hearingDate).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </span>
      )
    },
    {
      key: "purpose",
      header: "Purpose",
      sortable: true,
      accessor: (h) => h.purpose,
      render: (h) => (
        <span className="text-muted-foreground font-semibold">{h.purpose}</span>
      )
    },
    {
      key: "presidingJudge",
      header: "Presiding Judge",
      sortable: true,
      accessor: (h) => h.presidingJudge ?? "",
      render: (h) => (
        <span className="text-muted-foreground font-semibold">
          {h.presidingJudge || "N/A"}
        </span>
      )
    },
    {
      key: "attendees",
      header: "Attendees",
      render: (h) => (
        <div className="flex max-w-50 flex-wrap gap-1">
          {h.attendees.map((att) => (
            <Badge
              key={att.id}
              variant="outline"
              className="px-1.5 py-0 text-xs font-semibold"
            >
              {associateMap.get(att.associateId) || "Counsel"}
            </Badge>
          ))}
          {h.attendees.length === 0 && (
            <span className="text-muted-foreground text-xs">None</span>
          )}
        </div>
      )
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "Action",
            align: "right" as const,
            render: (h: Hearing) => (
              <div className="text-right">
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => openLogDialog(h)}
                  className="rounded-xl px-2 py-1 text-xs font-bold"
                >
                  Log Outcome
                </Button>
              </div>
            )
          }
        ]
      : [])
  ];

  const pastColumns: ColumnConfig<Hearing>[] = [
    {
      key: "hearingDate",
      header: "Court Date",
      sortable: true,
      accessor: (h) => new Date(h.hearingDate),
      render: (h) => (
        <span className="text-foreground font-semibold">
          {new Date(h.hearingDate).toLocaleDateString()}
        </span>
      )
    },
    {
      key: "purpose",
      header: "Purpose",
      sortable: true,
      accessor: (h) => h.purpose,
      render: (h) => (
        <span className="text-muted-foreground font-semibold">{h.purpose}</span>
      )
    },
    {
      key: "status",
      header: "Outcome Status",
      sortable: true,
      accessor: (h) => h.status,
      render: (h) => (
        <Badge
          variant={
            h.status === "HELD"
              ? "emerald"
              : h.status === "DECIDED"
                ? "amber"
                : "destructive"
          }
          className="text-xs font-bold uppercase"
        >
          {h.status}
        </Badge>
      )
    },
    {
      key: "proceedingsSummary",
      header: "Proceedings Summary",
      render: (h) => (
        <span
          className="text-muted-foreground block max-w-62.5 truncate font-medium italic"
          title={h.proceedingsSummary ?? ""}
        >
          {h.proceedingsSummary || "N/A"}
        </span>
      )
    },
    {
      key: "nextDate",
      header: "Next Hearing Date",
      sortable: true,
      accessor: (h) => (h.nextDate ? new Date(h.nextDate) : null),
      render: (h) =>
        h.nextDate ? (
          <div className="flex items-center gap-1">
            <span className="text-primary font-bold">
              {new Date(h.nextDate).toLocaleDateString()}
            </span>
            {h.nextPurpose && (
              <span className="text-muted-foreground text-xs">
                ({h.nextPurpose})
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground font-semibold">
            None (Sine Die / Decided)
          </span>
        )
    },
    {
      key: "orderSheetUrl",
      header: "Docs",
      align: "center",
      render: (h) =>
        h.orderSheetUrl ? (
          <a
            href={h.orderSheetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:bg-primary/10 border-border inline-flex h-8 w-8 items-center justify-center rounded-full border"
            title="View Order Sheet"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-muted-foreground/60 text-sm font-bold">-</span>
        )
    }
  ];

  // Log Outcome Form
  const {
    register: registerLog,
    handleSubmit: handleSubmitLog,
    reset: resetLog,
    setValue: setValueLog,
    watch: watchLog,
    control: controlLog,
    formState: { errors: errorsLog, isSubmitting: isSubmittingLog }
  } = useForm<LogOutcomeValues>({
    resolver: zodResolver(logOutcomeSchema),
    defaultValues: {
      status: "HELD",
      proceedingsSummary: "",
      orderSheetUrl: "",
      nextDate: "",
      nextPurpose: "",
      attendeeAssociateIds: []
    }
  });

  const selectedLogAttendees = watchLog("attendeeAssociateIds") || [];

  // Schedule Hearing Form
  const {
    register: registerSched,
    handleSubmit: handleSubmitSched,
    reset: resetSched,
    setValue: setValueSched,
    watch: watchSched,
    formState: { errors: errorsSched, isSubmitting: isSubmittingSched }
  } = useForm<ScheduleHearingValues>({
    resolver: zodResolver(scheduleHearingSchema),
    defaultValues: {
      hearingDate: "",
      purpose: "",
      presidingJudge: "",
      attendeeAssociateIds: []
    }
  });

  const selectedSchedAttendees = watchSched("attendeeAssociateIds") || [];

  // Log Outcome Mutation
  const logMutation = useMutation({
    mutationFn: async (values: LogOutcomeValues) => {
      if (!selectedHearing) return;
      const payload = {
        ...values,
        nextDate: values.nextDate
          ? new Date(values.nextDate).toISOString()
          : null,
        nextPurpose: values.nextPurpose || null,
        orderSheetUrl: values.orderSheetUrl || null,
        attendeeAssociateIds: values.attendeeAssociateIds?.length
          ? values.attendeeAssociateIds
          : undefined
      };
      const res = await fetch(`/api/hearings/${selectedHearing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to log outcome");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Hearing outcome logged and registered successfully.");
      resetLog();
      setIsLogOpen(false);
      setSelectedHearing(null);
      void queryClient.invalidateQueries({ queryKey: ["matter-hearings", id] });
      void queryClient.invalidateQueries({ queryKey: ["matter-timeline", id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to log outcome");
    }
  });

  // Schedule Mutation
  const scheduleMutation = useMutation({
    mutationFn: async (values: ScheduleHearingValues) => {
      const payload = {
        ...values,
        hearingDate: new Date(values.hearingDate).toISOString(),
        attendeeAssociateIds: values.attendeeAssociateIds?.length
          ? values.attendeeAssociateIds
          : undefined
      };
      const res = await fetch(`/api/matters/${id}/hearings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to schedule hearing");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("New court hearing scheduled successfully.");
      resetSched();
      setIsScheduleOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["matter-hearings", id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to schedule hearing");
    }
  });

  const onLogSubmit = (values: LogOutcomeValues) => {
    logMutation.mutate(values);
  };

  const onSchedSubmit = (values: ScheduleHearingValues) => {
    scheduleMutation.mutate(values);
  };

  const handleAttendeeToggleLog = (assocId: string) => {
    const current = [...selectedLogAttendees];
    const idx = current.indexOf(assocId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(assocId);
    }
    setValueLog("attendeeAssociateIds", current);
  };

  const handleAttendeeToggleSched = (assocId: string) => {
    const current = [...selectedSchedAttendees];
    const idx = current.indexOf(assocId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(assocId);
    }
    setValueSched("attendeeAssociateIds", current);
  };

  const openLogDialog = (hearing: Hearing) => {
    setSelectedHearing(hearing);
    resetLog();
    setValueLog(
      "attendeeAssociateIds",
      hearing.attendees.map((a) => a.associateId)
    );
    setIsLogOpen(true);
  };

  // Split hearings
  const upcomingHearings = useMemo(() => {
    return hearings
      .filter((h) => h.status === "SCHEDULED")
      .sort(
        (a, b) =>
          new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime()
      );
  }, [hearings]);

  const pastHearings = useMemo(() => {
    return hearings
      .filter((h) => h.status !== "SCHEDULED")
      .sort(
        (a, b) =>
          new Date(b.hearingDate).getTime() - new Date(a.hearingDate).getTime()
      );
  }, [hearings]);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            Court Hearings Ledger
          </h3>
          <p className="text-muted-foreground text-sm font-medium">
            Log courtroom proceedings outcome and maintain next-date
            (Tareekh-e-Pesh) updates.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              onClick={() => setIsScheduleOpen(true)}
              className="skeuo-button-primary gap-1 rounded-xl text-sm font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Hearing</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-border rounded-xl text-sm font-semibold"
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Upcoming Hearings */}
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardHeader className="border-border/60 border-b pb-3">
          <CardTitle className="text-primary flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
            <Clock className="h-4 w-4" />
            <span>Upcoming Scheduled Hearings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={upcomingColumns}
            data={upcomingHearings}
            rowKey={(h) => h.id}
            isLoading={isLoading}
            loadingLabel="Fetching scheduled court dates..."
            emptyTitle="No upcoming hearings scheduled."
            emptyDescription="Use &ldquo;Schedule Hearing&rdquo; to add one."
            caption="Upcoming court hearings"
            pageSize={5}
          />
        </CardContent>
      </Card>

      {/* Past Hearings */}
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardHeader className="border-border/60 border-b pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
            <Gavel className="h-4 w-4" />
            <span>Past Hearings Proceedings History</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={pastColumns}
            data={pastHearings}
            rowKey={(h) => h.id}
            isLoading={isLoading}
            loadingLabel="Fetching historical proceedings..."
            emptyTitle="No historical proceedings recorded for this matter."
            emptyDescription="Historical court hearings will appear here."
            caption="Past court hearings"
            pageSize={5}
          />
        </CardContent>
      </Card>

      {/* Log Outcome Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] max-w-xl overflow-y-auto rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-black">
              Log Proceedings & Outcomes
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Submit courtroom outcomes. Entering a next date will auto-schedule
              the next date (Tareekh-e-Pesh).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitLog(onLogSubmit)}
            className="space-y-4 py-2"
          >
            {/* Status Select */}
            <div className="space-y-1">
              <Label
                htmlFor="status"
                className="text-foreground text-xs font-bold"
              >
                Hearing Outcome Status *
              </Label>
              <Controller
                control={controlLog}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 rounded-xl font-semibold">
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HELD">Held / Proceeded</SelectItem>
                      <SelectItem value="ADJOURNED">
                        Adjourned / Postponed
                      </SelectItem>
                      <SelectItem value="SINE_DIE">
                        Adjourned Sine Die (Indefinitely)
                      </SelectItem>
                      <SelectItem value="DECIDED">
                        Decided / Judgment Reserved
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Proceedings Summary */}
            <div className="space-y-1">
              <Label
                htmlFor="proceedingsSummary"
                className="text-foreground text-xs font-bold"
              >
                Proceedings Summary *
              </Label>
              <textarea
                id="proceedingsSummary"
                placeholder="Log details of argument, witness statement, issues framed..."
                rows={3}
                {...registerLog("proceedingsSummary")}
                className="border-border bg-card text-foreground focus:border-primary focus-visible:ring-primary/40 w-full resize-none rounded-xl border p-3 text-sm font-medium outline-none"
              />
              {errorsLog.proceedingsSummary && (
                <p className="text-destructive text-xs font-semibold">
                  {errorsLog.proceedingsSummary.message}
                </p>
              )}
            </div>

            {/* Order Sheet URL */}
            <div className="space-y-1">
              <Label
                htmlFor="orderSheetUrl"
                className="text-foreground text-xs font-bold"
              >
                Court Order Sheet Link (URL)
              </Label>
              <Input
                id="orderSheetUrl"
                placeholder="e.g. https://storage.lga.dev/orders/order-sheet.pdf"
                {...registerLog("orderSheetUrl")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
            </div>

            {/* Next Date & Purpose (Tareekh-e-Pesh Engine) */}
            <div className="border-border/80 bg-muted/10 grid grid-cols-2 gap-4 rounded-xl border p-3">
              <div className="space-y-1">
                <Label
                  htmlFor="nextDate"
                  className="text-foreground text-xs font-bold"
                >
                  Next Court Date (Tareekh)
                </Label>
                <Input
                  id="nextDate"
                  type="date"
                  {...registerLog("nextDate")}
                  className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="nextPurpose"
                  className="text-foreground text-xs font-bold"
                >
                  Next Date Purpose
                </Label>
                <Input
                  id="nextPurpose"
                  placeholder="e.g. Replication / Arguments"
                  {...registerLog("nextPurpose")}
                  className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Attendance checklist */}
            <div className="space-y-2">
              <p
                id="logAttendeesLabel"
                className="text-foreground flex items-center gap-1 text-xs font-bold"
              >
                <Users className="text-primary h-3.5 w-3.5" />
                <span>Log Attending Associates</span>
              </p>
              <div
                role="group"
                aria-labelledby="logAttendeesLabel"
                className="border-border bg-muted/20 grid max-h-30 grid-cols-2 gap-2 overflow-y-auto rounded-xl border p-3"
              >
                {associates.map((assoc) => {
                  const isChecked = selectedLogAttendees.includes(assoc.id);
                  return (
                    <div
                      key={assoc.id}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      aria-label={assoc.name || assoc.email}
                      onClick={() => handleAttendeeToggleLog(assoc.id)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          handleAttendeeToggleLog(assoc.id);
                        }
                      }}
                      className={`focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm font-semibold transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-primary pointer-events-none rounded"
                      />
                      <span className="truncate leading-tight">
                        {assoc.name || assoc.email}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsLogOpen(false);
                  setSelectedHearing(null);
                }}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingLog}
                className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
              >
                {isSubmittingLog ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Log Proceedings</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Hearing Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] max-w-xl overflow-y-auto rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-black">
              Schedule Court Hearing
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Formally schedule an upcoming hearing date in the court ledger.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitSched(onSchedSubmit)}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Hearing Date */}
              <div className="space-y-1">
                <Label
                  htmlFor="hearingDate"
                  className="text-foreground text-xs font-bold"
                >
                  Hearing Date & Time *
                </Label>
                <Input
                  id="hearingDate"
                  type="datetime-local"
                  {...registerSched("hearingDate")}
                  className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
                />
                {errorsSched.hearingDate && (
                  <p className="text-destructive text-xs font-semibold">
                    {errorsSched.hearingDate.message}
                  </p>
                )}
              </div>

              {/* Presiding Judge */}
              <div className="space-y-1">
                <Label
                  htmlFor="presidingJudge"
                  className="text-foreground text-xs font-bold"
                >
                  Presiding Judge
                </Label>
                <Input
                  id="presidingJudge"
                  placeholder="e.g. Judge West Division"
                  {...registerSched("presidingJudge")}
                  className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <Label className="text-foreground text-xs font-bold">
                Hearing Purpose *
              </Label>
              <Input
                id="purpose"
                placeholder="e.g. Replication / Framing of Issues / Cross Exam"
                {...registerSched("purpose")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errorsSched.purpose && (
                <p className="text-destructive text-xs font-semibold">
                  {errorsSched.purpose.message}
                </p>
              )}
            </div>

            {/* Assign Attendees checklist */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1 text-xs font-bold">
                <Users className="text-primary h-3.5 w-3.5" />
                <span>Assign Counsel to Attend</span>
              </Label>
              <div className="border-border bg-muted/20 grid max-h-30 grid-cols-2 gap-2 overflow-y-auto rounded-xl border p-3">
                {associates.map((assoc) => {
                  const isChecked = selectedSchedAttendees.includes(assoc.id);
                  return (
                    <div
                      key={assoc.id}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      aria-label={assoc.name || assoc.email}
                      onClick={() => handleAttendeeToggleSched(assoc.id)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          handleAttendeeToggleSched(assoc.id);
                        }
                      }}
                      className={`focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm font-semibold transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-primary pointer-events-none rounded"
                      />
                      <span className="truncate leading-tight">
                        {assoc.name || assoc.email}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetSched();
                  setIsScheduleOpen(false);
                }}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingSched}
                className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
              >
                {isSubmittingSched ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <span>Schedule Hearing</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
