"use client";
import { CustomTable } from "@/components/table";
import type { ColumnConfig } from "@/types/tableTypes";
import { Scale } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const columns: ColumnConfig<Matter>[] = [
    {
      key: "firmCaseNumber",
      header: "CASE REFERENCE",
      sortable: true,
      accessor: (m) => m.firmCaseNumber,
      render: (m) => (
        <div>
          <p className="text-foreground font-semibold">{m.firmCaseNumber}</p>
          {m.courtCaseNumber && (
            <span className="text-foreground/70 max-w-45 truncate text-xs">
              Court Case: {m.courtCaseNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "clientName",
      header: "CLIENT NAME",
      sortable: true,
      accessor: (m) => m.clientName,
      render: (m) => (
        <span className="text-foreground font-bold tracking-wide">
          {m.client?.name || m.clientName}
        </span>
      ),
    },
    {
      key: "caseType",
      header: "CASE TYPE",
      sortable: true,
      accessor: (m) => m.caseType,
      render: (m) => (
        <span className="text-foreground/80 text-xs font-semibold tracking-wider uppercase">
          {m.caseType}
        </span>
      ),
    },
    {
      key: "currentStage",
      header: "CURRENT STAGE",
      accessor: (m) => m.currentStage?.name ?? "",
      render: (m) => (
        <span className="text-foreground/80 block max-w-50 truncate font-semibold">
          {m.currentStage ? m.currentStage.name : "None / Unassigned"}
        </span>
      ),
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
          ARCHIVED: "text-muted-foreground",
        };
        const textColor = colorMap[status] ?? "text-muted-foreground";
        return (
          <span className={`font-semibold ${textColor}`}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        );
      },
    },
    {
      key: "filingDate",
      header: "FILING DATE",
      sortable: true,
      accessor: (m) => (m.filingDate ? new Date(m.filingDate) : null),
      render: (m) => (
        <span className="text-foreground/80">
          {m.filingDate
            ? new Date(m.filingDate).toLocaleDateString("en-PK", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Not Filed"}
        </span>
      ),
    },
  ];

  return (
    <CustomTable
      columns={columns}
      data={data}
      rowKey={(m) => m.id}
      isLoading={isLoading}
      loadingLabel="Loading legal ledger..."
      emptyIcon={
        <Scale className="text-muted-foreground/60 mx-auto h-12 w-12" />
      }
      emptyTitle="No matters found"
      emptyDescription="Adjust filters or create a new matter to begin."
      caption="Matters list"
      onRowClick={(m) => {
        router.push(`/matters/${m.id}`);
      }}
      pageSize={8}
    />
  );
}
