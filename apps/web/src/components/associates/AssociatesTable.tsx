"use client";
import { CustomTable } from "@/components/table";
import { Button } from "@/components/ui/button";
import { type FirmMember } from "@/types/associatesTypes";
import type { ColumnConfig } from "@/types/tableTypes";
import { Eye } from "lucide-react";

interface AssociatesTableProps {
  data: FirmMember[];
  isLoading: boolean;
  onView: (member: FirmMember) => void;
}

export function AssociatesTable({
  data,
  isLoading,
  onView,
}: Readonly<AssociatesTableProps>) {
  const columns: ColumnConfig<FirmMember>[] = [
    {
      key: "name",
      header: "FULL NAME",
      sortable: true,
      accessor: (m) => m.name ?? "",
      render: (m) => {
        const initials = m.name
          ? m.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : m.email.substring(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
              {initials}
            </div>
            <p className="text-foreground leading-tight font-bold">
              {m.name || "N/A"}
            </p>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "MEMBER EMAIL",
      sortable: true,
      accessor: (m) => m.email,
      render: (m) => (
        <span className="text-muted-foreground text-xs font-medium">
          {m.email}
        </span>
      ),
    },
    {
      key: "role",
      header: "ASSIGNED ROLE",
      sortable: true,
      accessor: (m) => m.role,
      render: (m) => {
        let label = "Associate";
        if (m.role === "OWNER") {
          label = "Owner";
        } else if (m.role === "ADMIN") {
          label = "Admin";
        }
        return (
          <span className="text-muted-foreground text-xs font-semibold">
            {label}
          </span>
        );
      },
    },
    {
      key: "isActive",
      header: "STATUS",
      sortable: true,
      accessor: (m) => (m.isActive ? 1 : 0),
      render: (m) => (
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold ${m.isActive ? "text-success" : "text-destructive"} `}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${m.isActive ? "bg-success" : "bg-destructive"} `}
          />
          <span>{m.isActive ? "Active" : "Inactive"}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "CREATED DATE",
      sortable: true,
      accessor: (m) => new Date(m.createdAt),
      render: (m) => (
        <span className="text-muted-foreground font-mono text-xs">
          {new Date(m.createdAt).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (m) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(m);
            }}
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1 rounded-md px-2.5 text-xs font-bold"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <CustomTable
      columns={columns}
      data={data}
      rowKey={(m) => m.id}
      isLoading={isLoading}
      loadingLabel="Loading firm members..."
      emptyTitle="No staff or associate records found."
      emptyDescription="Create a new associate to get started."
      caption="Firm members and associates"
      pageSize={8}
      onRowClick={onView}
    />
  );
}

export default AssociatesTable;
