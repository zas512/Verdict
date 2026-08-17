"use client";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/ui/table";
import type { Client } from "@/types/clientTypes";
import type { ColumnConfig } from "@/types/tableTypes";
import { Contact, ExternalLink } from "lucide-react";

const CLIENT_TYPE_LABELS: Record<Client["clientType"], string> = {
  INDIVIDUAL: "Individual",
  COMPANY: "Company",
  GOVERNMENT: "Government"
};

interface ClientsTableProps {
  data: Client[];
  isLoading: boolean;
  onView: (client: Client) => void;
}

export function ClientsTable({
  data,
  isLoading,
  onView
}: Readonly<ClientsTableProps>) {
  const columns: ColumnConfig<Client>[] = [
    {
      key: "name",
      header: "CLIENT NAME",
      width: "26%",
      sortable: true,
      accessor: (c) => c.name,
      render: (c) => (
        <div>
          <p className="text-foreground text-sm font-extrabold">{c.name}</p>
          {c.contactPerson && (
            <span className="text-muted-foreground block truncate text-xs">
              Contact: {c.contactPerson}
            </span>
          )}
        </div>
      )
    },
    {
      key: "clientType",
      header: "TYPE",
      width: "13%",
      sortable: true,
      accessor: (c) => CLIENT_TYPE_LABELS[c.clientType],
      render: (c) => (
        <span className="text-muted-foreground text-xs font-semibold uppercase">
          {CLIENT_TYPE_LABELS[c.clientType]}
        </span>
      )
    },
    {
      key: "status",
      header: "STATUS",
      width: "12%",
      sortable: true,
      accessor: (c) => c.status,
      render: (c) => {
        const isActive = c.status === "ACTIVE";
        const textColor = isActive ? "text-success" : "text-muted-foreground";
        const dotColor = isActive ? "bg-success" : "bg-muted-foreground";
        return (
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${textColor}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            <span>{isActive ? "Active" : "Inactive"}</span>
          </div>
        );
      }
    },
    {
      key: "contact",
      header: "CONTACT",
      width: "24%",
      accessor: (c) => `${c.phone ?? ""} ${c.email ?? ""}`,
      render: (c) => (
        <div className="text-muted-foreground text-sm font-medium">
          {c.phone && <p className="truncate">{c.phone}</p>}
          {c.email && <p className="text-primary/80 truncate">{c.email}</p>}
          {!c.phone && !c.email && (
            <span className="text-muted-foreground/70">No contact</span>
          )}
        </div>
      )
    },
    {
      key: "cnic",
      header: "CNIC / NTN",
      width: "15%",
      sortable: true,
      accessor: (c) => c.cnic ?? "",
      render: (c) => (
        <span className="text-muted-foreground font-mono text-sm">
          {c.cnic || "—"}
        </span>
      )
    },
    {
      key: "actions",
      header: "ACTIONS",
      width: "10%",
      align: "center",
      render: (c) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1 rounded-md px-2.5 text-sm font-bold"
            onClick={(e) => {
              e.stopPropagation();
              onView(c);
            }}
          >
            <span>View</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <CustomTable
      columns={columns}
      data={data}
      rowKey={(c) => c.id}
      isLoading={isLoading}
      loadingLabel="Loading client ledger..."
      emptyIcon={
        <Contact className="text-muted-foreground/60 mx-auto h-12 w-12" />
      }
      emptyTitle="No clients found"
      emptyDescription="Register a client or adjust your filters to begin."
      caption="Clients list"
      onRowClick={onView}
      pageSize={8}
    />
  );
}
