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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConflictCheckResult } from "@/types/clientTypes";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ConflictCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed?: () => void;
}

export function ConflictCheckDialog({
  open,
  onOpenChange,
  onProceed
}: Readonly<ConflictCheckDialogProps>) {
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [result, setResult] = useState<ConflictCheckResult | null>(null);

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients/conflict-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cnic: cnic || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Conflict check failed");
      }
      return data as ConflictCheckResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Conflict check completed and logged to the audit trail.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Conflict check failed");
    }
  });

  const totalMatches =
    (result?.clients.length ?? 0) +
    (result?.parties.length ?? 0) +
    (result?.legacyMatters.length ?? 0);

  const handleClose = (openNext: boolean) => {
    if (!openNext) {
      setResult(null);
      setName("");
      setCnic("");
    }
    onOpenChange(openNext);
  };

  const renderMatters = (
    matters?: ConflictCheckResult["clients"][number]["matters"]
  ) => {
    if (!matters || matters.length === 0) {
      return (
        <p className="text-muted-foreground text-xs">
          No linked matters on record.
        </p>
      );
    }
    return (
      <ul className="mt-1 space-y-1">
        {matters.map((m) => (
          <li
            key={m.id}
            className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs"
          >
            <span className="text-foreground font-bold">
              {m.firmCaseNumber}
            </span>
            <Badge variant="navy" className="text-[10px]">
              {m.caseType}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {m.status}
            </Badge>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-lg font-black">
            <Search className="text-primary h-5 w-5" />
            Conflict Check
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Searches existing clients, case parties, and legacy matter names.
            Advisory only — every check is logged; a human makes the final call.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label
                htmlFor="cc-name"
                className="text-foreground text-xs font-bold"
              >
                Name / Organization *
              </Label>
              <Input
                id="cc-name"
                placeholder="e.g. Ahmed & Sons Traders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="cc-cnic"
                className="text-foreground text-xs font-bold"
              >
                CNIC / NTN (optional)
              </Label>
              <Input
                id="cc-cnic"
                placeholder="e.g. 35202-1234567-1"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={checkMutation.isPending || !name.trim()}
                onClick={() => checkMutation.mutate()}
                className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
              >
                {checkMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Run Check</span>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {totalMatches === 0 ? (
              <div className="border-success/30 bg-success/5 rounded-xl border p-6 text-center">
                <ShieldCheck className="text-success mx-auto h-10 w-10" />
                <p className="text-foreground mt-3 font-bold">
                  No potential conflicts found
                </p>
                <p className="text-muted-foreground text-sm">
                  No matching clients, parties, or legacy matters were found for
                  this name.
                </p>
              </div>
            ) : (
              <>
                <div className="border-warning/40 bg-warning/5 flex items-start gap-3 rounded-xl border p-4">
                  <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-foreground text-sm font-bold">
                      {totalMatches} potential match
                      {totalMatches > 1 ? "es" : ""} found
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Review the matches below. This is advisory — nothing is
                      blocked automatically.
                    </p>
                  </div>
                </div>

                {result.clients.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-primary text-xs font-bold tracking-wider uppercase">
                      Existing Clients
                    </h4>
                    {result.clients.map((c) => (
                      <div
                        key={c.id}
                        className="border-border bg-muted/10 rounded-xl border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-foreground text-sm font-bold">
                            {c.name}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {[c.phone, c.email, c.cnic]
                            .filter(Boolean)
                            .join(" · ") || "No contact details"}
                        </p>
                        {renderMatters(c.matters)}
                      </div>
                    ))}
                  </div>
                )}

                {result.parties.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-primary text-xs font-bold tracking-wider uppercase">
                      Case Parties
                    </h4>
                    {result.parties.map((p) => (
                      <div
                        key={p.id}
                        className="border-border bg-muted/10 rounded-xl border p-3"
                      >
                        <p className="text-foreground text-sm font-bold">
                          {p.name}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {[p.phone, p.email].filter(Boolean).join(" · ") ||
                            "No contact details"}
                        </p>
                        {renderMatters(p.matters)}
                      </div>
                    ))}
                  </div>
                )}

                {result.legacyMatters.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-primary text-xs font-bold tracking-wider uppercase">
                      Legacy Matter References
                    </h4>
                    {result.legacyMatters.map((m) => (
                      <div
                        key={m.id}
                        className="border-border bg-muted/10 rounded-xl border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-foreground text-sm font-bold">
                            {m.firmCaseNumber}
                          </p>
                          <Badge variant="navy" className="text-[10px]">
                            {m.caseType}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Party on record:{" "}
                          <span className="font-semibold">{m.clientName}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setName("");
                  setCnic("");
                }}
                className="rounded-xl text-sm font-bold"
              >
                Run Another Check
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onProceed?.();
                  handleClose(false);
                }}
                className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
              >
                <ShieldCheck className="h-4 w-4" />
                No conflict, proceed
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
