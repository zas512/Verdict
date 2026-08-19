"use client";
import type { Client } from "@/types/clientTypes";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Filters } from "../ui/filters";
import { SummaryStrip } from "../ui/summary-strip";
import { ClientDetailDialog } from "./ClientDetailDialog";
import { ClientsTable } from "./ClientsTable";
import { ConflictCheckDialog } from "./ConflictCheckDialog";
import { CreateClientDialog } from "./CreateClientDialog";

export function ClientsPage() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  const {
    data: allClients = [],
    isLoading,
    refetch,
    isRefetching,
    error
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch clients");
      }
      return res.json();
    }
  });

  useEffect(() => {
    if (error) {
      toast.error(`Error loading clients: ${error.message}`);
    }
  }, [error]);

  const filteredClients = useMemo(() => {
    return allClients.filter((c) => {
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesType = typeFilter === "ALL" || c.clientType === typeFilter;
      const searchStr =
        `${c.name} ${c.contactPerson ?? ""} ${c.phone ?? ""} ${c.email ?? ""} ${c.cnic ?? ""}`.toLowerCase();
      const matchesSearch =
        !globalFilter || searchStr.includes(globalFilter.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [allClients, statusFilter, typeFilter, globalFilter]);

  const stats = useMemo(() => {
    const total = allClients.length;
    const active = allClients.filter((c) => c.status === "ACTIVE").length;
    const inactive = allClients.filter((c) => c.status === "INACTIVE").length;
    const companies = allClients.filter(
      (c) => c.clientType === "COMPANY" || c.clientType === "GOVERNMENT"
    ).length;
    return { total, active, inactive, companies };
  }, [allClients]);

  return (
    <div className="space-y-6">
      {/* 1. KPI Stats Summary */}
      <SummaryStrip
        metrics={[
          {
            label: "Total Clients",
            value: stats.total
          },
          {
            label: "Active",
            value: stats.active,
            accentColor: "var(--success)"
          },
          {
            label: "Inactive",
            value: stats.inactive,
            accentColor: "var(--destructive)"
          },
          {
            label: "Companies",
            value: stats.companies,
            accentColor: "var(--warning)"
          }
        ]}
      />
      {/* 2. Actions & Filters */}
      <Filters
        search={{
          ariaLabel: "Search clients",
          placeholder: "Search name, CNIC, contact...",
          value: globalFilter,
          onChange: setGlobalFilter
        }}
        filters={[
          {
            key: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            ariaLabel: "Filter by status",
            placeholder: "All Statuses",
            options: [
              { value: "ALL", label: "All Statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" }
            ]
          },
          {
            key: "type",
            value: typeFilter,
            onChange: setTypeFilter,
            ariaLabel: "Filter by type",
            placeholder: "All Types",
            options: [
              { value: "ALL", label: "All Types" },
              { value: "INDIVIDUAL", label: "Individual" },
              { value: "COMPANY", label: "Company" },
              { value: "GOVERNMENT", label: "Government" }
            ]
          }
        ]}
        refresh={async () => {
          await refetch();
        }}
        isRefetching={isRefetching}
        addNewLable="Create Client"
        addNewOnClick={() => setIsCreateOpen(true)}
      />
      {/* 3. Table Ledger */}
      <ClientsTable
        data={filteredClients}
        isLoading={isLoading}
        onView={(c) => setViewingClientId(c.id)}
      />
      {/* 4. Dialogs */}
      <CreateClientDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <ConflictCheckDialog
        open={isConflictOpen}
        onOpenChange={setIsConflictOpen}
        onProceed={() => setIsCreateOpen(true)}
      />
      <ClientDetailDialog
        clientId={viewingClientId}
        onOpenChange={(open) => {
          if (!open) setViewingClientId(null);
        }}
      />
    </div>
  );
}
