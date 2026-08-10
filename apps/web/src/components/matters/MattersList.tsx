"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, FolderClosed, Gavel, Plus, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateMatterDialog } from "./CreateMatterDialog";
import { MattersTable, type Matter } from "./MattersTable";

interface MattersListProps {
  userRole: string;
}

export function MattersList({ userRole }: Readonly<MattersListProps>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canManage = userRole === "OWNER";

  // Fetch Matters
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

  // Filter & Search Logic
  const filteredMatters = useMemo(() => {
    return allMatters.filter((m) => {
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      const matchesType = typeFilter === "ALL" || m.caseType === typeFilter;

      const searchStr =
        `${m.clientName} ${m.firmCaseNumber} ${m.courtCaseNumber ?? ""} ${m.cnr ?? ""} ${m.court ?? ""} ${m.presidingJudge ?? ""}`.toLowerCase();
      const matchesSearch =
        !globalFilter || searchStr.includes(globalFilter.toLowerCase());

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [allMatters, statusFilter, typeFilter, globalFilter]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = allMatters.length;
    const active = allMatters.filter((m) => m.status === "ACTIVE").length;
    const closed = allMatters.filter((m) => m.status === "CLOSED").length;
    const decided = allMatters.filter((m) => m.status === "DECIDED").length;
    return { total, active, closed, decided };
  }, [allMatters]);

  return (
    <div className="space-y-6">
      {/* 1. KPI Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total Matters
              </p>
              <h2 className="text-2xl font-black mt-1 text-foreground">
                {stats.total}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Active
              </p>
              <h2 className="text-2xl font-black mt-1 text-success">
                {stats.active}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center border border-success/20">
              <Scale className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Decided
              </p>
              <h2 className="text-2xl font-black mt-1 text-warning">
                {stats.decided}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center border border-warning/20">
              <Gavel className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Closed
              </p>
              <h2 className="text-2xl font-black mt-1 text-destructive">
                {stats.closed}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
              <FolderClosed className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Action & Filter Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <SearchInput
            aria-label="Search matters"
            placeholder="Search case #, client, CNR..."
            value={globalFilter}
            onChange={setGlobalFilter}
          />
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status" className="w-48">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DECIDED">Decided</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          {/* Case Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger aria-label="Filter by case type" className="w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="CIVIL">Civil</SelectItem>
              <SelectItem value="CRIMINAL">Criminal</SelectItem>
              <SelectItem value="WRIT">Writ</SelectItem>
              <SelectItem value="FAMILY">Family</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
              <SelectItem value="CORPORATE">Corporate</SelectItem>
              <SelectItem value="TAXATION">Taxation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-full text-sm font-bold h-10"
            >
              <Plus className="size-5" />
              Create Matter
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="rounded-full h-10 text-sm font-semibold dark:border-white/40 border-border"
          >
            Sync Ledger
          </Button>
        </div>
      </section>

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
