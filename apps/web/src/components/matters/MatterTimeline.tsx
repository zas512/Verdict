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
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Gavel className="h-4 w-4" />
          </div>
        );
      case "TASK_COMPLETED":
        return (
          <div className="h-8 w-8 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case "DOCUMENT_UPLOADED":
        return (
          <div className="h-8 w-8 rounded-full bg-violet/10 border border-violet/20 text-violet flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </div>
        );
      case "STAGE_CHANGE":
        return (
          <div className="h-8 w-8 rounded-full bg-warning/10 border border-warning/20 text-warning flex items-center justify-center shrink-0">
            <GitBranch className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
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
            <p className="text-sm font-bold text-foreground">
              Hearing Outcome Logged:{" "}
              <span className="text-primary">{data.purpose}</span>
            </p>
            {data.proceedingsSummary && (
              <p className="text-sm text-muted-foreground bg-muted/30 border border-border/50 p-2 rounded-lg mt-1 italic">
                &ldquo;{data.proceedingsSummary}&rdquo;
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
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
                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
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
            <p className="text-sm font-bold text-foreground">
              Task Completed:{" "}
              <span className="text-success">
                {data.title}
              </span>
            </p>
            {data.completionNotes && (
              <p className="text-sm text-muted-foreground bg-success/5 border border-success/10 p-2 rounded-lg mt-1 italic">
                Notes: &ldquo;{data.completionNotes}&rdquo;
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="bg-muted px-1.5 py-0.5 rounded uppercase font-semibold">
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
            <p className="text-sm font-bold text-foreground">
              Document Version Uploaded:{" "}
              <span className="text-violet">
                v{data.versionNumber}
              </span>
            </p>
            {data.changeNotes && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Notes: {data.changeNotes}
              </p>
            )}
            <div className="pt-1">
              <a
                href={data.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold"
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
            <p className="text-sm font-bold text-foreground">
              Procedural Stage Transitioned
            </p>
            <div className="flex items-center gap-2 text-sm py-1">
              <span className="text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg border border-border/40 max-w-50 truncate">
                {oldName}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
              <span className="text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 font-bold max-w-50 truncate">
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
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
          Aggregating timeline events...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-sm text-destructive font-semibold">
        Failed to load timeline:{" "}
        {error.message}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border p-12 text-center bg-card text-card-foreground">
        <GitBranch className="h-10 w-10 text-muted-foreground/60 mx-auto" />
        <p className="font-bold text-foreground mt-2 text-base">
          No activity recorded
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          This matter does not have any log events yet.
        </p>
      </Card>
    );
  }

  // Reverse timeline to show most recent first
  const sortedEvents = [...events].reverse();

  return (
    <div className="relative border-l border-border/80 pl-6 ml-4 space-y-6 py-2">
      {sortedEvents.map((event, index) => (
        <div key={index} className="relative">
          {/* Dot Indicator */}
          <div className="absolute -left-9.75 top-1.5 shrink-0 bg-background px-1 py-0.5">
            {getEventIcon(event.type)}
          </div>

          {/* Card Wrapper */}
          <Card className="skeuo-card bg-card text-card-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/40 mb-2">
                <span className="font-bold uppercase tracking-wider text-primary">
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
