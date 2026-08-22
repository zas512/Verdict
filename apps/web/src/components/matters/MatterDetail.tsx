"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  DetailedMatter,
  MatterDetailActionsProps,
  MatterDetailProps,
  MatterTab
} from "@/types/matterTypes";
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
import { lazy, useState } from "react";
import { toast } from "sonner";
import { MatterTabButton } from "./MatterTabs";
import { MatterTabContent } from "./MatterDetails";

const ChangeStageDialog = lazy(() =>
  import("./ChangeStageDialog").then((m) => ({ default: m.ChangeStageDialog }))
);
const ChangeStatusDialog = lazy(() =>
  import("./ChangeStatusDialog").then((m) => ({
    default: m.ChangeStatusDialog
  }))
);
const AssignAssociateDialog = lazy(() =>
  import("./AssignAssociateDialog").then((m) => ({
    default: m.AssignAssociateDialog
  }))
);

function getStatusBadge(status: string) {
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
}

function MatterDetailLoading() {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 p-24">
      <Loader2 className="text-primary h-10 w-10 animate-spin" />
      <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Loading matter workspace...
      </p>
    </div>
  );
}

function MatterDetailError({ error }: Readonly<{ error: unknown }>) {
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

async function downloadMatterSummaryPdf(
  id: string,
  firmCaseNumber?: string | null
): Promise<void> {
  const res = await fetch(`/api/matters/${id}/summary-report`);
  if (!res.ok) {
    throw new Error("Failed to download PDF summary");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Matter-${firmCaseNumber || id}-Summary.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function MatterDetailActions({
  isAdmin,
  isDownloading,
  onStageClick,
  onStatusClick,
  onAssignClick,
  onDownloadClick
}: Readonly<MatterDetailActionsProps>) {
  if (!isAdmin) return null;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onStageClick}
        className="border-primary/60 text-foreground hover:bg-primary/10 flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold shadow-sm select-none"
      >
        <GitBranch className="size-4" />
        <span>Change Stage</span>
      </button>
      <button
        type="button"
        onClick={onStatusClick}
        className="border-primary/60 text-foreground hover:bg-primary/10 flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold shadow-sm select-none"
      >
        <Clock className="size-4" />
        <span>Status</span>
      </button>
      <button
        type="button"
        onClick={onAssignClick}
        className="border-primary/60 text-foreground hover:bg-primary/10 flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold shadow-sm select-none"
      >
        <UserCheck className="size-4" />
        <span>Assign Counsel</span>
      </button>
      <button
        type="button"
        onClick={onDownloadClick}
        disabled={isDownloading}
        className="bg-primary text-primary-foreground hover:bg-primary/95 flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold shadow-sm select-none"
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        <span>{isDownloading ? "Downloading..." : "Summary PDF"}</span>
      </button>
    </div>
  );
}

const TABS_CONFIG = [
  {
    tab: "overview" as const,
    label: "Case Overview",
    icon: <Scale className="size-4" />
  },
  {
    tab: "timeline" as const,
    label: "Case Timeline",
    icon: <GitBranch className="size-4" />
  },
  {
    tab: "hearings" as const,
    label: "Hearings Ledger",
    icon: <Gavel className="size-4" />
  },
  {
    tab: "tasks" as const,
    label: "Tasks & Checklist",
    icon: <CheckCircle2 className="size-4" />
  },
  {
    tab: "documents" as const,
    label: "Case Documents",
    icon: <FolderClosed className="size-4" />
  },
  {
    tab: "parties" as const,
    label: "Litigants & Parties",
    icon: <Briefcase className="size-4" />
  }
];

export function MatterDetail({ id, userRole }: Readonly<MatterDetailProps>) {
  const [activeTab, setActiveTab] = useState<MatterTab>("overview");
  const [isStageOpen, setIsStageOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const isAdmin = userRole === "OWNER";

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      await downloadMatterSummaryPdf(id, matter?.firmCaseNumber);
      toast.success("Summary PDF downloaded successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to download PDF summary"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const {
    data: matter,
    isLoading,
    error
  } = useQuery<DetailedMatter>({
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

  if (isLoading) {
    return <MatterDetailLoading />;
  }

  if (error || !matter) {
    return <MatterDetailError error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <section className="flex items-center justify-between">
        <Link
          href="/matters"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-xl text-sm font-bold"
        >
          <ArrowLeft className="size-4" />
          <span>Matters Ledger</span>
        </Link>
        <MatterDetailActions
          isAdmin={isAdmin}
          isDownloading={isDownloading}
          onStageClick={() => setIsStageOpen(true)}
          onStatusClick={() => setIsStatusOpen(true)}
          onAssignClick={() => setIsAssignOpen(true)}
          onDownloadClick={handleDownloadPDF}
        />
      </section>
      {/* Main Card */}
      <Card className="bg-card text-card-foreground relative overflow-hidden">
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
      {/* Tabs */}
      <section
        aria-label="Matter sections"
        className="border-border flex items-center gap-1 overflow-x-auto border-b pb-4"
      >
        {TABS_CONFIG.map(({ tab, label, icon }) => (
          <MatterTabButton
            key={tab}
            tab={tab}
            activeTab={activeTab}
            onTabSelect={setActiveTab}
            icon={icon}
            label={label}
            id={tab}
          />
        ))}
      </section>
      {/* Content */}
      <section
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="pt-2"
      >
        <MatterTabContent
          tab={activeTab}
          id={id}
          matter={matter}
          userRole={userRole}
        />
      </section>
      {/* Dialogs */}
      {isAdmin && (
        <>
          <ChangeStageDialog
            matterId={id}
            caseType={matter.caseType}
            currentStageId={matter.currentStageId ?? undefined}
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
