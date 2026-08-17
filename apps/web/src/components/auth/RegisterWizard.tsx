"use client";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { FirmLogo } from "@/components/branding/FirmLogo";
import { DEFAULT_ACCENT } from "@/components/branding/PlaceholderLogo";
import { UserAvatar } from "@/components/branding/UserAvatar";
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
import {
  getGoogleProfile,
  googleAuthUrl,
  registerWithInvite,
  validateInvite,
  type InviteInfo
} from "@/lib/auth";
import { uploadOnboardingFile } from "@/lib/uploads";
import { cn, getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  UploadCloud
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { type UseFormRegisterReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Please enter your full name" })
    .max(80, { message: "Name is too long" }),
  // Optional at the schema level so Google sign-ups never touch it; the manual
  // path enforces it in step 1, and the backend re-validates on submit.
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72, { message: "Password must be 72 characters or fewer" })
    .optional(),
  firmName: z
    .string()
    .min(2, { message: "Firm name must be at least 2 characters" })
    .max(120, { message: "Firm name is too long" })
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: "Use a hex color like #2563EB" })
    .optional(),
  tagline: z
    .string()
    .max(80, { message: "Tagline must be 80 characters or fewer" })
    .optional()
});

type FormValues = z.infer<typeof registerSchema>;

type Provider = "EMAIL" | "GOOGLE";

/** Default onboarding palette a founder can pick from. */
const ACCENT_SWATCHES = [
  "#2563EB", // royal blue
  "#0F172A", // slate-900
  "#7C3AED", // violet
  "#0D9488", // teal
  "#059669", // emerald
  "#B91C1C", // crimson
  "#EA580C", // burnt orange
  "#1E40AF" // navy
];

const roleLabel: Record<string, string> = {
  OWNER: "Firm Owner",
  ADMIN: "Administrator",
  ASSOCIATE: "Associate"
};

interface RegisterWizardProps {
  inviteToken: string;
  /** Short-lived Google profile code from the OAuth callback, if any. */
  code?: string;
  /** `google=no_account` — a Google account with no invite tried to sign in. */
  googleError?: boolean;
}

export function RegisterWizard({
  inviteToken,
  code,
  googleError
}: Readonly<RegisterWizardProps>) {
  const router = useRouter();

  // Plain state for values that come from the invite / Google / uploads rather
  // than from typed form fields.
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<Provider>("EMAIL");
  const [googleId, setGoogleId] = useState<string | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [registered, setRegistered] = useState(false);

  // --- Invite -------------------------------------------------------------
  const inviteQuery = useQuery({
    queryKey: ["invite", inviteToken],
    queryFn: () => validateInvite(inviteToken),
    enabled: Boolean(inviteToken),
    retry: false
  });
  const invite = inviteQuery.data as InviteInfo | undefined;

  useEffect(() => {
    if (invite) setEmail(invite.email);
  }, [invite]);

  // --- Google profile prefill ----------------------------------------------
  const profileQuery = useQuery({
    queryKey: ["google-profile", code],
    queryFn: () => getGoogleProfile(code as string),
    enabled: Boolean(code),
    retry: false
  });
  const googleProfile = profileQuery.data;

  useEffect(() => {
    if (!googleProfile) return;
    setProvider("GOOGLE");
    setGoogleId(googleProfile.googleId);
    setAvatarUrl(googleProfile.picture ?? undefined);
    form.setValue(
      "name",
      googleProfile.name?.trim() || googleProfile.email.split("@")[0] || "",
      { shouldValidate: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleProfile]);

  const isFounder = invite?.type === "FOUNDER";
  const steps = useMemo(
    () =>
      isFounder ? ["Account", "Firm setup", "Review"] : ["Account", "Review"],
    [isFounder]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const isLastStep = stepIndex === steps.length - 1;

  // --- Form ----------------------------------------------------------------
  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      password: "",
      accentColor: DEFAULT_ACCENT,
      tagline: ""
    }
  });
  const {
    register,
    trigger,
    getValues,
    watch,
    formState: { errors }
  } = form;
  const accentColor = watch("accentColor");
  const firmName = watch("firmName") || "";
  const tagline = watch("tagline") || "";
  const displayName = watch("name");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoFile(file: File) {
    setUploadingLogo(true);
    try {
      const result = await uploadOnboardingFile(file);
      setLogoUrl(result.secureUrl);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(getErrorMessage(err, "Logo upload failed"));
    } finally {
      setUploadingLogo(false);
    }
  }

  // --- Registration --------------------------------------------------------
  const registerMutation = useMutation({
    mutationFn: async () => {
      const values = getValues();
      return registerWithInvite({
        inviteToken,
        email,
        name: values.name,
        password: provider === "EMAIL" ? values.password : undefined,
        authProvider: provider,
        avatarUrl,
        googleId,
        ...(isFounder
          ? {
              firmName: values.firmName!,
              accentColor: values.accentColor || DEFAULT_ACCENT,
              logoUrl,
              tagline: values.tagline?.trim() || undefined
            }
          : {})
      });
    },
    onSuccess: () => {
      toast.success("Your account is ready!");
      setRegistered(true);
      setTimeout(() => router.push("/dashboard"), 1600);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Registration failed");
    }
  });

  async function onContinue() {
    let ok: boolean;
    if (stepIndex === 0) {
      ok =
        provider === "EMAIL"
          ? await trigger(["name", "password"])
          : await trigger(["name"]);
    } else if (stepIndex === 1 && isFounder) {
      ok = await trigger(["firmName", "accentColor", "tagline"]);
    } else {
      ok = true;
    }
    if (ok) setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  // Submit reads current values directly: every field was already validated at
  // its step via `trigger` (so the empty Google-mode password never blocks),
  // and the backend re-validates everything on arrival.
  const onSubmit = () => registerMutation.mutate();

  // --- Loading / error gates -----------------------------------------------
  if (inviteQuery.isLoading) {
    return (
      <Card className="skeuo-card bg-card text-card-foreground py-8">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
          <p className="text-muted-foreground text-xs font-semibold">
            Validating your invitation...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (inviteQuery.isError || !invite) {
    return (
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardHeader className="space-y-1">
          <CardTitle className="text-foreground flex items-center gap-2 text-xl font-black tracking-tight">
            <AlertTriangle className="text-destructive h-5 w-5" />
            Invitation unavailable
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs font-medium">
            {(inviteQuery.error as Error)?.message ||
              "This invite could not be found."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Invites are required to create an account — please ask the firm
            admin who invited you to resend a fresh link.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl text-xs font-bold"
            onClick={() => router.push("/login")}
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden py-4">
      <div className="from-primary via-primary/80 to-chart-2 absolute top-0 right-0 left-0 h-1 bg-linear-to-r" />
      <CardHeader className="space-y-1">
        <CardTitle className="text-foreground text-2xl font-black tracking-tight">
          {isFounder ? "Create your firm" : "Join your firm"}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs font-medium">
          {isFounder
            ? "You've been invited to found a new firm on LGA"
            : `You've been invited to join ${invite.firmName ?? "your firm"}`}
        </CardDescription>

        {/* Invite summary chip */}
        <div className="border-border bg-muted/40 flex items-center gap-2 rounded-xl border px-3 py-2">
          <Building2 className="text-primary h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-bold">
              {isFounder ? "New Firm Registration" : invite.firmName}
            </p>
            <p className="text-muted-foreground truncate text-[11px] font-medium">
              {invite.email} · {roleLabel[invite.role] ?? invite.role}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Google no-account notice */}
        {googleError && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              No account was found for that Google profile. Please ask your firm
              admin to invite you before signing up.
            </span>
          </div>
        )}

        {/* Profile-code failure (expired 5-min code) */}
        {code && profileQuery.isError && (
          <div className="border-warning/30 bg-warning/10 text-warning mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Your Google sign-in session expired. Please try again, or sign up
              manually below.
            </span>
          </div>
        )}

        {/* Stepper */}
        <Stepper steps={steps} current={stepIndex} />

        <div className="mt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${stepIndex}-${provider}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {stepIndex === 0 && (
                <AccountStep
                  provider={provider}
                  googleProfile={googleProfile}
                  email={email}
                  name={displayName}
                  avatarUrl={avatarUrl}
                  inviteToken={inviteToken}
                  onRegisterName={register("name")}
                  onRegisterPassword={register("password")}
                  errors={errors}
                />
              )}

              {stepIndex === 1 && isFounder && (
                <FirmStep
                  onRegisterFirmName={register("firmName")}
                  onRegisterAccentColor={register("accentColor")}
                  onRegisterTagline={register("tagline")}
                  errors={errors}
                  accentColor={accentColor ?? DEFAULT_ACCENT}
                  firmName={firmName}
                  tagline={tagline}
                  logoUrl={logoUrl}
                  uploadingLogo={uploadingLogo}
                  fileInputRef={fileInputRef}
                  onPickLogo={() => fileInputRef.current?.click()}
                  onLogoFile={handleLogoFile}
                  onClearLogo={() => setLogoUrl(undefined)}
                />
              )}

              {isLastStep && (
                <ReviewStep
                  isFounder={isFounder}
                  provider={provider}
                  email={email}
                  name={displayName}
                  avatarUrl={avatarUrl}
                  firmName={firmName}
                  accentColor={accentColor ?? DEFAULT_ACCENT}
                  tagline={tagline}
                  logoUrl={logoUrl}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs font-bold"
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0 || registerMutation.isPending}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={registerMutation.isPending || registered}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-xl px-5 text-xs font-bold shadow-xs"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onContinue}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-xl px-5 text-xs font-bold shadow-xs"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {registered && (
          <div className="border-success/30 bg-success/10 text-success mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Account created — taking you to your dashboard...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stepper({
  steps,
  current
}: Readonly<{ steps: string[]; current: number }>) {
  return (
    <ol
      className="flex items-center gap-1.5"
      aria-label="Registration progress"
    >
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition-colors",
                done && "border-success bg-success text-success-foreground",
                active && "border-primary bg-primary text-primary-foreground",
                !done &&
                  !active &&
                  "border-border bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  done ? "bg-success" : "bg-border"
                )}
              />
            )}
            <span
              className={cn(
                "sr-only",
                active && "text-foreground not-sr-only text-[11px] font-bold"
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface AccountStepProps {
  provider: Provider;
  googleProfile?: {
    googleId: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
  email: string;
  name: string;
  avatarUrl?: string;
  inviteToken: string;
  onRegisterName: UseFormRegisterReturn<"name">;
  onRegisterPassword: UseFormRegisterReturn<"password">;
  errors: {
    name?: { message?: string };
    password?: { message?: string };
  };
}

function AccountStep({
  provider,
  googleProfile,
  email,
  name,
  avatarUrl,
  inviteToken,
  onRegisterName,
  onRegisterPassword,
  errors
}: Readonly<AccountStepProps>) {
  if (provider === "GOOGLE" && googleProfile) {
    return (
      <div className="space-y-4">
        <div className="border-border bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
          <UserAvatar
            avatarUrl={avatarUrl}
            name={name || googleProfile.name}
            email={googleProfile.email}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-bold">
              {name || googleProfile.name || "Google account"}
            </p>
            <p className="text-muted-foreground truncate text-xs font-medium">
              {email}
            </p>
            <p className="text-success mt-0.5 text-[11px] font-semibold">
              ✓ Verified Google account — no password needed
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Your name and photo come from Google. You&apos;ll sign in with Google
          from now on.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <GoogleButton href={googleAuthUrl(inviteToken)} />

          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
              or sign up manually
            </span>
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label
          htmlFor="reg-email"
          className="text-foreground text-xs font-bold"
        >
          Invited Email
        </Label>
        <div className="border-border bg-input/50 text-muted-foreground flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{email}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-name" className="text-foreground text-xs font-bold">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="reg-name"
          type="text"
          placeholder="Jane Doe"
          {...onRegisterName}
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
          htmlFor="reg-password"
          className="text-foreground text-xs font-bold"
        >
          Password <span className="text-destructive">*</span>
        </Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="At least 8 characters"
          {...onRegisterPassword}
          className="bg-card border-border rounded-xl text-xs"
        />
        {errors.password && (
          <p className="text-destructive text-xs font-semibold">
            {errors.password.message}
          </p>
        )}
      </div>
    </div>
  );
}

interface FirmStepProps {
  onRegisterFirmName: UseFormRegisterReturn<"firmName">;
  onRegisterAccentColor: UseFormRegisterReturn<"accentColor">;
  onRegisterTagline: UseFormRegisterReturn<"tagline">;
  errors: {
    firmName?: { message?: string };
    accentColor?: { message?: string };
    tagline?: { message?: string };
  };
  accentColor: string;
  firmName: string;
  tagline: string;
  logoUrl?: string;
  uploadingLogo: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickLogo: () => void;
  onLogoFile: (file: File) => void;
  onClearLogo: () => void;
}

function FirmStep({
  onRegisterFirmName,
  onRegisterAccentColor,
  onRegisterTagline,
  errors,
  accentColor,
  firmName,
  logoUrl,
  uploadingLogo,
  fileInputRef,
  onPickLogo,
  onLogoFile,
  onClearLogo
}: Readonly<FirmStepProps>) {
  return (
    <div className="space-y-4">
      {/* Firm name */}
      <div className="space-y-1.5">
        <Label
          htmlFor="firm-name"
          className="text-foreground text-xs font-bold"
        >
          Firm Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="firm-name"
          type="text"
          placeholder="e.g. Sterling & Associates LLP"
          {...onRegisterFirmName}
          className="bg-card border-border rounded-xl text-xs"
        />
        {errors.firmName && (
          <p className="text-destructive text-xs font-semibold">
            {errors.firmName.message}
          </p>
        )}
      </div>

      {/* Brand accent */}
      <div className="space-y-1.5">
        <Label
          htmlFor="accent-color"
          className="text-foreground text-xs font-bold"
        >
          Brand Accent Color
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-1.5">
            {ACCENT_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set accent to ${color}`}
                aria-pressed={accentColor === color}
                onClick={() =>
                  onRegisterAccentColor.onChange({ target: { value: color } })
                }
                className={cn(
                  "h-7 w-7 rounded-full border-2 border-transparent transition-transform hover:scale-105",
                  accentColor === color &&
                    "border-foreground ring-primary/30 ring-2"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <Input
            id="accent-color"
            type="text"
            placeholder="#2563EB"
            {...onRegisterAccentColor}
            className="bg-card border-border w-24 rounded-xl text-center font-mono text-xs uppercase"
          />
        </div>
        {errors.accentColor && (
          <p className="text-destructive text-xs font-semibold">
            {errors.accentColor.message}
          </p>
        )}
      </div>

      {/* Logo upload */}
      <div className="space-y-1.5">
        <Label className="text-foreground text-xs font-bold">Firm Logo</Label>
        <div className="flex items-center gap-3">
          <FirmLogo
            logoUrl={logoUrl}
            name={firmName || "Your Firm"}
            accentColor={accentColor}
            size={48}
            rounded="rounded-xl"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload firm logo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onLogoFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-1 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPickLogo}
              disabled={uploadingLogo}
              className="flex-1 gap-1.5 rounded-xl text-xs font-bold"
            >
              {uploadingLogo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              {uploadingLogo
                ? "Uploading..."
                : logoUrl
                  ? "Replace logo"
                  : "Upload logo"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearLogo}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl text-xs"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-[11px] font-medium">
          Square PNG or JPG. If you skip this, we&apos;ll use your initials on
          the accent color.
        </p>
      </div>

      {/* Tagline */}
      <div className="space-y-1.5">
        <Label
          htmlFor="firm-tagline"
          className="text-foreground text-xs font-bold"
        >
          Tagline{" "}
          <span className="text-muted-foreground font-medium">(optional)</span>
        </Label>
        <Input
          id="firm-tagline"
          type="text"
          placeholder="e.g. Justice, delivered with precision"
          {...onRegisterTagline}
          className="bg-card border-border rounded-xl text-xs"
        />
        {errors.tagline && (
          <p className="text-destructive text-xs font-semibold">
            {errors.tagline.message}
          </p>
        )}
      </div>
    </div>
  );
}

interface ReviewStepProps {
  isFounder: boolean;
  provider: Provider;
  email: string;
  name: string;
  avatarUrl?: string;
  firmName: string;
  accentColor: string;
  tagline: string;
  logoUrl?: string;
}

function ReviewStep({
  isFounder,
  provider,
  email,
  name,
  avatarUrl,
  firmName,
  accentColor,
  tagline,
  logoUrl
}: Readonly<ReviewStepProps>) {
  return (
    <div className="space-y-3">
      {/* Account summary */}
      <div className="border-border bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
        <UserAvatar avatarUrl={avatarUrl} name={name} email={email} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-bold">
            {name || "—"}
          </p>
          <p className="text-muted-foreground truncate text-xs font-medium">
            {email}
          </p>
        </div>
        <span className="text-success text-[11px] font-bold">
          {provider === "GOOGLE" ? "Google" : "Email"}
        </span>
      </div>

      {/* Firm summary (founder only) */}
      {isFounder && (
        <div
          className="flex items-center gap-3 overflow-hidden rounded-xl p-3"
          style={{ backgroundColor: `${accentColor}1A` }}
        >
          <FirmLogo
            logoUrl={logoUrl}
            name={firmName || "Your Firm"}
            accentColor={accentColor}
            size={40}
            rounded="rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-bold">
              {firmName || "Your Firm"}
            </p>
            {tagline && (
              <p className="text-muted-foreground truncate text-xs font-medium">
                {tagline}
              </p>
            )}
          </div>
          <span
            className="ring-border h-2.5 w-2.5 shrink-0 rounded-full ring-2"
            style={{ backgroundColor: accentColor }}
            title={accentColor}
          />
        </div>
      )}

      <p className="text-muted-foreground text-[11px] font-medium">
        Review your details, then create your account. You can change all of
        this later from your profile.
      </p>
    </div>
  );
}
