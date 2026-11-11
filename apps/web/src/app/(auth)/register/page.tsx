import { RegisterWizard } from "@/components/auth/RegisterWizard";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your Account",
  description:
    "Accept your invitation and set up your Verdict account — law-firm management for matters, clients, tasks, attendance, and expenses.",
  alternates: { canonical: "/register" }
};

interface RegisterPageProps {
  searchParams: Promise<{
    invite?: string;
    code?: string;
    google?: string;
    error?: string;
  }>;
}

export default async function RegisterPage({
  searchParams
}: Readonly<RegisterPageProps>) {
  const { invite, code, google, error } = await searchParams;

  // No invite → we can't render a registration (registration is invite-only).
  if (!invite) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-foreground text-sm font-bold">
          Registration is by invitation only
        </h1>
        <p className="text-muted-foreground text-xs">
          Ask your firm administrator to send you an invite link to get started.
        </p>
        <p className="text-muted-foreground text-xs">
          <Link href="/login" className="text-foreground font-semibold underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <RegisterWizard
      inviteToken={invite}
      code={code}
      googleError={google === "no_account" || Boolean(error)}
    />
  );
}
