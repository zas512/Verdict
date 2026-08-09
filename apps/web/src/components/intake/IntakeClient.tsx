"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Lead } from "@/types/clientTypes";
import {
  CheckCircle2,
  Inbox,
  Phone,
  Plus,
  Star,
  UserCheck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { CreateLeadDialog } from "./CreateLeadDialog";
import { LeadsTable } from "./LeadsTable";

interface IntakeClientProps {
  userRole: string;
}

export function IntakeClient({ userRole }: Readonly<IntakeClientProps>) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const canManage = userRole === "OWNER";

  const {
    data: allLeads = [],
    isLoading,
    error
  } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch leads");
      }
      return res.json();
    }
  });

  useEffect(() => {
    if (error) {
      toast.error(`Error loading leads: ${error.message}`);
    }
  }, [error]);

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status
    }: {
      id: string;
      status: string;
    }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to update lead status");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Lead status updated.");
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update lead status");
    }
  });

  const filteredLeads = useMemo(() => {
    if (statusFilter === "ALL") return allLeads;
    return allLeads.filter((l) => l.status === statusFilter);
  }, [allLeads, statusFilter]);

  const stats = useMemo(() => {
    const total = allLeads.length;
    const newLeads = allLeads.filter((l) => l.status === "NEW").length;
    const qualified = allLeads.filter((l) => l.status === "QUALIFIED").length;
    const converted = allLeads.filter((l) => l.status === "CONVERTED").length;
    return { total, newLeads, qualified, converted };
  }, [allLeads]);

  const handleStatusChange = (lead: Lead, status: string) => {
    if (status === lead.status) return;
    statusMutation.mutate({ id: lead.id, status });
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total Leads
              </p>
              <h2 className="text-2xl font-black mt-1 text-foreground">
                {stats.total}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Inbox className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                New
              </p>
              <h2 className="text-2xl font-black mt-1 text-warning">
                {stats.newLeads}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center border border-warning/20">
              <Star className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Qualified
              </p>
              <h2 className="text-2xl font-black mt-1 text-primary">
                {stats.qualified}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="skeuo-card bg-card text-card-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Converted
              </p>
              <h2 className="text-2xl font-black mt-1 text-success">
                {stats.converted}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center border border-success/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Action & Filter Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by lead status" className="w-52">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="QUALIFIED">Qualified</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
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
              New Lead
            </Button>
          )}
        </div>
      </section>

      {/* 3. Pipeline Table */}
      <LeadsTable
        data={filteredLeads}
        isLoading={isLoading}
        canManage={canManage}
        onStatusChange={handleStatusChange}
        onConvert={(l) => setConvertingLead(l)}
      />

      {/* 4. Dialogs */}
      {canManage && (
        <CreateLeadDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}
      <ConvertLeadDialog
        lead={convertingLead}
        onOpenChange={(open) => {
          if (!open) setConvertingLead(null);
        }}
      />

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Phone className="h-3.5 w-3.5" />
        ASSOCIATE users can view the pipeline; status changes and conversion
        require OWNER role.
      </p>
    </div>
  );
}
