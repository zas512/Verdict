"use client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { FirmMember } from "@/types/associatesTypes";
import {
    Building2,
    Calendar,
    Mail,
    RefreshCw,
    Shield,
    Users,
} from "lucide-react";

interface ViewMemberDialogProps {
  member: FirmMember | null;
  onOpenChange: (open: boolean) => void;
}

export function ViewAssociateDialog({
  member,
  onOpenChange,
}: Readonly<ViewMemberDialogProps>) {
  return (
    <Dialog open={Boolean(member)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {member && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 pb-2">
                <div className="bg-primary text-primary-foreground border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border text-base font-black shadow-xs">
                  {member.name
                    ? member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : member.email.substring(0, 2).toUpperCase()}
                </div>

                <div>
                  <DialogTitle className="text-lg font-bold">
                    {member.name || member.email}
                  </DialogTitle>

                  <DialogDescription className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <span>Role: {member.role}</span>

                    <span>•</span>

                    <span className="text-foreground font-semibold">
                      {member.firm?.name || "Laal Global Advisory"}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {member.name && (
                  <div className="bg-muted/40 border-border/60 col-span-2 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Users className="text-primary h-3.5 w-3.5" />
                      Full Name
                    </p>

                    <p className="text-foreground mt-1 truncate font-bold">
                      {member.name}
                    </p>
                  </div>
                )}

                <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <Mail className="text-primary h-3.5 w-3.5" />
                    Email Address
                  </p>

                  <p className="text-foreground mt-1 truncate font-bold">
                    {member.email}
                  </p>
                </div>

                <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <Shield className="text-primary h-3.5 w-3.5" />
                    System Role
                  </p>

                  <p className="text-foreground mt-1 font-bold">
                    {member.role}
                  </p>
                </div>

                <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <Calendar className="text-primary h-3.5 w-3.5" />
                    Created Date
                  </p>

                  <p className="text-foreground mt-1 font-bold">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <Building2 className="text-primary h-3.5 w-3.5" />
                    Account Status
                  </p>

                  <p
                    className={
                      member.isActive
                        ? "text-success mt-1 font-bold"
                        : "text-destructive mt-1 font-bold"
                    }
                  >
                    {member.isActive ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                    <RefreshCw className="text-primary h-3.5 w-3.5" />
                    Password Status
                  </p>

                  <p className="text-foreground mt-1 font-bold">
                    {member.mustChangePassword
                      ? "Pending Reset"
                      : "Set by User"}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-border/60 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
