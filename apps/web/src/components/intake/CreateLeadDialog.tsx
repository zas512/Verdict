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

interface Associate {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

const createLeadSchema = z.object({
  name: z.string().min(2, { message: "Lead name is required" }),
  phone: z.string().optional(),
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  cnic: z.string().optional(),
  practiceArea: z
    .enum(["CIVIL", "CRIMINAL", "WRIT", "FAMILY", "SERVICE", "CORPORATE", "TAXATION"])
    .optional(),
  source: z.enum(["REFERRAL", "WEBSITE", "WALK_IN", "SOCIAL", "PHONE", "OTHER"]),
  description: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "REJECTED", "ARCHIVED"]),
  assignedToId: z.string().optional()
});

type CreateLeadValues = z.infer<typeof createLeadSchema>;

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadDialog({
  open,
  onOpenChange
}: Readonly<CreateLeadDialogProps>) {
  const queryClient = useQueryClient();

  const { data: allAssociates = [] } = useQuery<Associate[]>({
    queryKey: ["associates"],
    queryFn: async () => {
      const res = await fetch("/api/associates");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreateLeadValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      cnic: "",
      practiceArea: undefined,
      source: "OTHER",
      description: "",
      status: "NEW",
      assignedToId: ""
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateLeadValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create lead");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Lead captured in the intake pipeline.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create lead");
    }
  });

  const onSubmit = (values: CreateLeadValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">
            Capture New Lead
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Log a potential client into the intake pipeline for qualification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-bold text-foreground">
                Lead Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g. Fatima Iqbal"
                {...register("name")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errors.name && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs font-bold text-foreground">
                Phone
              </Label>
              <Input
                id="phone"
                placeholder="e.g. +92 300 1234567"
                {...register("phone")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-bold text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="lead@example.com"
                {...register("email")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errors.email && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="cnic" className="text-xs font-bold text-foreground">
                CNIC
              </Label>
              <Input
                id="cnic"
                placeholder="e.g. 35202-1234567-1"
                {...register("cnic")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="practiceArea" className="text-xs font-bold text-foreground">
                Practice Area
              </Label>
              <Controller
                control={control}
                name="practiceArea"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Not selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not selected</SelectItem>
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="source" className="text-xs font-bold text-foreground">
                Lead Source
              </Label>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                      <SelectItem value="WEBSITE">Website</SelectItem>
                      <SelectItem value="WALK_IN">Walk-in</SelectItem>
                      <SelectItem value="SOCIAL">Social Media</SelectItem>
                      <SelectItem value="PHONE">Phone</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs font-bold text-foreground">
                Status
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="CONTACTED">Contacted</SelectItem>
                      <SelectItem value="QUALIFIED">Qualified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="assignedToId" className="text-xs font-bold text-foreground">
                Assign To
              </Label>
              <Controller
                control={control}
                name="assignedToId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {allAssociates.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name || a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs font-bold text-foreground">
              Description
            </Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Nature of the matter, how the lead was referred, etc."
              {...register("description")}
              className="w-full text-sm rounded-xl border border-border bg-card text-foreground p-3 outline-none focus:border-primary resize-none"
            />
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
                  <span>Capturing...</span>
                </>
              ) : (
                <span>Add Lead</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
