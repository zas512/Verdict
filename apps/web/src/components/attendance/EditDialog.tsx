"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/utils";
import { type SubmitEvent, useEffect, useState } from "react";
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
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  onSuccess: () => void;
}

const EditDialog = ({
  open,
  onOpenChange,
  record,
  onSuccess
}: EditDialogProps) => {
  // Form states for editing record
  const [editDate, setEditDate] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editStatus, setEditStatus] =
    useState<AttendanceRecord["status"]>("PRESENT");
  const [editNotes, setEditNotes] = useState("");

  // Initialize and populate form states when dialog opens with a record
  useEffect(() => {
    const handleSetOpen = () => {
      if (open && record) {
        setEditDate(record.date);

        // Extract HH:MM from ISO string
        const checkInDate = new Date(record.checkIn);
        const inH = String(checkInDate.getHours()).padStart(2, "0");
        const inM = String(checkInDate.getMinutes()).padStart(2, "0");
        setEditCheckIn(`${inH}:${inM}`);

        if (record.checkOut) {
          const checkOutDate = new Date(record.checkOut);
          const outH = String(checkOutDate.getHours()).padStart(2, "0");
          const outM = String(checkOutDate.getMinutes()).padStart(2, "0");
          setEditCheckOut(`${outH}:${outM}`);
        } else {
          setEditCheckOut("");
        }
        setEditStatus(record.status);
        setEditNotes(record.notes || "");
      }
    };
    handleSetOpen();
  }, [open, record]);

  const handleEditSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!record || !editDate || !editCheckIn) return;

    // Construct checkIn ISO
    const [inH, inM] = editCheckIn.split(":").map(Number);
    const inDate = new Date(editDate);
    inDate.setHours(inH, inM, 0, 0);

    let outIso: string | null = null;
    if (editCheckOut) {
      const [outH, outM] = editCheckOut.split(":").map(Number);
      const outDate = new Date(editDate);
      outDate.setHours(outH, outM, 0, 0);
      if (outDate.getTime() < inDate.getTime()) {
        outDate.setDate(outDate.getDate() + 1);
      }
      outIso = outDate.toISOString();
    }

    try {
      const res = await fetch(`/api/attendance/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          checkIn: inDate.toISOString(),
          checkOut: outIso,
          status: editStatus,
          notes: editNotes
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update record");
      }

      toast.success("Record updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Error updating record"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            Edit Attendance Record
          </DialogTitle>
          <DialogDescription>
            Update check-in/out times or logs for this record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="editDate" className="text-xs font-bold">
              Date
            </Label>
            <Input
              id="editDate"
              type="date"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="bg-muted/40 border-border text-foreground rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="editCheckIn" className="text-xs font-bold">
                Check In Time
              </Label>
              <Input
                id="editCheckIn"
                type="time"
                required
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                className="bg-muted/40 border-border text-foreground rounded-xl font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editCheckOut" className="text-xs font-bold">
                Check Out Time
              </Label>
              <Input
                id="editCheckOut"
                type="time"
                placeholder="In progress..."
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                className="bg-muted/40 border-border text-foreground rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editStatus" className="text-xs font-bold">
              Status
            </Label>
            <Select
              value={editStatus}
              onValueChange={(v) =>
                setEditStatus(v as AttendanceRecord["status"])
              }
            >
              <SelectTrigger className="bg-muted/40 h-9 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENT">Present (Full Day)</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LEAVE">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editNotes" className="text-xs font-bold">
              Reason/Notes
            </Label>
            <Input
              id="editNotes"
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="bg-muted/40 border-border text-foreground rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground cursor-pointer rounded-xl text-xs font-bold"
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;
