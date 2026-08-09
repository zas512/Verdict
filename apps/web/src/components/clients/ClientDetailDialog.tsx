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
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground mt-0.5 break-words">
          {value || "Not set"}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex flex-wrap items-center gap-2">
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
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
              Loading client record...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Contact info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<User className="h-4 w-4" />} label="Client Type" value={client.clientType} />
              <InfoItem icon={<User className="h-4 w-4" />} label="Contact Person" value={client.contactPerson} />
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={client.phone} />
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={client.email} />
              <InfoItem icon={<Building className="h-4 w-4" />} label="CNIC / NTN" value={client.cnic} />
              <InfoItem icon={<Building className="h-4 w-4" />} label="Company Registration" value={client.companyRegistration} />
              <InfoItem icon={<MapPin className="h-4 w-4" />} label="Address" value={client.address} />
            </div>

            {client.notes && (
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Notes
                </p>
                <p className="text-sm text-foreground mt-1">{client.notes}</p>
              </div>
            )}

            {/* Linked matters */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Linked Matters ({client.matters?.length ?? 0})
              </h4>
              {client.matters && client.matters.length > 0 ? (
                <div className="space-y-2">
                  {client.matters.map((m) => (
                    <Link
                      key={m.id}
                      href={`/matters/${m.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 p-3 hover:bg-muted/20 hover:border-primary/40 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">
                          {m.firmCaseNumber}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.courtCaseNumber || m.caseType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="navy" className="text-[10px]">
                          {m.caseType}
                        </Badge>
                        <Badge
                          variant={m.status === "ACTIVE" ? "emerald" : "outline"}
                          className="text-[10px]"
                        >
                          {m.status}
                        </Badge>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-semibold text-muted-foreground mt-2">
                    No matters linked to this client yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
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
