"use client";
import { Table } from "@/components/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ColumnConfig } from "@/types/tableTypes";
import { Pencil, Trash2 } from "lucide-react";

export interface AttendanceRecord {
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

interface AttendanceTableProps {
  data: AttendanceRecord[];
  isLoading: boolean;
  userRole?: string;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatTime = (isoString: string | null) => {
  if (!isoString) return "--";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

export function AttendanceTable({
  data,
  isLoading,
  userRole,
  onEdit,
  onDelete
}: Readonly<AttendanceTableProps>) {
  const columns: ColumnConfig<AttendanceRecord>[] = [
    {
      key: "date",
      header: "DATE",
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => (
        <span className="text-foreground font-semibold">
          {formatDate(r.date)}
        </span>
      )
    },
    ...(userRole === "OWNER"
      ? [
          {
            key: "associate",
            header: "ASSOCIATE",
            sortable: true,
            accessor: (r: AttendanceRecord) => r.associate?.fullName ?? "",
            render: (r: AttendanceRecord) => (
              <span className="text-foreground font-semibold">
                {r.associate?.fullName || "N/A"}
              </span>
            )
          }
        ]
      : []),
    {
      key: "checkIn",
      header: "CHECK IN",
      sortable: true,
      accessor: (r) => r.checkIn,
      render: (r) => (
        <span className="text-foreground/90 font-mono text-xs">
          {formatTime(r.checkIn)}
        </span>
      )
    },
    {
      key: "checkOut",
      header: "CHECK OUT",
      sortable: true,
      accessor: (r) => r.checkOut ?? "",
      render: (r) => (
        <span className="text-foreground/90 font-mono text-xs">
          {r.checkOut ? formatTime(r.checkOut) : "In progress..."}
        </span>
      )
    },
    {
      key: "status",
      header: "STATUS",
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => {
        let variant: "emerald" | "amber" | "destructive" | "navy" = "navy";
        let label: string = r.status;
        if (r.status === "PRESENT") {
          variant = "emerald";
          label = "Present";
        } else if (r.status === "HALF_DAY") {
          variant = "amber";
          label = "Half Day";
        } else if (r.status === "ABSENT") {
          variant = "destructive";
          label = "Absent";
        } else if (r.status === "LEAVE") {
          label = "On Leave";
        }
        return <Badge variant={variant}>{label}</Badge>;
      }
    },
    {
      key: "source",
      header: "SOURCE",
      sortable: true,
      accessor: (r) => r.source,
      render: (r) => {
        const sourceLabels = {
          MANUAL: "Manual Log",
          BIOMETRIC_IMPORT: "Biometric Import",
          REMOTE_CHECKIN: "Remote Check-In"
        };
        return (
          <span className="text-muted-foreground text-xs font-semibold">
            {sourceLabels[r.source] || r.source}
          </span>
        );
      }
    },
    {
      key: "notes",
      header: "REASON / NOTES",
      accessor: (r) => r.notes ?? "",
      render: (r) => (
        <span
          className="text-muted-foreground block max-w-50 truncate text-xs"
          title={r.notes}
        >
          {r.notes || "--"}
        </span>
      )
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(r);
            }}
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1 rounded-md px-2.5 text-xs font-bold"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(r);
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1 rounded-md px-2.5 text-xs font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      loadingLabel="Loading attendance tracking..."
      emptyTitle="No attendance records found."
      emptyDescription="Adjust filters or log a new record to begin."
      caption="Attendance history table"
      pageSize={8}
    />
  );
}

export default AttendanceTable;
