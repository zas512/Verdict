"use client";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@/types/clientTypes";
import {
  Briefcase,
  Building,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ClientDetailDialogProps {
  clientId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailDialog({
  clientId,
  onOpenChange
}: Readonly<ClientDetailDialogProps>) {
  const open = Boolean(clientId);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["client-detail", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) {
        throw new Error("Failed to load client details");
      }
      return res.json();
    },
    enabled: open
  });

  const InfoItem = ({
    icon,
    label,
    value
  }: {
    icon: ReactNode;
    label: string;
    value?: string | null;
  }) => (
    <div className="flex items-start gap-3">
      <div className="bg-primary/10 text-primary border-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
          {label}
        </p>
        <p className="text-foreground mt-0.5 text-sm font-semibold break-words">
          {value || "Not set"}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="bg-card border-border max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground flex flex-wrap items-center gap-2 text-lg font-black">
            {client?.name ?? "Client Details"}
            {client && (
              <Badge
                variant={client.status === "ACTIVE" ? "emerald" : "outline"}
                className="text-xs font-bold"
              >
                {client.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !client ? (
          <div className="flex flex-col items-center justify-center space-y-3 p-12">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
              Loading client record...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Contact info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Client Type"
                value={client.clientType}
              />
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Contact Person"
                value={client.contactPerson}
              />
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={client.phone}
              />
              <InfoItem
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={client.email}
              />
              <InfoItem
                icon={<Building className="h-4 w-4" />}
                label="CNIC / NTN"
                value={client.cnic}
              />
              <InfoItem
                icon={<Building className="h-4 w-4" />}
                label="Company Registration"
                value={client.companyRegistration}
              />
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={client.address}
              />
            </div>

            {client.notes && (
              <div className="border-border bg-muted/10 rounded-xl border p-4">
                <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                  Notes
                </p>
                <p className="text-foreground mt-1 text-sm">{client.notes}</p>
              </div>
            )}

            {/* Linked matters */}
            <div>
              <h4 className="text-primary mb-2 text-xs font-bold tracking-wider uppercase">
                Linked Matters ({client.matters?.length ?? 0})
              </h4>
              {client.matters && client.matters.length > 0 ? (
                <div className="space-y-2">
                  {client.matters.map((m) => (
                    <Link
                      key={m.id}
                      href={`/matters/${m.id}`}
                      className="border-border bg-muted/10 hover:bg-muted/20 hover:border-primary/40 flex items-center justify-between gap-3 rounded-xl border p-3 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-bold">
                          {m.firmCaseNumber}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {m.courtCaseNumber || m.caseType}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="navy" className="text-[10px]">
                          {m.caseType}
                        </Badge>
                        <Badge
                          variant={
                            m.status === "ACTIVE" ? "emerald" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {m.status}
                        </Badge>
                        <ExternalLink className="text-muted-foreground h-3.5 w-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border-border rounded-xl border border-dashed p-6 text-center">
                  <Briefcase className="text-muted-foreground/50 mx-auto h-8 w-8" />
                  <p className="text-muted-foreground mt-2 text-sm font-semibold">
                    No matters linked to this client yet
                  </p>
                  <p className="text-muted-foreground/70 text-xs">
                    Attach this client when creating a new matter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
