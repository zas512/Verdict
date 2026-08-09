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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// Zod Schema for Creating a Matter
const createMatterSchema = z.object({
  firmCaseNumber: z
    .string()
    .min(1, { message: "Internal reference number is required" }),
  courtCaseNumber: z.string().optional(),
  cnr: z.string().optional(),
  caseType: z.enum(
    ["CIVIL", "CRIMINAL", "WRIT", "FAMILY", "SERVICE", "CORPORATE", "TAXATION"],
    {
      error: () => ({ message: "Select a valid Case Type" })
    }
  ),
  court: z.string().optional(),
  bench: z.string().optional(),
  presidingJudge: z.string().optional(),
  filingDate: z.string().optional(),
  clientName: z.string().min(2, { message: "Client name is required" }),
  clientId: z.string().optional(),
  associateIds: z.array(z.string()).optional()
});

type CreateMatterValues = z.infer<typeof createMatterSchema>;

interface Associate {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

interface CreateMatterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClientOption {
  id: string;
  name: string;
}

export function CreateMatterDialog({
  open,
  onOpenChange
}: Readonly<CreateMatterDialogProps>) {
  const queryClient = useQueryClient();

  // Fetch Associates for multi-select dropdown in form
  const { data: allAssociates = [] } = useQuery<Associate[]>({
    queryKey: ["associates"],
    queryFn: async () => {
      const res = await fetch("/api/associates");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  // Fetch Clients so a matter can be linked to a client record
  const { data: allClients = [] } = useQuery<ClientOption[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreateMatterValues>({
    resolver: zodResolver(createMatterSchema),
    defaultValues: {
      firmCaseNumber: "",
      courtCaseNumber: "",
      cnr: "",
      caseType: "CIVIL",
      court: "",
      bench: "",
      presidingJudge: "",
      filingDate: "",
      clientName: "",
      clientId: "",
      associateIds: []
    }
  });

  const selectedAssociates = watch("associateIds") || [];
  const selectedClientId = watch("clientId") || "";

  const createMutation = useMutation({
    mutationFn: async (values: CreateMatterValues) => {
      const payload = {
        ...values,
        filingDate: values.filingDate
          ? new Date(values.filingDate).toISOString()
          : undefined,
        clientId: values.clientId || undefined,
        associateIds: values.associateIds?.length
          ? values.associateIds
          : undefined
      };
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create matter");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("New matter created successfully.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["matters"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create matter");
    }
  });

  const onSubmit = (values: CreateMatterValues) => {
    createMutation.mutate(values);
  };

  const handleClientSelect = (clientId: string) => {
    setValue("clientId", clientId);
    const client = allClients.find((c) => c.id === clientId);
    if (client) {
      setValue("clientName", client.name);
    }
  };

  const handleAssociateToggle = (associateId: string) => {
    const current = [...selectedAssociates];
    const index = current.indexOf(associateId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(associateId);
    }
    setValue("associateIds", current);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">
            Initiate New Matter / Case
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set up a legal matter. This will suggest a starting court stage
            dynamically based on the CPC/CrPC type.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Link to a registered Client (optional) */}
          <div className="space-y-1">
            <Label
              htmlFor="clientId"
              className="text-xs font-bold text-foreground"
            >
              Link Client Record (optional)
            </Label>
            <Select value={selectedClientId} onValueChange={handleClientSelect}>
              <SelectTrigger className="rounded-xl h-8 font-semibold">
                <SelectValue placeholder="— Standalone (no client record) —" />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecting a client pre-fills the display name below. Convert a
              lead first to make it selectable here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Client Name */}
            <div className="space-y-1">
              <Label
                htmlFor="clientName"
                className="text-xs font-bold text-foreground"
              >
                Client Name *
              </Label>
              <Input
                id="clientName"
                placeholder="Enter litigant name"
                {...register("clientName")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errors.clientName && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.clientName.message}
                </p>
              )}
            </div>

            {/* Case Reference Number */}
            <div className="space-y-1">
              <Label
                htmlFor="firmCaseNumber"
                className="text-xs font-bold text-foreground"
              >
                Firm Reference # *
              </Label>
              <Input
                id="firmCaseNumber"
                placeholder="e.g. LGA-2026-CV-04"
                {...register("firmCaseNumber")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errors.firmCaseNumber && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.firmCaseNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Case Type */}
            <div className="space-y-1">
              <Label
                htmlFor="caseType"
                className="text-xs font-bold text-foreground"
              >
                Case Classification *
              </Label>
              <Controller
                control={control}
                name="caseType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Select case type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CIVIL">Civil (CPC)</SelectItem>
                      <SelectItem value="CRIMINAL">Criminal (CrPC)</SelectItem>
                      <SelectItem value="WRIT">Writ Petition</SelectItem>
                      <SelectItem value="FAMILY">Family Law</SelectItem>
                      <SelectItem value="SERVICE">Service Matters</SelectItem>
                      <SelectItem value="CORPORATE">Corporate Law</SelectItem>
                      <SelectItem value="TAXATION">Taxation Law</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.caseType && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.caseType.message}
                </p>
              )}
            </div>

            {/* Filing Date */}
            <div className="space-y-1">
              <Label
                htmlFor="filingDate"
                className="text-xs font-bold text-foreground"
              >
                Filing Date
              </Label>
              <Input
                id="filingDate"
                type="date"
                {...register("filingDate")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errors.filingDate && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.filingDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Court Case Number */}
            <div className="space-y-1">
              <Label
                htmlFor="courtCaseNumber"
                className="text-xs font-bold text-foreground"
              >
                Court Case #
              </Label>
              <Input
                id="courtCaseNumber"
                placeholder="e.g. Civil Suit 124/2026"
                {...register("courtCaseNumber")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>

            {/* CNR */}
            <div className="space-y-1">
              <Label
                htmlFor="cnr"
                className="text-xs font-bold text-foreground"
              >
                CNR Number
              </Label>
              <Input
                id="cnr"
                placeholder="e.g. ISB-Civil-1002"
                {...register("cnr")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>

            {/* Presiding Judge */}
            <div className="space-y-1">
              <Label
                htmlFor="presidingJudge"
                className="text-xs font-bold text-foreground"
              >
                Presiding Judge
              </Label>
              <Input
                id="presidingJudge"
                placeholder="e.g. Justice Mansoor"
                {...register("presidingJudge")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Court */}
            <div className="space-y-1">
              <Label
                htmlFor="court"
                className="text-xs font-bold text-foreground"
              >
                Court Jurisdiction
              </Label>
              <Input
                id="court"
                placeholder="e.g. District Court Islamabad West"
                {...register("court")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>

            {/* Bench */}
            <div className="space-y-1">
              <Label
                htmlFor="bench"
                className="text-xs font-bold text-foreground"
              >
                Bench Reference
              </Label>
              <Input
                id="bench"
                placeholder="e.g. Single Bench - I"
                {...register("bench")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>
          </div>

          {/* Assign Associates Inline */}
          <div className="space-y-2">
            <Label
              id="assignAssociatesLabel"
              className="text-xs font-bold text-foreground block"
            >
              Assign Associates to Matter
            </Label>
            <div
              role="group"
              aria-labelledby="assignAssociatesLabel"
              className="border border-border rounded-xl p-3 bg-muted/20 grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto"
            >
              {allAssociates.length === 0 ? (
                <span className="text-sm text-muted-foreground col-span-2">
                  No active associates found in firm roster.
                </span>
              ) : (
                allAssociates.map((assoc) => {
                  const isChecked = selectedAssociates.includes(assoc.id);
                  return (
                    <div
                      key={assoc.id}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      aria-label={assoc.name || assoc.email}
                      onClick={() => handleAssociateToggle(assoc.id)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          handleAssociateToggle(assoc.id);
                        }
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-semibold cursor-pointer select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by click
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none rounded text-primary"
                      />
                      <div className="truncate">
                        <p className="leading-tight truncate">
                          {assoc.name || assoc.email}
                        </p>
                        <span className="text-xs text-muted-foreground uppercase">
                          {assoc.role}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="rounded-xl text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="skeuo-button-primary rounded-xl text-sm font-bold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Matter</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
