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
import { inviteFounder, type InviteResult } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const inviteSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" })
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteFirmOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after an invite is created so the firm list can refresh. */
  onInvited?: () => void;
}

/**
 * SUPER_ADMIN invites a future firm owner by email. The recipient goes through
 * the full onboarding flow (Account → Firm setup → Review) which creates their
 * new firm and OWNER account.
 */
export function InviteFirmOwnerDialog({
  open,
  onOpenChange,
  onInvited
}: Readonly<InviteFirmOwnerDialogProps>) {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" }
  });

  // Reset state whenever the dialog opens fresh.
  useEffect(() => {
    if (open) {
      setResult(null);
      setCopied(false);
      reset();
    }
  }, [open, reset]);

  const inviteMutation = useMutation({
    mutationFn: (values: InviteFormValues) => inviteFounder(values.email),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Invitation sent to ${data.email}`);
      onInvited?.();
    },
    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Failed to create invitation"));
    }
  });

  const onSubmit = handleSubmit((values) => inviteMutation.mutate(values));

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the invite link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Mail className="text-primary h-5 w-5" />
            Invite Firm Owner
          </DialogTitle>
          <DialogDescription className="text-xs">
            Send an onboarding link to a future firm owner. They create their
            firm&apos;s account and complete setup from the link.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 pt-2">
            <div className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Invite created for {result.email}. Share this link with them:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={result.inviteUrl}
                className="bg-card border-border rounded-xl font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyLink}
                aria-label="Copy invite link"
                className="shrink-0 rounded-xl"
              >
                {copied ? (
                  <Check className="text-success h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
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
                  reset();
                }}
              >
                Invite another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="founder-email"
                className="text-foreground text-xs font-bold"
              >
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="founder-email"
                type="email"
                placeholder="owner@futurefirm.com"
                {...register("email")}
                disabled={inviteMutation.isPending}
                className="bg-card border-border rounded-xl text-xs"
              />
              <p className="text-muted-foreground text-[11px] font-medium">
                This person becomes the firm&apos;s OWNER and onboards to create
                their firm.
              </p>
              {errors.email && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={inviteMutation.isPending}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl text-xs font-bold"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Invite
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
