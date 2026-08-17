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
import { EXPENSE_CATEGORIES } from "./CreateExpenseDialog";

const recurringTemplateSchema = z.object({
  category: z.string().min(1, { message: "Select a category" }),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(300, { message: "Keep the description under 300 characters" }),
  amount: z
    .number({ message: "Enter a valid amount" })
    .min(0.01, { message: "Amount must be at least 0.01" }),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]),
  nextRunDate: z.string().optional()
});

type RecurringTemplateValues = z.infer<typeof recurringTemplateSchema>;

interface RecurringTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringTemplatesDialog({
  open,
  onOpenChange
}: Readonly<RecurringTemplatesDialogProps>) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<RecurringTemplateValues>({
    resolver: zodResolver(recurringTemplateSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: undefined,
      billingCycle: "MONTHLY",
      nextRunDate: ""
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: RecurringTemplateValues) => {
      const payload = {
        category: values.category,
        description: values.description,
        amount: Number(values.amount),
        billingCycle: values.billingCycle,
        nextRunDate: values.nextRunDate || undefined
      };
      const res = await fetch("/api/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || "Failed to create template");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Recurring template created");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create template");
    }
  });

  const onSubmit = (values: RecurringTemplateValues) =>
    createMutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[88vh] max-w-lg overflow-y-auto rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-black">
            Create Recurring Template
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Automate a fixed expense that materializes on a repeating cycle.
            Leave the next-run date blank to schedule from today.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Category + Cycle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="templateCategory"
                className="text-foreground text-xs font-bold"
              >
                Category *
              </Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 rounded-xl font-semibold">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="templateBillingCycle"
                className="text-foreground text-xs font-bold"
              >
                Billing Cycle *
              </Label>
              <Controller
                control={control}
                name="billingCycle"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 rounded-xl font-semibold">
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="ANNUALLY">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label
              htmlFor="templateDescription"
              className="text-foreground text-xs font-bold"
            >
              Description *
            </Label>
            <Input
              id="templateDescription"
              placeholder="e.g. Monthly office rent"
              {...register("description")}
              className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
            />
            {errors.description && (
              <p className="text-destructive text-xs font-semibold">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Amount + Next Run */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="templateAmount"
                className="text-foreground text-xs font-bold"
              >
                Amount (PKR) *
              </Label>
              <Input
                id="templateAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 150000"
                {...register("amount", { valueAsNumber: true })}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl font-mono text-sm"
              />
              {errors.amount && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="templateNextRun"
                className="text-foreground text-xs font-bold"
              >
                Next Run Date
              </Label>
              <Input
                id="templateNextRun"
                type="date"
                {...register("nextRunDate")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
            </div>
          </div>

          <p className="text-muted-foreground text-[11px] font-medium">
            When due, the template generates a FIXED expense flagged as
            auto-generated and advances to the next cycle.
          </p>

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
              className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Template</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
