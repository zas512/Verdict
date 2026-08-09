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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const createClientSchema = z.object({
  name: z.string().min(2, { message: "Client name is required" }),
  clientType: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT"]),
  contactPerson: z.string().optional(),
  cnic: z.string().optional(),
  companyRegistration: z.string().optional(),
  phone: z.string().optional(),
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"])
});

type CreateClientValues = z.infer<typeof createClientSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientDialog({
  open,
  onOpenChange
}: Readonly<CreateClientDialogProps>) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      clientType: "INDIVIDUAL",
      contactPerson: "",
      cnic: "",
      companyRegistration: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      status: "ACTIVE"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateClientValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "")
      );
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create client");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Client registered successfully.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create client");
    }
  });

  const onSubmit = (values: CreateClientValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">
            Register New Client
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a client record. Run a conflict check first to make sure the
            matter can be accepted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="name"
                className="text-xs font-bold text-foreground"
              >
                Client / Organization Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g. M/S Pakistan Trade House"
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
              <Label
                htmlFor="clientType"
                className="text-xs font-bold text-foreground"
              >
                Client Type
              </Label>
              <Controller
                control={control}
                name="clientType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                      <SelectItem value="COMPANY">Company</SelectItem>
                      <SelectItem value="GOVERNMENT">Government</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="contactPerson"
                className="text-xs font-bold text-foreground"
              >
                Contact Person
              </Label>
              <Input
                id="contactPerson"
                placeholder="Authorized representative"
                {...register("contactPerson")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="cnic"
                className="text-xs font-bold text-foreground"
              >
                CNIC / NTN
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
              <Label
                htmlFor="companyRegistration"
                className="text-xs font-bold text-foreground"
              >
                Company Registration
              </Label>
              <Input
                id="companyRegistration"
                placeholder="e.g. SECP Reg. 0045122"
                {...register("companyRegistration")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="phone"
                className="text-xs font-bold text-foreground"
              >
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
              <Label
                htmlFor="email"
                className="text-xs font-bold text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
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
              <Label
                htmlFor="status"
                className="text-xs font-bold text-foreground"
              >
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
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="address"
              className="text-xs font-bold text-foreground"
            >
              Address
            </Label>
            <Input
              id="address"
              placeholder="Registered office / residence"
              {...register("address")}
              className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
            />
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="notes"
              className="text-xs font-bold text-foreground"
            >
              Notes
            </Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Matter context, engagement terms, etc."
              {...register("notes")}
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
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Client</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
