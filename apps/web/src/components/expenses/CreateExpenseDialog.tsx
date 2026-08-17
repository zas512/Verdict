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
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

export const EXPENSE_CATEGORIES = [
  "Salaries (HR)",
  "Office & Rent",
  "Utilities",
  "Subscriptions",
  "Client Costs",
  "Stationery & Supplies",
  "Legal Fees",
  "Travel",
  "Other"
] as const;

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Cheque",
  "Online Wallet",
  "Other"
] as const;

const createExpenseSchema = z.object({
  type: z.enum(["FIXED", "MANUAL"]),
  category: z.string().min(1, { message: "Select a category" }),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(300, { message: "Keep the description under 300 characters" }),
  amount: z
    .number({ message: "Enter a valid amount" })
    .min(0.01, { message: "Amount must be at least 0.01" }),
  date: z.string().min(1, { message: "Date is required" }),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptUrl: z
    .union([z.literal(""), z.url({ message: "Enter a valid URL" })])
    .optional(),
  associateId: z.string().optional()
});

type CreateExpenseValues = z.infer<typeof createExpenseSchema>;

interface AssociateOption {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateExpenseDialog({
  open,
  onOpenChange
}: Readonly<CreateExpenseDialogProps>) {
  const queryClient = useQueryClient();

  const { data: allAssociates = [] } = useQuery<AssociateOption[]>({
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
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreateExpenseValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      type: "FIXED",
      category: "",
      description: "",
      amount: undefined,
      date: todayStr(),
      vendor: "",
      paymentMethod: "",
      receiptUrl: "",
      associateId: ""
    }
  });

  const expenseType = watch("type");

  const createMutation = useMutation({
    mutationFn: async (values: CreateExpenseValues) => {
      const payload = {
        category: values.category,
        description: values.description,
        amount: Number(values.amount),
        date: values.date,
        vendor: values.vendor || undefined,
        paymentMethod: values.paymentMethod || undefined,
        receiptUrl: values.receiptUrl || undefined,
        associateId: values.associateId || undefined
      };
      const url =
        values.type === "FIXED"
          ? "/api/fixed-expenses"
          : "/api/manual-expenses";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          result.message ||
            `Failed to record ${values.type.toLowerCase()} expense`
        );
      }
      return result;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        `${variables.type === "FIXED" ? "Fixed" : "Manual"} expense recorded`
      );
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record expense");
    }
  });

  const onSubmit = (values: CreateExpenseValues) =>
    createMutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[88vh] max-w-xl overflow-y-auto rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-black">
            Record an Expense
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Log a fixed obligation or a one-off operational cost for the firm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Expense Type Toggle */}
          <div className="space-y-1.5">
            <Label className="text-foreground text-xs font-bold">
              Expense Type *
            </Label>
            <div
              role="group"
              aria-label="Expense type"
              className="bg-muted/40 grid grid-cols-2 gap-1 rounded-xl p-1"
            >
              {(["FIXED", "MANUAL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={expenseType === t}
                  onClick={() => setValue("type", t, { shouldValidate: true })}
                  className={cn(
                    "h-9 cursor-pointer rounded-lg text-xs font-bold transition-colors",
                    expenseType === t
                      ? "bg-card text-foreground border-border border shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "FIXED" ? "Fixed Expense" : "Manual Expense"}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-[11px] font-medium">
              {expenseType === "FIXED"
                ? "Recurring obligations — salaries, rent, subscriptions."
                : "One-off operational costs — travel, supplies, client disbursements."}
            </p>
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="expenseCategory"
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
                htmlFor="expenseDate"
                className="text-foreground text-xs font-bold"
              >
                Date *
              </Label>
              <Input
                id="expenseDate"
                type="date"
                {...register("date")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errors.date && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.date.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label
              htmlFor="expenseDescription"
              className="text-foreground text-xs font-bold"
            >
              Description *
            </Label>
            <Input
              id="expenseDescription"
              placeholder="e.g. Office rent for August, court fee advance"
              {...register("description")}
              className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
            />
            {errors.description && (
              <p className="text-destructive text-xs font-semibold">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Amount + Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="expenseAmount"
                className="text-foreground text-xs font-bold"
              >
                Amount (PKR) *
              </Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 25000"
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
                htmlFor="expensePaymentMethod"
                className="text-foreground text-xs font-bold"
              >
                Payment Method
              </Label>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-9 rounded-xl font-semibold">
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      {PAYMENT_METHODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Vendor + Receipt URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="expenseVendor"
                className="text-foreground text-xs font-bold"
              >
                Vendor
              </Label>
              <Input
                id="expenseVendor"
                placeholder="e.g. K-Electric, PTCL"
                {...register("vendor")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="expenseReceiptUrl"
                className="text-foreground text-xs font-bold"
              >
                Receipt URL
              </Label>
              <Input
                id="expenseReceiptUrl"
                type="url"
                placeholder="https://..."
                {...register("receiptUrl")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errors.receiptUrl && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.receiptUrl.message}
                </p>
              )}
            </div>
          </div>

          {/* Associate */}
          <div className="space-y-1">
            <Label
              htmlFor="expenseAssociate"
              className="text-foreground text-xs font-bold"
            >
              Associate
            </Label>
            <Controller
              control={control}
              name="associateId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="h-9 rounded-xl font-semibold">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {allAssociates.map((assoc) => (
                      <SelectItem key={assoc.id} value={assoc.id}>
                        {assoc.name || assoc.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {allAssociates.length === 0 && (
              <p className="text-muted-foreground text-[11px] font-medium">
                No associates in the firm roster to link.
              </p>
            )}
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
              className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Record Expense</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
