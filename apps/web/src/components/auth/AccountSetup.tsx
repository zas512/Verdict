"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/utils";
import { googleAuthUrl } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const setupSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .min(8, { message: "New password must be at least 8 characters" })
      .max(72),
    confirmPassword: z.string()
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type SetupFormValues = z.infer<typeof setupSchema>;

/**
 * Forced first-login screen. Reachable only while `mustChangePassword` is set;
 * the provisioned password is the "current password". On success the API
 * re-mints tokens, so the session and this flag both clear immediately.
 */
export function AccountSetup() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: SetupFormValues) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to update password");
      }
      return data;
    },
    onSuccess: async () => {
      toast.success("Password updated successfully");
      await refreshUser();
      const destination =
        user?.role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
      router.replace(destination);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Failed to update password"));
    }
  });

  const onSubmit = handleSubmit((values) =>
    changePasswordMutation.mutate(values)
  );

  return (
    <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden py-4">
      <div className="from-primary via-primary/80 to-chart-2 absolute top-0 right-0 left-0 h-1 bg-linear-to-r" />
      <h1 className="sr-only">Set your password</h1>
      <CardHeader className="space-y-1">
        <CardTitle className="text-foreground flex items-center gap-2 text-2xl font-black tracking-tight">
          <ShieldCheck className="text-primary h-6 w-6" />
          Set Your Password
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs font-medium">
          This is a provisioned account — choose a password you&apos;ll keep.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="current-password"
              className="text-foreground text-xs font-bold"
            >
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              placeholder="The password you were given"
              autoComplete="current-password"
              {...register("currentPassword")}
              disabled={changePasswordMutation.isPending}
              className="bg-card border-border text-foreground focus-visible:ring-primary/40 rounded-xl"
            />
            {errors.currentPassword && (
              <p className="text-destructive text-xs font-semibold">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className="text-foreground text-xs font-bold"
            >
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register("newPassword")}
              disabled={changePasswordMutation.isPending}
              className="bg-card border-border text-foreground focus-visible:ring-primary/40 rounded-xl"
            />
            {errors.newPassword && (
              <p className="text-destructive text-xs font-semibold">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-foreground text-xs font-bold"
            >
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              disabled={changePasswordMutation.isPending}
              className="bg-card border-border text-foreground focus-visible:ring-primary/40 rounded-xl"
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-xs font-semibold">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 h-10 w-full gap-1.5 rounded-xl text-sm font-bold tracking-tight shadow-xs"
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Save & Continue
              </>
            )}
          </Button>
        </form>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="flex items-center gap-3 pt-4">
              <span className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                or
              </span>
              <span className="bg-border h-px flex-1" />
            </div>
            <GoogleButton href={googleAuthUrl()} />
            <p className="text-muted-foreground pt-2 text-center text-[11px] font-medium">
              Signing in with Google links this account to your email
              automatically.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
