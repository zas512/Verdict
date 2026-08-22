"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { Filters, type ToolbarFilter } from "@/components/ui/filters";
import { SummaryStrip } from "@/components/ui/summary-strip";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AttendanceTable, { type AttendanceRecord } from "./AttendanceTable";

const AddDialog = dynamic(() => import("@/components/attendance/AddDialog"), {
  ssr: false
});
const EditDialog = dynamic(() => import("@/components/attendance/EditDialog"), {
  ssr: false
});

function matchesAssociate(
  record: AttendanceRecord,
  userRole: string | undefined,
  selectedAssociateId: string
): boolean {
  if (userRole !== "OWNER" || selectedAssociateId === "all") return true;
  return (
    record.associateId === selectedAssociateId ||
    record.associate?.id === selectedAssociateId
  );
}

function matchesTimeRange(
  recordDate: string,
  timeRange: string,
  filterMonth: string,
  filterYear: string
): boolean {
  if (timeRange === "all") return true;

  if (timeRange === "custom") {
    const [year, month] = recordDate.split("-");
    if (filterYear !== "all" && year !== filterYear) return false;
    if (filterMonth !== "all" && Number(month) !== Number(filterMonth))
      return false;
    return true;
  }

  const recordTime = new Date(recordDate).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const daysMap: Record<string, number> = {
    week: 7,
    month: 30,
    "six-months": 180,
    year: 365
  };

  const days = daysMap[timeRange];
  if (days !== undefined) {
    const limit = now.getTime() - days * 24 * 60 * 60 * 1000;
    return recordTime >= limit;
  }

  return true;
}

export const AttendancePage = () => {
  const { user, refreshUser } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null
  );

  const [selectedAssociateId, setSelectedAssociateId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const {
    data: allRecords = [],
    isLoading,
    isRefetching,
    refetch,
    error
  } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", user?.role, user],
    queryFn: async () => {
      if (!user) return [];
      const endpoint =
        user.role === "OWNER" ? "/api/attendance/firm" : "/api/attendance";
      const res = await fetch(endpoint);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to fetch attendance records"
        );
      }
      return res.json();
    },
    enabled: !!user
  });

  useEffect(() => {
    if (error) {
      toast.error(
        `Error loading attendance: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [error]);

  const uniqueAssociates = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string }>();
    allRecords.forEach((r) => {
      if (r.associate) {
        map.set(r.associate.id, {
          id: r.associate.id,
          fullName: r.associate.fullName
        });
      }
    });
    return Array.from(map.values());
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      return (
        matchesAssociate(r, user?.role, selectedAssociateId) &&
        matchesTimeRange(r.date, timeRange, filterMonth, filterYear)
      );
    });
  }, [
    allRecords,
    selectedAssociateId,
    timeRange,
    filterMonth,
    filterYear,
    user
  ]);

  const stats = useMemo(() => {
    let totalHours = 0;
    let totalCompleted = 0;
    let presentCount = 0;

    filteredRecords.forEach((r) => {
      if (r.status === "PRESENT" || r.status === "HALF_DAY") {
        presentCount++;
      }
      if (r.checkIn && r.checkOut) {
        const hrs =
          (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) /
          3600000;
        if (hrs > 0 && hrs < 24) {
          totalHours += hrs;
          totalCompleted++;
        }
      }
    });

    const avgDuration = totalCompleted > 0 ? totalHours / totalCompleted : 0;

    return {
      totalHours: totalHours.toFixed(1),
      totalCompleted,
      presentCount,
      avgDuration: avgDuration.toFixed(1)
    };
  }, [filteredRecords]);

  const activeFilters = useMemo(() => {
    return [
      ...(user?.role === "OWNER"
        ? [
            {
              key: "associate",
              value: selectedAssociateId,
              onChange: setSelectedAssociateId,
              placeholder: "All Associates",
              options: [
                { value: "all", label: "All Associates" },
                ...uniqueAssociates.map((assoc) => ({
                  value: assoc.id,
                  label: assoc.fullName
                }))
              ]
            }
          ]
        : []),
      {
        key: "timeRange",
        value: timeRange,
        onChange: (v: string) => {
          setTimeRange(v);
          if (v !== "custom") {
            setFilterMonth("all");
            setFilterYear("all");
          }
        },
        placeholder: "All Time",
        options: [
          { value: "all", label: "All Time" },
          { value: "week", label: "Past Week" },
          { value: "month", label: "Past Month" },
          { value: "six-months", label: "Past 6 Months" },
          { value: "year", label: "Past Year" },
          { value: "custom", label: "Custom Range" }
        ]
      },
      ...(timeRange === "custom"
        ? [
            {
              key: "month",
              value: filterMonth,
              onChange: setFilterMonth,
              placeholder: "All Months",
              options: [
                { value: "all", label: "All Months" },
                { value: "1", label: "January" },
                { value: "2", label: "February" },
                { value: "3", label: "March" },
                { value: "4", label: "April" },
                { value: "5", label: "May" },
                { value: "6", label: "June" },
                { value: "7", label: "July" },
                { value: "8", label: "August" },
                { value: "9", label: "September" },
                { value: "10", label: "October" },
                { value: "11", label: "November" },
                { value: "12", label: "December" }
              ]
            },
            {
              key: "year",
              value: filterYear,
              onChange: setFilterYear,
              placeholder: "All Years",
              options: [
                { value: "all", label: "All Years" },
                { value: "2026", label: "2026" },
                { value: "2025", label: "2025" },
                { value: "2024", label: "2024" }
              ]
            }
          ]
        : [])
    ] as [ToolbarFilter, ...ToolbarFilter[]];
  }, [
    user,
    selectedAssociateId,
    uniqueAssociates,
    timeRange,
    filterMonth,
    filterYear
  ]);

  const handleDelete = async (record: AttendanceRecord) => {
    if (
      !confirm(
        "Are you sure you want to delete this attendance record? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/attendance/${record.id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete record");
      }
      toast.success("Attendance record deleted successfully!");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error deleting record");
    }
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Attendance Tracking & Leaves" />
      <SummaryStrip
        metrics={[
          {
            label: "Working Hours Logged",
            value: `${stats.totalHours} hrs`,
            indicator: `across ${stats.totalCompleted} shifts`
          },
          {
            label: "Days Accounted",
            value: `${stats.presentCount} days`,
            indicator: "Active in-office or remote logs",
            accentColor: "var(--success)"
          },
          {
            label: "Avg. Shift Duration",
            value: `${stats.avgDuration} hrs`,
            indicator: "Standard shift target: 8.0 hrs",
            accentColor: "var(--warning)"
          },
          {
            label: "Shifts Completed",
            value: stats.totalCompleted,
            indicator: "Fully logged checkout times",
            accentColor: "var(--info)"
          }
        ]}
      />

      <Filters
        filters={activeFilters}
        refresh={async () => {
          await refetch();
        }}
        isRefetching={isRefetching}
        addNewLable="Log Manual Attendance"
        addNewOnClick={() => setIsAddOpen(true)}
      />

      <AttendanceTable
        data={filteredRecords}
        isLoading={isLoading}
        userRole={user?.role}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />

      <AddDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={async () => {
          await refreshUser();
          refetch();
        }}
      />

      <EditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        record={editingRecord}
        onSuccess={async () => {
          await refreshUser();
          refetch();
        }}
      />
    </div>
  );
};

export default AttendancePage;
