"use client";
import { type FirmMember } from "@/types/associatesTypes";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, UserPlus } from "lucide-react";
import { lazy, useMemo, useState } from "react";
import { Filters } from "../ui/filters";
import { AssociatesTable } from "./AssociatesTable";

const CreateAssociateDialog = lazy(() =>
  import("./CreateAssociateDialog").then((mod) => ({
    default: mod.CreateAssociateDialog,
  })),
);
const ViewAssociateDialog = lazy(() =>
  import("./ViewAssociateDialog").then((mod) => ({
    default: mod.ViewAssociateDialog,
  })),
);

export function AssociatesPage() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FirmMember | null>(null);
  const {
    data: allMembers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<FirmMember[]>({
    queryKey: ["associates"],
    queryFn: async () => {
      const res = await fetch("/api/associates");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch firm members");
      }
      const data = await res.json();
      return data;
    },
  });

  const staffMembers = useMemo(
    () => allMembers.filter((m) => m.role !== "OWNER"),
    [allMembers],
  );

  const filteredMembers = useMemo(() => {
    return staffMembers.filter((m) => {
      const searchStr = `${m.name || ""} ${m.email} ${m.role}`.toLowerCase();
      return !globalFilter || searchStr.includes(globalFilter.toLowerCase());
    });
  }, [staffMembers, globalFilter]);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <Filters
        search={{
          value: globalFilter,
          onChange: setGlobalFilter,
          ariaLabel: "Search associates",
          placeholder: "Search associates & staff...",
        }}
        actions={[
          {
            key: "refresh",
            label: "Refresh",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: async () => {
              await refetch();
            },
            disabled: isRefetching,
            loading: isRefetching,
          },
          {
            key: "create",
            label: "Create Associate",
            icon: <UserPlus className="h-4 w-4" />,
            onClick: () => setIsCreateOpen(true),
          },
        ]}
      />
      {/* Table */}
      <AssociatesTable
        data={filteredMembers}
        isLoading={isLoading}
        onView={setSelectedMember}
      />
      {/* Dialogs */}
      <CreateAssociateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
      <ViewAssociateDialog
        member={selectedMember}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMember(null);
          }
        }}
      />
    </div>
  );
}
