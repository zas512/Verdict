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

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddDialog = ({ open, onOpenChange, onSuccess }: AddDialogProps) => {
  // Form states for adding manual record
  const [addDate, setAddDate] = useState("");
  const [addCheckIn, setAddCheckIn] = useState("");
  const [addCheckOut, setAddCheckOut] = useState("");
  const [addStatus, setAddStatus] =
    useState<AttendanceRecord["status"]>("PRESENT");
  const [addNotes, setAddNotes] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    const handleSetOpen = () => {
      if (open) {
        setAddDate("");
        setAddCheckIn("");
        setAddCheckOut("");
        setAddStatus("PRESENT");
        setAddNotes("");
      }
    };
    handleSetOpen();
  }, [open]);

  const handleAddSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addDate || !addCheckIn || !addCheckOut) return;

    try {
      const checkInISO = new Date(`${addDate}T${addCheckIn}:00`).toISOString();
      const checkOutISO = new Date(
        `${addDate}T${addCheckOut}:00`
      ).toISOString();

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: addDate,
          checkIn: checkInISO,
          checkOut: checkOutISO,
          status: addStatus,
          notes: addNotes,
          source: "MANUAL"
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to add manual record");
      }
      toast.success("Manual record added successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Error adding record"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            Add Manual Attendance
          </DialogTitle>
          <DialogDescription>
            Log check-in/out stamps for a specific date in the past.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs font-bold">
              Select Date
            </Label>
            <Input
              id="date"
              type="date"
              required
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="bg-muted/40 border-border text-foreground rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="checkIn" className="text-xs font-bold">
                Check In Time
              </Label>
              <Input
                id="checkIn"
                type="time"
                required
                value={addCheckIn}
                onChange={(e) => setAddCheckIn(e.target.value)}
                className="bg-muted/40 border-border text-foreground rounded-xl font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkOut" className="text-xs font-bold">
                Check Out Time
              </Label>
              <Input
                id="checkOut"
                type="time"
                required
                value={addCheckOut}
                onChange={(e) => setAddCheckOut(e.target.value)}
                className="bg-muted/40 border-border text-foreground rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs font-bold">
              Status
            </Label>
            <Select
              value={addStatus}
              onValueChange={(v) =>
                setAddStatus(v as AttendanceRecord["status"])
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
            <Label htmlFor="notes" className="text-xs font-bold">
              Reason/Notes
            </Label>
            <Input
              id="notes"
              type="text"
              placeholder="e.g. Offsite meeting, forgot to punch"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
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
              Save Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDialog;
