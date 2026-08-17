import { RegisterWizard } from "@/components/auth/RegisterWizard";

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
        <p className="text-foreground text-sm font-bold">
          Registration is by invitation only
        </p>
        <p className="text-muted-foreground text-xs">
          Ask your firm administrator to send you an invite link to get started.
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
