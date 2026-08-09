"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Client, Lead } from "@/types/clientTypes";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ConvertLeadDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
}

type ConvertMode = "create" | "link";

export function ConvertLeadDialog({
  lead,
  onOpenChange
}: Readonly<ConvertLeadDialogProps>) {
  const queryClient = useQueryClient();
  const open = Boolean(lead);
  const [mode, setMode] = useState<ConvertMode>("create");
  const [clientId, setClientId] = useState<string>("");

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead?.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "link" && clientId ? { clientId } : {}
        )
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to convert lead");
      }
      return result;
    },
    onSuccess: () => {
      toast.success(
        mode === "link"
          ? "Lead linked to existing client."
          : "Lead converted into a new client."
      );
      setMode("create");
      setClientId("");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to convert lead");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setMode("create");
          setClientId("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl bg-card border-border rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convert to Client
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Convert this qualified lead into a firm client so matters can be
            attached to it.
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="space-y-4 py-2">
            {/* Lead summary */}
            <div className="rounded-xl border border-border bg-muted/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-extrabold text-foreground">{lead.name}</p>
                <Badge variant="amber" className="text-[10px]">
                  {lead.status}
                </Badge>
                {lead.practiceArea && (
                  <Badge variant="navy" className="text-[10px]">
                    {lead.practiceArea}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {[lead.phone, lead.email, lead.cnic]
                  .filter(Boolean)
                  .join(" · ") || "No contact details"}
              </p>
            </div>

            {/* Mode selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={`flex-1 rounded-xl border p-3 text-sm font-bold transition-all cursor-pointer ${
                    mode === "create"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Create new client
                </button>
                <button
                  type="button"
                  onClick={() => setMode("link")}
                  className={`flex-1 rounded-xl border p-3 text-sm font-bold transition-all cursor-pointer ${
                    mode === "link"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Link existing client
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === "create"
                  ? "A new Client record will be created from the lead's name and contact details."
                  : "Select an existing client record to attach this lead to it."}
              </p>
            </div>

            {mode === "link" && (
              <div className="space-y-1">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger aria-label="Select existing client" className="w-full">
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No clients on record yet.
                      </div>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  convertMutation.isPending ||
                  (mode === "link" && !clientId)
                }
                onClick={() => convertMutation.mutate()}
                className="skeuo-button-primary rounded-xl text-sm font-bold gap-1.5"
              >
                {convertMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <span>Convert Lead</span>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
