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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const createUserSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Full name is required" })
    .max(120, { message: "Name is too long" }),
  email: z.email({ message: "Please enter a valid email address" }),
  role: z.enum(["OWNER", "ADMIN", "ASSOCIATE"], {
    error: () => ({ message: "Role must be OWNER, ADMIN or ASSOCIATE" })
  }),
  password: z
    .string()
    .min(8, { message: "Initial password must be at least 8 characters" })
    .max(72)
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

/** Shape of a member as returned by GET/POST /firms/:id/users. */
export interface FirmUser {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "ADMIN" | "ASSOCIATE";
  firmId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  firm?: { id: string; name: string } | null;
}

interface CreateFirmUserDialogProps {
  firm: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a user is created so the firm's member list can refresh. */
  onCreated?: () => void;
}

const roleOptions: { value: CreateUserFormValues["role"]; label: string }[] = [
  { value: "OWNER", label: "OWNER (Firm Owner)" },
  { value: "ADMIN", label: "ADMIN (Operations)" },
  { value: "ASSOCIATE", label: "ASSOCIATE (Legal Counsel)" }
];

/**
 * SUPER_ADMIN manual user creation into a specific tenant firm. The account is
 * created immediately with the supplied initial password and is flagged
 * `mustChangePassword`, so the first login is forced through the setup screen.
 */
export function CreateFirmUserDialog({
  firm,
  open,
  onOpenChange,
  onCreated
}: Readonly<CreateFirmUserDialogProps>) {
  const [result, setResult] = useState<FirmUser | null>(null);
  // The API never returns the password; echo back what was submitted so the
  // SUPER_ADMIN can hand it over.
  const [createdPassword, setCreatedPassword] = useState("");
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "ASSOCIATE",
      password: ""
    }
  });

  // Reset state whenever the dialog opens fresh (possibly for a new firm).
  useEffect(() => {
    if (open) {
      setResult(null);
      setCreatedPassword("");
      setCopiedField(null);
      reset();
    }
  }, [open, reset]);

  const createMutation = useMutation({
    mutationFn: async (values: CreateUserFormValues) => {
      const res = await fetch(`/api/firms/${firm.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to create user");
      }
      return data as FirmUser;
    },
    onSuccess: (data, variables) => {
      setResult(data);
      setCreatedPassword(variables.password);
      toast.success(`User account created for ${data.email}`);
      onCreated?.();
    },
    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Failed to create user"));
    }
  });

  const onSubmit = handleSubmit((values) => createMutation.mutate(values));

  const copyValue = async (value: string, field: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="text-primary h-5 w-5" />
            Create User in {firm.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create the account directly. They sign in with these credentials and
            are asked to set a new password on first login.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 pt-2">
            <div className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Account created for {result.email}. Hand over the credentials —
                they&apos;ll be forced to set a new password on first login (or
                can sign in with Google instead).
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={result.email}
                  className="bg-card border-border rounded-xl font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyValue(result.email, "email")}
                  aria-label="Copy email"
                  className="shrink-0 rounded-xl"
                >
                  {copiedField === "email" ? (
                    <Check className="text-success h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  type="text"
                  value={createdPassword}
                  className="bg-card border-border rounded-xl font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyValue(createdPassword, "password")}
                  aria-label="Copy initial password"
                  className="shrink-0 rounded-xl"
                >
                  {copiedField === "password" ? (
                    <Check className="text-success h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs font-bold"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-bold"
                onClick={() => {
                  setResult(null);
                  setCreatedPassword("");
                  reset();
                }}
              >
                Create another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="create-user-name"
                className="text-foreground text-xs font-bold"
              >
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-user-name"
                placeholder="Jane Doe"
                {...register("name")}
                disabled={createMutation.isPending}
                className="bg-card border-border rounded-xl text-xs"
              />
              {errors.name && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="create-user-email"
                className="text-foreground text-xs font-bold"
              >
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-user-email"
                type="email"
                placeholder="associate@laalglobal.com"
                {...register("email")}
                disabled={createMutation.isPending}
                className="bg-card border-border rounded-xl text-xs"
              />
              {errors.email && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="create-user-role"
                className="text-foreground text-xs font-bold"
              >
                Assigned Role <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs shadow-xs">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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

            <div className="space-y-1.5">
              <Label
                htmlFor="create-user-password"
                className="text-foreground text-xs font-bold"
              >
                Initial Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-user-password"
                type="password"
                placeholder="At least 8 characters"
                {...register("password")}
                disabled={createMutation.isPending}
                className="bg-card border-border rounded-xl text-xs"
              />
              <p className="text-muted-foreground text-[11px] font-medium">
                They must replace this on first login (or can sign in with
                Google).
              </p>
              {errors.password && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.password.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl text-xs font-bold"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
