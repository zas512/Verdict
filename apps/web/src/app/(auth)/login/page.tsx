"use client";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { googleAuthUrl } from "@/lib/auth";

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login: authLogin } = useAuth();
  const [googleNoAccount, setGoogleNoAccount] = useState(false);

  // Read ?google=no_account without useSearchParams (avoids the Suspense
  // wrapper); clears the query param so the notice doesn't persist on reload.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "no_account") {
      setGoogleNoAccount(true);
      params.delete("google");
      const next = params.toString();
      window.history.replaceState(
        null,
        "",
        next ? `${window.location.pathname}?${next}` : window.location.pathname
      );
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      await authLogin(data);
    },
    onError: (err: Error) => {
      console.error("[Client Auth] Login error:", err.message);
    }
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Sign In to Verdict
        </h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your credentials below to access your legal terminal
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        method="POST"
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-foreground/90 text-[13px] font-semibold"
          >
            Professional Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            {...register("email")}
            disabled={loginMutation.isPending}
            className="login-input"
            required
          />
          {errors.email && (
            <p className="text-destructive text-xs font-semibold">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-foreground/90 text-[13px] font-semibold"
          >
            Security Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            {...register("password")}
            disabled={loginMutation.isPending}
            className="login-input"
            required
          />
          {errors.password && (
            <p className="text-destructive text-xs font-semibold">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="bg-primary text-primary-foreground mt-2 h-11 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-tight shadow-sm transition-all duration-150 hover:bg-[#d8b06c] hover:brightness-110"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending
            ? "Authenticating..."
            : "Sign In to Verdict Terminal"}
        </Button>
      </form>

      {/* Google no-account notice (from the OAuth callback) */}
      {googleNoAccount && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No account was found for that Google profile — ask your firm admin
            for an invitation.
          </span>
        </div>
      )}

      {/* Divider + Google sign-in (only when Google is enabled) */}
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
              Or continue with
            </span>
            <span className="bg-border h-px flex-1" />
          </div>
          <GoogleButton href={googleAuthUrl()} />
        </div>
      )}
    </div>
  );
}
