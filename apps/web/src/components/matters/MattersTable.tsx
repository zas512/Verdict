"use client";
import { Badge } from "@/components/ui/badge";
import { CustomTable } from "@/components/ui/table";
import type { ColumnConfig } from "@/types/tableTypes";
import { Scale } from "lucide-react";

export interface Matter {
  id: string;
  firmCaseNumber: string;
  courtCaseNumber?: string | null;
  cnr?: string | null;
  caseType:
    | "CIVIL"
    | "CRIMINAL"
    | "WRIT"
    | "FAMILY"
    | "SERVICE"
    | "CORPORATE"
    | "TAXATION";
  court?: string | null;
  bench?: string | null;
  presidingJudge?: string | null;
  currentStageId?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DECIDED" | "CLOSED";
  filingDate?: string | null;
  clientName: string;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  currentStage?: {
    id: string;
    name: string;
    sequenceOrder: number;
  } | null;
  associates: Array<{
    id: string;
    associateId: string;
    role?: string | null;
  }>;
}

interface MattersTableProps {
  data: Matter[];
  isLoading: boolean;
}

export function MattersTable({ data, isLoading }: Readonly<MattersTableProps>) {
  const columns: ColumnConfig<Matter>[] = [
    {
      key: "firmCaseNumber",
      header: "CASE REFERENCE",
      sortable: true,
      accessor: (m) => m.firmCaseNumber,
      render: (m) => (
        <div>
          <p className="font-mono font-bold text-foreground text-sm">
            {m.firmCaseNumber}
          </p>
          {m.courtCaseNumber && (
            <span className="text-xs text-muted-foreground block truncate max-w-45">
              Court Case: {m.courtCaseNumber}
            </span>
          )}
        </div>
      )
    },
    {
      key: "clientName",
      header: "CLIENT NAME",
      sortable: true,
      accessor: (m) => m.clientName,
      render: (m) => (
        <span className="font-bold text-foreground text-sm">
          {m.client?.name || m.clientName}
        </span>
      )
    },
    {
      key: "caseType",
      header: "CASE TYPE",
      sortable: true,
      accessor: (m) => m.caseType,
      render: (m) => (
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          {m.caseType}
        </span>
      )
    },
    {
      key: "currentStage",
      header: "CURRENT STAGE",
      accessor: (m) => m.currentStage?.name ?? "",
      render: (m) => (
        <span className="text-sm font-semibold text-muted-foreground truncate max-w-50 block">
          {m.currentStage ? m.currentStage.name : "None / Unassigned"}
        </span>
      )
    },
    {
      key: "status",
      header: "STATUS",
      sortable: true,
      accessor: (m) => m.status,
      render: (m) => {
        const status = m.status;
        const colorMap = {
          ACTIVE: "text-success",
          DECIDED: "text-warning",
          CLOSED: "text-destructive",
          ARCHIVED: "text-muted-foreground"
        };
        const dotColorMap = {
          ACTIVE: "bg-success",
          DECIDED: "bg-warning",
          CLOSED: "bg-destructive",
          ARCHIVED: "bg-muted-foreground"
        };
        const dotColor = dotColorMap[status] ?? "bg-muted-foreground";
        const textColor = colorMap[status] ?? "text-muted-foreground";
        return (
          <div
            className={`flex items-center gap-1.5 font-semibold text-xs ${textColor}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
          </div>
        );
      }
    },
    {
      key: "filingDate",
      header: "FILING DATE",
      sortable: true,
      accessor: (m) => (m.filingDate ? new Date(m.filingDate) : null),
      render: (m) => (
        <span className="font-mono text-xs text-muted-foreground">
          {m.filingDate
            ? new Date(m.filingDate).toLocaleDateString("en-PK", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })
            : "Not Filed"}
        </span>
      )
    }
  ];

  return (
    <CustomTable
      columns={columns}
      data={data}
      rowKey={(m) => m.id}
      isLoading={isLoading}
      loadingLabel="Loading legal ledger..."
      emptyIcon={
        <Scale className="h-12 w-12 text-muted-foreground/60 mx-auto" />
      }
      emptyTitle="No matters found"
      emptyDescription="Adjust filters or create a new matter to begin."
      caption="Matters list"
      onRowClick={(m) => {
        window.location.href = `/matters/${m.id}`;
      }}
      pageSize={8}
    />
  );
}
