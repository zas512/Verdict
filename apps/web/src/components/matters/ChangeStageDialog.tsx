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
import type { CourtStage } from "@/types/matterTypes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface ChangeStageDialogProps {
  matterId: string;
  caseType: string;
  currentStageId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeStageDialog({
  matterId,
  caseType,
  currentStageId,
  open,
  onOpenChange
}: Readonly<ChangeStageDialogProps>) {
  const queryClient = useQueryClient();
  const [selectedStageId, setSelectedStageId] = useState(currentStageId ?? "");

  const { data: stages = [] } = useQuery<CourtStage[]>({
    queryKey: ["court-stages"],
    queryFn: async () => {
      const res = await fetch("/api/matters/stages");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  const filteredStages = useMemo(
    () =>
      stages
        .filter((s) => s.caseType === caseType)
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [stages, caseType]
  );

  const changeStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const res = await fetch(`/api/matters/${matterId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStageId: stageId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to change stage");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Procedural court stage updated successfully.");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["matter", matterId] });
      void queryClient.invalidateQueries({
        queryKey: ["matter-timeline", matterId]
      });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">
            Transition Procedural Stage
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update the case stage according to the civil/criminal lawsuit
            sequence. This writes to the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label
              htmlFor="stageSelect"
              className="text-xs font-bold text-foreground"
            >
              Choose Legal Stage
            </Label>
            <Select value={selectedStageId} onValueChange={setSelectedStageId}>
              <SelectTrigger className="rounded-xl h-8 font-semibold">
                <SelectValue placeholder="Select Stage" />
              </SelectTrigger>
              <SelectContent>
                {filteredStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Stage {s.sequenceOrder}: {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-sm font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              selectedStageId && changeStageMutation.mutate(selectedStageId)
            }
            disabled={changeStageMutation.isPending || !selectedStageId}
            className="skeuo-button-primary rounded-xl text-sm font-bold gap-1"
          >
            {changeStageMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Update Stage</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
