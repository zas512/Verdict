"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gavel,
  GitBranch,
  Loader2
} from "lucide-react";
import { useMemo } from "react";

interface TimelineEvent {
  date: string;
  type: "HEARING" | "TASK_COMPLETED" | "DOCUMENT_UPLOADED" | "STAGE_CHANGE";
  data: {
    purpose?: string;
    hearingDate?: string;
    status?: string;
    proceedingsSummary?: string | null;
    nextDate?: string | null;
    nextPurpose?: string | null;
    orderSheetUrl?: string | null;
    title?: string;
    completionNotes?: string | null;
    taskType?: string | null;
    priority?: string;
    changeNotes?: string | null;
    versionNumber?: number;
    fileUrl?: string;
    beforeState?: { currentStageId?: string | null } | null;
    afterState?: { currentStageId?: string | null } | null;
  };
}

interface CourtStage {
  id: string;
  name: string;
}

interface MatterTimelineProps {
  id: string;
}

export function MatterTimeline({ id }: Readonly<MatterTimelineProps>) {
  // 1. Fetch Timeline Events
  const {
    data: events = [],
    isLoading,
    error
  } = useQuery<TimelineEvent[]>({
    queryKey: ["matter-timeline", id],
    queryFn: async () => {
      const res = await fetch(`/api/matters/${id}/timeline`);
      if (!res.ok) {
        throw new Error("Failed to load timeline");
      }
      return res.json();
    }
  });

  // 2. Fetch Court Stages (lookup to resolve stage change IDs to names)
  const { data: stages = [] } = useQuery<CourtStage[]>({
    queryKey: ["court-stages"],
    queryFn: async () => {
      const res = await fetch("/api/matters/stages");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const stageMap = useMemo(() => {
    return new Map(stages.map((s) => [s.id, s.name]));
  }, [stages]);

  // Format Date
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "HEARING":
        return (
          <div className="bg-primary/10 border-primary/20 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
            <Gavel className="h-4 w-4" />
          </div>
        );
      case "TASK_COMPLETED":
        return (
          <div className="bg-success/10 border-success/20 text-success flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case "DOCUMENT_UPLOADED":
        return (
          <div className="bg-violet/10 border-violet/20 text-violet flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
            <FileText className="h-4 w-4" />
          </div>
        );
      case "STAGE_CHANGE":
        return (
          <div className="bg-warning/10 border-warning/20 text-warning flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
            <GitBranch className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <Calendar className="h-4 w-4" />
          </div>
        );
    }
  };

  const renderEventDetails = (event: TimelineEvent) => {
    const { type, data } = event;

    switch (type) {
      case "HEARING":
        return (
          <div className="space-y-1">
            <p className="text-foreground text-sm font-bold">
              Hearing Outcome Logged:{" "}
              <span className="text-primary">{data.purpose}</span>
            </p>
            {data.proceedingsSummary && (
              <p className="text-muted-foreground bg-muted/30 border-border/50 mt-1 rounded-lg border p-2 text-sm italic">
                &ldquo;{data.proceedingsSummary}&rdquo;
              </p>
            )}
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
              <span>
                Status:{" "}
                <strong className="text-foreground uppercase">
                  {data.status}
                </strong>
              </span>
              {data.nextDate && (
                <span className="text-primary font-bold">
                  Next Date (Tareekh):{" "}
                  {new Date(data.nextDate).toLocaleDateString()}
                  {data.nextPurpose && ` (${data.nextPurpose})`}
                </span>
              )}
              {data.orderSheetUrl && (
                <a
                  href={data.orderSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  <span>Order Sheet</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        );

      case "TASK_COMPLETED":
        return (
          <div className="space-y-1">
            <p className="text-foreground text-sm font-bold">
              Task Completed: <span className="text-success">{data.title}</span>
            </p>
            {data.completionNotes && (
              <p className="text-muted-foreground bg-success/5 border-success/10 mt-1 rounded-lg border p-2 text-sm italic">
                Notes: &ldquo;{data.completionNotes}&rdquo;
              </p>
            )}
            <div className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
              <span className="bg-muted rounded px-1.5 py-0.5 font-semibold uppercase">
                {data.taskType || "TASK"}
              </span>
              <span>
                Priority:{" "}
                <strong className="text-foreground">{data.priority}</strong>
              </span>
            </div>
          </div>
        );

      case "DOCUMENT_UPLOADED":
        return (
          <div className="space-y-1">
            <p className="text-foreground text-sm font-bold">
              Document Version Uploaded:{" "}
              <span className="text-violet">v{data.versionNumber}</span>
            </p>
            {data.changeNotes && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                Notes: {data.changeNotes}
              </p>
            )}
            <div className="pt-1">
              <a
                href={data.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs font-bold hover:underline"
              >
                <span>Download / Preview File</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        );

      case "STAGE_CHANGE": {
        const oldStageId = data.beforeState?.currentStageId;
        const newStageId = data.afterState?.currentStageId;
        const oldName =
          (oldStageId ? stageMap.get(oldStageId) : undefined) ||
          "Initial Filing";
        const newName =
          (newStageId ? stageMap.get(newStageId) : undefined) || "Decided";
        return (
          <div className="space-y-1">
            <p className="text-foreground text-sm font-bold">
              Procedural Stage Transitioned
            </p>
            <div className="flex items-center gap-2 py-1 text-sm">
              <span className="text-muted-foreground bg-muted/40 border-border/40 max-w-50 truncate rounded-lg border px-2 py-1">
                {oldName}
              </span>
              <ArrowRight className="text-primary h-3.5 w-3.5 shrink-0 animate-pulse" />
              <span className="text-primary bg-primary/5 border-primary/10 max-w-50 truncate rounded-lg border px-2 py-1 font-bold">
                {newName}
              </span>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 p-12">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
          Aggregating timeline events...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-8 text-center text-sm font-semibold">
        Failed to load timeline: {error.message}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-border bg-card text-card-foreground border-2 border-dashed p-12 text-center">
        <GitBranch className="text-muted-foreground/60 mx-auto h-10 w-10" />
        <p className="text-foreground mt-2 text-base font-bold">
          No activity recorded
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          This matter does not have any log events yet.
        </p>
      </Card>
    );
  }

  // Reverse timeline to show most recent first
  const sortedEvents = [...events].reverse();

  return (
    <div className="border-border/80 relative ml-4 space-y-6 border-l py-2 pl-6">
      {sortedEvents.map((event, index) => (
        <div key={index} className="relative">
          {/* Dot Indicator */}
          <div className="bg-background absolute top-1.5 -left-9.75 shrink-0 px-1 py-0.5">
            {getEventIcon(event.type)}
          </div>

          {/* Card Wrapper */}
          <Card className="skeuo-card bg-card text-card-foreground">
            <CardContent className="p-4">
              <div className="text-muted-foreground border-border/40 mb-2 flex items-center justify-between border-b pb-2 text-xs">
                <span className="text-primary font-bold tracking-wider uppercase">
                  {event.type.replace("_", " ")}
                </span>
                <span className="font-semibold">
                  {formatDateTime(event.date)}
                </span>
              </div>
              {renderEventDetails(event)}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
