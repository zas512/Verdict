"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Calendar,
  User,
  Clock,
  Briefcase,
  Building,
  Users,
  ShieldAlert
} from "lucide-react";

interface MatterOverviewProps {
  matter: {
    id: string;
    firmCaseNumber: string;
    courtCaseNumber?: string | null;
    cnr?: string | null;
    caseType: string;
    court?: string | null;
    bench?: string | null;
    presidingJudge?: string | null;
    status: string;
    filingDate?: string | null;
    clientName: string;
    clientId?: string | null;
    client?: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
    currentStage?: {
      name: string;
    } | null;
    associates: Array<{
      id: string;
      associateId: string;
      role?: string | null;
      associate?: {
        fullName: string;
        email: string;
        designation: string;
      } | null;
    }>;
  };
}

export function MatterOverview({ matter }: Readonly<MatterOverviewProps>) {
  // Format Date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    let variant: "emerald" | "destructive" | "amber" | "outline" = "outline";
    if (status === "ACTIVE") variant = "emerald";
    else if (status === "DECIDED") variant = "amber";
    else if (status === "CLOSED" || status === "ARCHIVED")
      variant = "destructive";

    return (
      <Badge variant={variant} className="text-xs font-bold uppercase">
        {status}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Primary Details Column */}
      <div className="space-y-6 lg:col-span-2">
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardHeader className="border-border/60 border-b pb-3">
            <CardTitle className="text-primary text-base font-bold tracking-wider uppercase">
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            {/* Client Name */}
            <div className="flex items-start gap-3">
              <User className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Client Name
                </p>
                <p className="text-foreground mt-0.5 text-base font-bold">
                  {matter.client?.name || matter.clientName}
                </p>
              </div>
            </div>

            {/* Case Type */}
            <div className="flex items-start gap-3">
              <Briefcase className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Case Classification
                </p>
                <div className="mt-0.5">
                  <Badge variant="navy" className="text-sm font-bold uppercase">
                    {matter.caseType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Internal Ref */}
            <div className="flex items-start gap-3">
              <Scale className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Firm Reference #
                </p>
                <p className="text-foreground mt-0.5 text-base font-bold">
                  {matter.firmCaseNumber}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Matter Status
                </p>
                <div className="mt-0.5">{getStatusBadge(matter.status)}</div>
              </div>
            </div>

            {/* Filing Date */}
            <div className="flex items-start gap-3">
              <Calendar className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Filing Date
                </p>
                <p className="text-foreground mt-0.5 text-base font-semibold">
                  {formatDate(matter.filingDate)}
                </p>
              </div>
            </div>

            {/* Current Stage */}
            <div className="flex items-start gap-3">
              <Clock className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Current Stage
                </p>
                <p className="text-foreground mt-0.5 text-base font-semibold">
                  {matter.currentStage?.name || "No procedural stage assigned"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Court Information Card */}
        <Card className="skeuo-card bg-card text-card-foreground">
          <CardHeader className="border-border/60 border-b pb-3">
            <CardTitle className="text-primary text-base font-bold tracking-wider uppercase">
              Court Jurisdiction & Bench Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            {/* Court */}
            <div className="flex items-start gap-3">
              <Building className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Court Venue
                </p>
                <p className="text-foreground mt-0.5 text-base font-semibold">
                  {matter.court || "Not specified / Pending"}
                </p>
              </div>
            </div>

            {/* Bench */}
            <div className="flex items-start gap-3">
              <Scale className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Bench Reference
                </p>
                <p className="text-foreground mt-0.5 text-base font-semibold">
                  {matter.bench || "Not specified"}
                </p>
              </div>
            </div>

            {/* Presiding Judge */}
            <div className="flex items-start gap-3">
              <User className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Presiding Judge
                </p>
                <p className="text-foreground mt-0.5 text-base font-semibold">
                  {matter.presidingJudge || "Not specified / Honorable Judge"}
                </p>
              </div>
            </div>

            {/* Court Case Number */}
            <div className="flex items-start gap-3">
              <Briefcase className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  Court Case ID
                </p>
                <p className="text-foreground mt-0.5 text-base font-semibold">
                  {matter.courtCaseNumber || "Not registered yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Team Column */}
      <div className="space-y-6">
        <Card className="skeuo-card bg-card text-card-foreground h-full">
          <CardHeader className="border-border/60 border-b pb-3">
            <CardTitle className="text-primary flex items-center gap-2 text-base font-bold tracking-wider uppercase">
              <Users className="h-4 w-4" />
              <span>Assigned Legal Team</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {matter.associates.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="text-muted-foreground/50 mx-auto h-8 w-8" />
                <p className="text-muted-foreground mt-2 text-sm font-semibold">
                  No counsel assigned
                </p>
              </div>
            ) : (
              matter.associates.map((item) => {
                const name = item.associate?.fullName || "Unresolved Associate";
                const email = item.associate?.email || "";
                const designation = item.associate?.designation || "Counsel";
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={item.id}
                    className="border-border bg-muted/10 hover:bg-muted/20 flex items-center gap-3 rounded-xl border p-3 shadow-2xs transition-all"
                  >
                    <div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-extrabold">
                        {name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {email}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-primary bg-primary/10 border-primary/15 rounded-full border px-1.5 py-0.5 text-xs font-extrabold uppercase">
                          {item.role || "Counsel"}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {designation}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
