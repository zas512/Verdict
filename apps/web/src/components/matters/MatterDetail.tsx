"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MatterDetailProps } from "@/types/matterTypes";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  FolderClosed,
  Gavel,
  GitBranch,
  Loader2,
  Scale,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssignAssociateDialog } from "./AssignAssociateDialog";
import { ChangeStageDialog } from "./ChangeStageDialog";
import { ChangeStatusDialog } from "./ChangeStatusDialog";
import { MatterDocuments } from "./MatterDocuments";
import { MatterHearings } from "./MatterHearings";
import { MatterOverview } from "./MatterOverview";
import { MatterParties } from "./MatterParties";
import { MatterTimeline } from "./MatterTimeline";
import { TasksBoard } from "@/components/tasks/TasksBoard";
export function MatterDetail({ id, userRole }: Readonly<MatterDetailProps>) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "hearings" | "tasks" | "documents" | "parties"
  >("overview");

  const [isStageOpen, setIsStageOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const isAdmin = userRole === "OWNER";

  const {
    data: matter,
    isLoading,
    error
  } = useQuery({
    queryKey: ["matter", id],
    queryFn: async () => {
      const res = await fetch(`/api/matters/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch matter");
      }
      return res.json();
    }
  });

  const getStatusBadge = (status: string) => {
    let variant: "emerald" | "destructive" | "amber" | "outline" = "outline";
    if (status === "ACTIVE") variant = "emerald";
    else if (status === "DECIDED") variant = "amber";
    else if (status === "CLOSED" || status === "ARCHIVED")
      variant = "destructive";

    return (
      <Badge
        variant={variant}
        className="text-xs font-bold tracking-wider uppercase"
      >
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 p-24">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
        <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Loading matter workspace...
        </p>
      </div>
    );
  }

  if (error || !matter) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 text-destructive mx-auto max-w-xl rounded-2xl p-8 text-center shadow-sm">
        <AlertCircle className="text-destructive mx-auto h-12 w-12" />
        <h3 className="mt-3 text-lg font-extrabold">
          Access Denied or Case Not Found
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          {error instanceof Error
            ? error.message
            : "You might not be assigned to this matter or it belongs to a different tenant."}
        </p>
        <Link href="/matters" className="mt-4 inline-block">
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl"
          >
            Return to Ledger
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/matters">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1 rounded-xl text-sm font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Matters Ledger</span>
          </Button>
        </Link>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStageOpen(true)}
              className="border-border h-8 gap-1 rounded-xl text-sm font-bold"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Change Stage</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusOpen(true)}
              className="border-border h-8 gap-1 rounded-xl text-sm font-bold"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Status</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignOpen(true)}
              className="border-border h-8 gap-1 rounded-xl text-sm font-bold"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Assign Counsel</span>
            </Button>

            <a
              href={`/api/matters/${id}/summary-report`}
              target="_blank"
              rel="noreferrer"
              className="bg-primary text-primary-foreground hover:bg-primary/95 inline-flex h-8 items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold shadow-sm select-none"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Summary PDF</span>
            </a>
          </div>
        )}
      </div>

      <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
        <div className="from-primary via-primary/80 to-chart-2 absolute top-0 right-0 left-0 h-1 bg-linear-to-r" />
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-primary bg-primary/10 border-primary/20 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
                  {matter.caseType}
                </span>
                {getStatusBadge(matter.status)}
                {matter.cnr && (
                  <span className="text-muted-foreground bg-muted border-border rounded border px-2.5 py-1 font-mono text-xs">
                    CNR: {matter.cnr}
                  </span>
                )}
              </div>
              <h2 className="text-foreground pt-1 text-2xl font-black">
                {matter.client?.name || matter.clientName}{" "}
                <span className="text-muted-foreground font-normal">
                  v. Opposition
                </span>
              </h2>
              <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <span>
                  Internal Ref: <strong>{matter.firmCaseNumber}</strong>
                </span>
                {matter.courtCaseNumber && (
                  <>
                    <span>•</span>
                    <span>
                      Court Ref: <strong>{matter.courtCaseNumber}</strong>
                    </span>
                  </>
                )}
                {matter.court && (
                  <>
                    <span>•</span>
                    <span>
                      Venue: <strong>{matter.court}</strong>
                    </span>
                  </>
                )}
              </p>
            </div>

            {matter.currentStage && (
              <div className="bg-muted/30 border-border/80 shrink-0 rounded-2xl border p-3 md:text-right">
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Current Legal Stage
                </p>
                <p className="text-primary mt-0.5 text-base font-extrabold">
                  {matter.currentStage.name}
                </p>
                <span className="text-muted-foreground text-xs font-semibold">
                  Sequence order: #{matter.currentStage.sequenceOrder}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div
        role="tablist"
        aria-label="Matter sections"
        className="border-border flex items-center gap-1 overflow-x-auto border-b pb-1"
      >
        <Button
          variant="ghost"
          role="tab"
          id="tab-overview"
          aria-selected={activeTab === "overview"}
          aria-controls="panel-overview"
          tabIndex={activeTab === "overview" ? 0 : -1}
          onClick={() => setActiveTab("overview")}
          className={`h-9 shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "overview"
              ? "bg-primary/10 text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>Case Overview</span>
        </Button>

        <Button
          variant="ghost"
          role="tab"
          id="tab-timeline"
          aria-selected={activeTab === "timeline"}
          aria-controls="panel-timeline"
          tabIndex={activeTab === "timeline" ? 0 : -1}
          onClick={() => setActiveTab("timeline")}
          className={`h-9 shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "timeline"
              ? "bg-primary/10 text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span>Case Timeline</span>
        </Button>

        <Button
          variant="ghost"
          role="tab"
          id="tab-hearings"
          aria-selected={activeTab === "hearings"}
          aria-controls="panel-hearings"
          tabIndex={activeTab === "hearings" ? 0 : -1}
          onClick={() => setActiveTab("hearings")}
          className={`h-9 shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "hearings"
              ? "bg-primary/10 text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Gavel className="h-3.5 w-3.5" />
          <span>Hearings Ledger</span>
        </Button>

        <Button
          variant="ghost"
          role="tab"
          id="tab-tasks"
          aria-selected={activeTab === "tasks"}
          aria-controls="panel-tasks"
          tabIndex={activeTab === "tasks" ? 0 : -1}
          onClick={() => setActiveTab("tasks")}
          className={`h-9 shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "tasks"
              ? "bg-primary/10 text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Tasks & Checklist</span>
        </Button>

        <Button
          variant="ghost"
          role="tab"
          id="tab-documents"
          aria-selected={activeTab === "documents"}
          aria-controls="panel-documents"
          tabIndex={activeTab === "documents" ? 0 : -1}
          onClick={() => setActiveTab("documents")}
          className={`h-9 shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "documents"
              ? "bg-primary/10 text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FolderClosed className="h-3.5 w-3.5" />
          <span>Case Documents</span>
        </Button>

        <Button
          variant="ghost"
          role="tab"
          id="tab-parties"
          aria-selected={activeTab === "parties"}
          aria-controls="panel-parties"
          tabIndex={activeTab === "parties" ? 0 : -1}
          onClick={() => setActiveTab("parties")}
          className={`h-9 shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "parties"
              ? "bg-primary/10 text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Litigants & Parties</span>
        </Button>
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="pt-2"
      >
        {activeTab === "overview" && <MatterOverview matter={matter} />}
        {activeTab === "timeline" && <MatterTimeline id={id} />}
        {activeTab === "hearings" && (
          <MatterHearings id={id} userRole={userRole} />
        )}
        {activeTab === "tasks" && (
          <TasksBoard matterId={id} userRole={userRole} />
        )}
        {activeTab === "documents" && (
          <MatterDocuments id={id} userRole={userRole} />
        )}
        {activeTab === "parties" && (
          <MatterParties matter={matter} userRole={userRole} />
        )}
      </div>

      {isAdmin && (
        <>
          <ChangeStageDialog
            matterId={id}
            caseType={matter.caseType}
            currentStageId={matter.currentStageId}
            open={isStageOpen}
            onOpenChange={setIsStageOpen}
          />
          <ChangeStatusDialog
            matterId={id}
            currentStatus={matter.status}
            open={isStatusOpen}
            onOpenChange={setIsStatusOpen}
          />
          <AssignAssociateDialog
            matterId={id}
            assignedAssociateIds={matter.associates.map(
              (a: { associateId: string }) => a.associateId
            )}
            open={isAssignOpen}
            onOpenChange={setIsAssignOpen}
          />
        </>
      )}
    </div>
  );
}
