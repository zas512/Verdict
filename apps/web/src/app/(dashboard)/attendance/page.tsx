"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table } from "@/components/table";
import { getErrorMessage } from "@/lib/utils";
import type { ColumnConfig } from "@/types/tableTypes";
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit2,
  Play,
  Plus,
  Square,
  Trash2,
  TrendingUp,
  UserCheck
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  associateId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
  source: "MANUAL" | "BIOMETRIC_IMPORT" | "REMOTE_CHECKIN";
  notes?: string;
  associate?: {
    id: string;
    fullName: string;
    email: string | null;
  };
}

const AddDialog = dynamic(() => import("@/components/attendance/AddDialog"), {
  ssr: false
});
const EditDialog = dynamic(() => import("@/components/attendance/EditDialog"), {
  ssr: false
});

export default function AttendancePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const isCheckedIn = user?.isCheckedIn ?? false;
  const activeCheckInTime = user?.activeCheckInTime;

  // Attendance is self-service for OWNER and ASSOCIATE only; ADMIN/SUPER_ADMIN
  // are steered back to the dashboard.
  useEffect(() => {
    if (user && user.role !== "OWNER" && user.role !== "ASSOCIATE") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Modal control states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null
  );

  // Filter States
  const [selectedAssociateId, setSelectedAssociateId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(5);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      if (!user || user.role === "SUPER_ADMIN") {
        setHistory((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      const endpoint =
        user.role === "OWNER" ? "/api/attendance/firm" : "/api/attendance";
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error("Failed to load attendance records");
      }
      const data: AttendanceRecord[] = await res.json();
      const formatted = data.map((rec) => {
        const dateStr = new Date(rec.date).toISOString().split("T")[0];
        return {
          ...rec,
          date: dateStr
        };
      });
      if (active) {
        setHistory(formatted);
      }
    }
    loadHistory().catch((err) => {
      console.error(err);
      toast.error(getErrorMessage(err, "Error loading attendance history"));
    });
    return () => {
      active = false;
    };
  }, [user, refreshKey]);

  const checkIn = async () => {
    try {
      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      const clientDate = `${year}-${month}-${day}`;

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDate })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check in");
      }

      toast.success("Checked in successfully!");
      await refreshUser();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Check-in failed"));
    }
  };

  const checkOut = async () => {
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check out");
      }

      toast.success("Checked out successfully!");
      await refreshUser();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Check-out failed"));
    }
  };

  const deleteRecord = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/attendance/${id}`, {
          method: "DELETE"
        });

        if (!res.ok) {
          throw new Error("Failed to delete record");
        }

        toast.success("Record deleted successfully");
        await refreshUser();
        setRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error(err);
        toast.error(getErrorMessage(err, "Error deleting record"));
      }
    },
    [refreshUser]
  );

  // Unique list of associates represented in the history (Owner/Admin view)
  const uniqueAssociates = useMemo(() => {
    const map = new Map<
      string,
      { id: string; fullName: string; email: string | null }
    >();
    history.forEach((rec) => {
      if (rec.associate) {
        map.set(rec.associate.id, {
          id: rec.associate.id,
          fullName: rec.associate.fullName,
          email: rec.associate.email
        });
      }
    });
    return Array.from(map.values());
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((rec) => {
      const recDate = new Date(rec.date + "T00:00:00");
      const recMonth = recDate.getMonth() + 1; // 1-12
      const recYear = recDate.getFullYear();

      // 1. Associate filter (Owner view)
      if (
        user?.role === "OWNER" &&
        selectedAssociateId !== "all" &&
        rec.associateId !== selectedAssociateId
      ) {
        return false;
      }

      // 2. Month filter
      if (filterMonth !== "all" && recMonth !== Number(filterMonth)) {
        return false;
      }

      // 3. Year filter
      if (filterYear !== "all" && recYear !== Number(filterYear)) {
        return false;
      }

      // 4. Time Range Filter (Quick Filters)
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      if (timeRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (recDate < weekAgo) return false;
      } else if (timeRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (recDate < monthAgo) return false;
      } else if (timeRange === "six-months") {
        const sixMonthsAgo = new Date(
          now.getTime() - 180 * 24 * 60 * 60 * 1000
        );
        if (recDate < sixMonthsAgo) return false;
      } else if (timeRange === "year") {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        if (recDate < yearAgo) return false;
      }

      // 5. Custom Start date filter
      if (timeRange === "custom" && startDate) {
        const start = new Date(startDate + "T00:00:00");
        if (recDate < start) return false;
      }

      // 6. Custom End date filter
      if (timeRange === "custom" && endDate) {
        const end = new Date(endDate + "T00:00:00");
        if (recDate > end) return false;
      }

      return true;
    });
  }, [
    history,
    selectedAssociateId,
    filterMonth,
    filterYear,
    timeRange,
    startDate,
    endDate,
    user
  ]);

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setIsEditOpen(true);
  };

  // --- STATS COMPUTATIONS ---
  const stats = useMemo(() => {
    const completedShifts = filteredHistory.filter((r) => r.checkOut !== null);

    // 1. Total hours
    let totalMs = 0;
    completedShifts.forEach((r) => {
      if (r.checkOut) {
        totalMs +=
          new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
      }
    });
    const totalHours = totalMs / (1000 * 60 * 60);

    // 2. Present days count
    const presentCount = filteredHistory.filter(
      (r) => r.status === "PRESENT" || r.status === "HALF_DAY"
    ).length;

    // 3. Average duration
    const avgDuration =
      completedShifts.length > 0 ? totalHours / completedShifts.length : 0;

    return {
      totalHours: totalHours.toFixed(1),
      presentCount,
      avgDuration: avgDuration.toFixed(1),
      totalCompleted: completedShifts.length
    };
  }, [filteredHistory]);

  // Formatting helpers
  const formatDateFriendly = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatTimeFriendly = (isoStr: string | null) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const getDurationString = (
    checkInIso: string,
    checkOutIso: string | null
  ) => {
    if (!checkOutIso) return "In Progress";
    const diffMs =
      new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Status style helper
  const getStatusBadge = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge className="bg-success/10 text-success border-success/20 border">
            Present
          </Badge>
        );
      case "HALF_DAY":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20 border">
            Half Day
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/25 border">
            Absent
          </Badge>
        );
      case "LEAVE":
        return (
          <Badge className="bg-info/10 text-info border-info/20 border">
            On Leave
          </Badge>
        );
    }
  };

  // Source style helper
  const getSourceBadge = (source: AttendanceRecord["source"]) => {
    switch (source) {
      case "BIOMETRIC_IMPORT":
        return (
          <span className="text-violet bg-violet/10 border-violet/20 rounded-full border px-2 py-0.5 text-xs font-bold">
            Biometric Sync
          </span>
        );
      case "REMOTE_CHECKIN":
        return (
          <span className="text-teal bg-teal/10 border-teal/20 rounded-full border px-2 py-0.5 text-xs font-bold">
            Web Portal
          </span>
        );
      case "MANUAL":
        return (
          <span className="text-muted-foreground bg-muted border-border rounded-full border px-2 py-0.5 text-xs font-bold">
            Manual Log
          </span>
        );
    }
  };

  const columns: ColumnConfig<AttendanceRecord>[] = useMemo(() => {
    const isOwner = user?.role === "OWNER";

    const baseCols: ColumnConfig<AttendanceRecord>[] = [
      {
        key: "date",
        header: "Date",
        width: isOwner ? "14%" : "18%",
        sortable: true,
        accessor: (r) => r.date,
        render: (r) => formatDateFriendly(r.date)
      }
    ];

    if (isOwner) {
      baseCols.push({
        key: "associate",
        header: "Associate",
        width: "16%",
        sortable: true,
        accessor: (r) => r.associate?.fullName ?? "Unknown",
        render: (r) => (
          <div className="flex flex-col">
            <span className="text-foreground text-xs leading-tight font-bold">
              {r.associate?.fullName ?? "System / Unknown"}
            </span>
            {r.associate?.email && (
              <span className="text-muted-foreground max-w-40 truncate text-xs">
                {r.associate.email}
              </span>
            )}
          </div>
        )
      });
    }

    return [
      ...baseCols,
      {
        key: "status",
        header: "Status",
        width: "12%",
        sortable: true,
        accessor: (r) => r.status,
        render: (r) => getStatusBadge(r.status)
      },
      {
        key: "checkIn",
        header: "Check In",
        width: "12%",
        render: (r) => (
          <span className="text-foreground font-mono text-xs">
            {formatTimeFriendly(r.checkIn)}
          </span>
        )
      },
      {
        key: "checkOut",
        header: "Check Out",
        width: "12%",
        render: (r) => (
          <span className="text-foreground font-mono text-xs">
            {formatTimeFriendly(r.checkOut)}
          </span>
        )
      },
      {
        key: "duration",
        header: "Duration",
        width: "12%",
        render: (r) => (
          <span className="text-foreground text-xs font-semibold">
            {getDurationString(r.checkIn, r.checkOut)}
          </span>
        )
      },
      {
        key: "source",
        header: "Source",
        width: isOwner ? "12%" : "14%",
        sortable: true,
        accessor: (r) => r.source,
        render: (r) => getSourceBadge(r.source)
      },
      {
        key: "notes",
        header: "Notes",
        width: "12%",
        render: (r) => (
          <span
            className="text-muted-foreground block max-w-50 truncate text-xs"
            title={r.notes ?? ""}
          >
            {r.notes || "-"}
          </span>
        )
      },
      ...(isOwner
        ? [
            {
              key: "actions",
              header: "Actions",
              width: "8%",
              align: "right" as const,
              render: (r: AttendanceRecord) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="border-border bg-card hover:bg-muted hover:text-foreground text-muted-foreground cursor-pointer rounded-lg border p-1.5 transition-colors"
                    title="Edit Record"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete this attendance record?"
                        )
                      ) {
                        void deleteRecord(r.id);
                      }
                    }}
                    className="border-border bg-card hover:bg-destructive/10 hover:text-destructive text-muted-foreground cursor-pointer rounded-lg border p-1.5 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            }
          ]
        : [])
    ];
  }, [user, deleteRecord]);

  return (
    <div className="space-y-6">
      <HeaderUpdater
        title="Attendance Tracking & Leaves"
        breadcrumb="Attendance & Logs"
      />
      {/* Top dashboard section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Shift Card */}
        <Card className="border-border bg-card relative flex flex-col justify-between overflow-hidden shadow-xs md:col-span-1">
          <div
            className={`absolute top-0 right-0 left-0 h-1.5 ${isCheckedIn ? "bg-warning" : "bg-success"}`}
          />
          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-bold tracking-wider uppercase">
              <span>Active Clock Status</span>
              {isCheckedIn ? (
                <span className="text-warning border-warning/20 bg-warning/5 rounded-full border px-2 py-0.5 font-mono text-xs font-bold lowercase">
                  On Duty
                </span>
              ) : (
                <span className="text-success border-success/20 bg-success/5 rounded-full border px-2 py-0.5 font-mono text-xs font-bold lowercase">
                  Off Duty
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-6 pt-0 pb-5">
            <div>
              {isCheckedIn ? (
                <div className="mt-2 space-y-2">
                  <div className="text-foreground flex items-center gap-2 text-2xl font-black tracking-tight">
                    <span className="bg-warning inline-block h-3.5 w-3.5 animate-pulse rounded-full" />
                    <span>ON DUTY</span>
                  </div>
                  <div className="text-muted-foreground text-xs font-semibold">
                    Shift started at:{" "}
                    <span className="text-foreground font-mono font-bold">
                      {activeCheckInTime
                        ? formatTimeFriendly(activeCheckInTime)
                        : "Loading..."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="text-muted-foreground flex items-center gap-2 text-2xl font-black tracking-tight">
                    <span className="bg-muted inline-block h-3.5 w-3.5 rounded-full" />
                    <span>OFF DUTY</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
                    Ready to start your shift? Clock in to log your working
                    hours.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              {isCheckedIn ? (
                <Button
                  onClick={() => checkOut()}
                  variant="destructive"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-5 text-xs font-bold shadow-md"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Check Out & Finish Shift
                </Button>
              ) : (
                <Button
                  onClick={() => checkIn()}
                  className="bg-success text-success-foreground hover:bg-success/90 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-5 text-xs font-bold shadow-md"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Clock In & Start Shift
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
          {/* Card 1: Hours worked */}
          <Card className="skeuo-card bg-card text-card-foreground relative flex flex-col justify-between overflow-hidden">
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-bold tracking-wider uppercase">
                <span>Working Hours Logged</span>
                <Clock className="text-primary h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-foreground text-3xl font-black tracking-tight">
                {stats.totalHours} hrs
              </div>
              <p className="text-muted-foreground mt-1 text-xs font-semibold">
                Accumulated across {stats.totalCompleted} completed shifts
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Attendance Rate / Present count */}
          <Card className="skeuo-card bg-card text-card-foreground relative flex flex-col justify-between overflow-hidden">
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-bold tracking-wider uppercase">
                <span>Days Accounted</span>
                <UserCheck className="text-success h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-foreground text-3xl font-black tracking-tight">
                {stats.presentCount} days
              </div>
              <p className="text-success mt-1 text-xs font-semibold">
                Active in-office or remote logs
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Avg shift duration */}
          <Card className="skeuo-card bg-card text-card-foreground relative flex flex-col justify-between overflow-hidden">
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-bold tracking-wider uppercase">
                <span>Avg. Shift Duration</span>
                <TrendingUp className="text-teal h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-foreground text-3xl font-black tracking-tight">
                {stats.avgDuration} hrs
              </div>
              <p className="text-muted-foreground mt-1 text-xs font-semibold">
                Standard shift target: 8.0 hrs
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Action Card */}
          {user?.role === "OWNER" ? (
            <Card className="border-primary/20 bg-primary/5 flex flex-col items-start justify-between rounded-2xl border p-5 shadow-xs">
              <div className="space-y-1">
                <h2 className="text-foreground text-sm font-extrabold">
                  Missed checking in?
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Log attendance manually for past shifts or offsite
                  assignments.
                </p>
              </div>
              <Button
                onClick={() => setIsAddOpen(true)}
                size="sm"
                className="bg-primary text-primary-foreground mt-3 flex cursor-pointer items-center gap-1.5 rounded-xl text-xs font-bold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Record Manually
              </Button>
            </Card>
          ) : (
            <Card className="border-primary/20 bg-primary/5 flex flex-col items-start justify-between rounded-2xl border p-5 shadow-xs">
              <div className="space-y-1">
                <h2 className="text-foreground text-sm font-extrabold">
                  Track your shifts
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Use the Check In / Check Out buttons in the top bar to clock
                  your in-office or remote shifts.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* History Log Section */}
      <Card className="border-border bg-card overflow-hidden rounded-2xl shadow-xs">
        <CardHeader className="border-border flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
            <Calendar className="text-primary h-4 w-4" />
            Attendance History Log
          </CardTitle>
          <div className="text-muted-foreground text-xs font-semibold">
            {filteredHistory.length !== history.length
              ? `Filtered: ${filteredHistory.length} of ${history.length} records`
              : `${history.length} total records`}
          </div>
        </CardHeader>

        {/* Filter controls bar */}
        <div className="border-border bg-muted/20 flex flex-wrap items-end gap-4 border-b px-6 py-4">
          {/* Associate Selector (Owner only) */}
          {user?.role === "OWNER" && (
            <div className="min-w-40 space-y-1.5">
              <Label
                htmlFor="filter-associate"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                Associate
              </Label>
              <Select
                value={selectedAssociateId}
                onValueChange={setSelectedAssociateId}
              >
                <SelectTrigger className="h-8 rounded-lg text-xs">
                  <SelectValue placeholder="All Associates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Associates</SelectItem>
                  {uniqueAssociates.map((assoc) => (
                    <SelectItem key={assoc.id} value={assoc.id}>
                      {assoc.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Range Selector */}
          <div className="min-w-32.5 space-y-1.5">
            <Label
              htmlFor="filter-range"
              className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
            >
              Time Range
            </Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-8 rounded-lg text-xs">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="six-months">Past 6 Months</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Month Selector (Custom only) */}
          {timeRange === "custom" && (
            <div className="min-w-32.5 space-y-1.5">
              <Label
                htmlFor="filter-month"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                Month
              </Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-8 rounded-lg text-xs">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year Selector (Custom only) */}
          {timeRange === "custom" && (
            <div className="min-w-25 space-y-1.5">
              <Label
                htmlFor="filter-year"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                Year
              </Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 rounded-lg text-xs">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Start Date (Custom only) */}
          {timeRange === "custom" && (
            <div className="min-w-30 space-y-1.5">
              <Label
                htmlFor="filter-start-date"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                Start Date
              </Label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-card border-border text-foreground h-8 rounded-lg text-xs"
              />
            </div>
          )}

          {/* End Date (Custom only) */}
          {timeRange === "custom" && (
            <div className="min-w-30 space-y-1.5">
              <Label
                htmlFor="filter-end-date"
                className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
              >
                End Date
              </Label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-card border-border text-foreground h-8 rounded-lg text-xs"
              />
            </div>
          )}

          {/* Clear Filters Button */}
          {(selectedAssociateId !== "all" ||
            filterMonth !== "all" ||
            filterYear !== "all" ||
            timeRange !== "all" ||
            startDate ||
            endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAssociateId("all");
                setFilterMonth("all");
                setFilterYear("all");
                setTimeRange("all");
                setStartDate("");
                setEndDate("");
              }}
              className="hover:bg-muted h-8 cursor-pointer rounded-lg px-3 text-xs font-bold"
            >
              Clear
            </Button>
          )}

          {/* Page Size Selector */}
          <div className="ml-auto space-y-1.5">
            <Label
              htmlFor="attendancePageSize"
              className="text-muted-foreground block text-right text-xs font-bold tracking-wider uppercase"
            >
              Show
            </Label>
            <Select
              className="min-w-24"
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 rounded-lg text-xs">
                <SelectValue placeholder="5 / page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredHistory}
            rowKey={(r) => r.id}
            emptyIcon={
              <AlertCircle className="text-muted-foreground/60 mx-auto h-12 w-12" />
            }
            emptyTitle="No matching attendance records found."
            emptyDescription="Log a new shift or adjust your date filters."
            caption="Attendance history"
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {/* --- ADD DIALOG --- */}
      <AddDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={async () => {
          await refreshUser();
          setRefreshKey((prev) => prev + 1);
        }}
      />

      {/* --- EDIT DIALOG --- */}
      <EditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        record={editingRecord}
        onSuccess={async () => {
          await refreshUser();
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
