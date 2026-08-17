"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMemberSchema,
  type CreateMemberValues,
} from "@/types/associatesTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

interface CreateAssociateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAssociateDialog({
  open,
  onOpenChange,
}: Readonly<CreateAssociateDialogProps>) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "ASSOCIATE",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateMemberValues) => {
      const res = await fetch("/api/associates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create firm member");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Member account created successfully.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({
        queryKey: ["associates"],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create firm member");
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        email: "",
        password: "",
        role: "ASSOCIATE",
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateMemberValues) {
    createMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="text-primary h-5 w-5" />
            Create Associate Account
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          autoComplete="off"
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="associate-name"
              className="text-foreground text-xs font-bold"
            >
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="associate-name"
              type="text"
              placeholder="John Doe"
              autoComplete="off"
              {...register("name")}
              className="bg-card rounded-xl text-xs"
            />
            {errors.name && (
              <p className="text-destructive text-xs font-semibold">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="associate-email"
              className="text-foreground text-xs font-bold"
            >
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="associate-email"
              type="email"
              placeholder="associate@laalglobal.com"
              autoComplete="off"
              {...register("email")}
              className="bg-card rounded-xl text-xs"
            />
            {errors.email && (
              <p className="text-destructive text-xs font-semibold">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="associate-password"
              className="text-foreground text-xs font-bold"
            >
              Account Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="associate-password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register("password")}
              className="bg-card rounded-xl text-xs"
            />

            {errors.password && (
              <p className="text-destructive text-xs font-semibold">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="associate-role"
              className="text-foreground text-xs font-bold"
            >
              Assigned Role <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="associate-role"
                    className="h-9 rounded-xl text-xs shadow-xs"
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ASSOCIATE">
                      ASSOCIATE (Legal Counsel)
                    </SelectItem>

                    <SelectItem value="ADMIN">
                      ADMIN (Operations Assistant)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            {errors.role && (
              <p className="text-destructive text-xs font-semibold">
                {errors.role.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold"
            >
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
