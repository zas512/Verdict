"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  FolderClosed,
  Gavel,
  Plus,
  RefreshCw,
  Scale
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Filters } from "../ui/filters";
import { StatsGrid } from "../ui/stats-grid";
import { CreateMatterDialog } from "./CreateMatterDialog";
import type { Matter } from "./MattersTable";
import { MattersTable } from "./MattersTable";

export function MattersList({
  userRole
}: Readonly<{
  userRole: string;
}>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canManage = userRole === "OWNER";

  const {
    data: allMatters = [],
    isLoading,
    isRefetching,
    refetch,
    error
  } = useQuery<Matter[]>({
    queryKey: ["matters"],
    queryFn: async () => {
      const res = await fetch("/api/matters");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch matters");
      }
      return res.json();
    }
  });

  useEffect(() => {
    if (error) {
      toast.error(`Error loading matters: ${error.message}`);
    }
  }, [error]);

  const filteredMatters = useMemo(() => {
    return allMatters.filter((m) => {
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      const matchesType = typeFilter === "ALL" || m.caseType === typeFilter;
      const searchStr = `${m.clientName} ${m.firmCaseNumber} ${
        m.courtCaseNumber ?? ""
      } ${m.cnr ?? ""} ${m.court ?? ""} ${
        m.presidingJudge ?? ""
      }`.toLowerCase();
      const matchesSearch =
        !globalFilter || searchStr.includes(globalFilter.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [allMatters, statusFilter, typeFilter, globalFilter]);

  const stats = useMemo(() => {
    const total = allMatters.length;
    const active = allMatters.filter((m) => m.status === "ACTIVE").length;
    const closed = allMatters.filter((m) => m.status === "CLOSED").length;
    const decided = allMatters.filter((m) => m.status === "DECIDED").length;
    return {
      total,
      active,
      closed,
      decided
    };
  }, [allMatters]);

  return (
    <div className="space-y-6">
      {/* 1. KPI Stats Summary */}
      <StatsGrid
        stats={[
          {
            title: "Total Matters",
            value: stats.total,
            icon: Briefcase,
            color: "primary"
          },
          {
            title: "Active",
            value: stats.active,
            icon: Scale,
            color: "success"
          },
          {
            title: "Decided",
            value: stats.decided,
            icon: Gavel,
            color: "warning"
          },
          {
            title: "Closed",
            value: stats.closed,
            icon: FolderClosed,
            color: "destructive"
          }
        ]}
      />

      {/* 2. Actions & Filters */}
      <Filters
        search={{
          ariaLabel: "Search matters",
          placeholder: "Search case #, client, CNR...",
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
              { value: "DECIDED", label: "Decided" },
              { value: "CLOSED", label: "Closed" },
              { value: "ARCHIVED", label: "Archived" }
            ]
          },
          {
            key: "type",
            value: typeFilter,
            onChange: setTypeFilter,
            ariaLabel: "Filter by case type",
            placeholder: "All Types",
            options: [
              { value: "ALL", label: "All Types" },
              { value: "CIVIL", label: "Civil" },
              { value: "CRIMINAL", label: "Criminal" },
              { value: "WRIT", label: "Writ" },
              { value: "FAMILY", label: "Family" },
              { value: "SERVICE", label: "Service" },
              { value: "CORPORATE", label: "Corporate" },
              { value: "TAXATION", label: "Taxation" }
            ]
          }
        ]}
        actions={[
          {
            key: "create-matter",
            label: "Create Matter",
            icon: <Plus className="size-5" />,
            onClick: () => setIsCreateOpen(true),
            hidden: !canManage,
            className: "bg-primary text-white hover:bg-primary/90"
          },
          {
            key: "sync-ledger",
            label: "Sync Ledger",
            icon: <RefreshCw className="size-5" />,
            onClick: () => {
              void refetch();
            },
            loading: isRefetching
          }
        ]}
      />

      {/* 3. Table Ledger */}
      <MattersTable data={filteredMatters} isLoading={isLoading} />

      {/* 4. Create Matter Dialog */}
      {canManage && (
        <CreateMatterDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}
    </div>
  );
}
