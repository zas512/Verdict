"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Filters } from "../ui/filters";
import { SummaryStrip } from "../ui/summary-strip";
import { CreateMatterDialog } from "./CreateMatterDialog";
import type { Matter } from "./MattersTable";
import { MattersTable } from "./MattersTable";

export function MattersPage() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
      <SummaryStrip
        metrics={[
          {
            label: "Total Matters",
            value: stats.total
          },
          {
            label: "Active",
            value: stats.active,
            accentColor: "var(--success)"
          },
          {
            label: "Decided",
            value: stats.decided,
            accentColor: "var(--warning)"
          },
          {
            label: "Closed",
            value: stats.closed,
            accentColor: "var(--destructive)"
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
        refresh={async () => {
          await refetch();
        }}
        isRefetching={isRefetching}
        addNewLable="Create Matter"
        addNewOnClick={() => setIsCreateOpen(true)}
      />
      {/* 3. Table Ledger */}
      <MattersTable data={filteredMatters} isLoading={isLoading} />
      {/* 4. Create Matter Dialog */}
      <CreateMatterDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
