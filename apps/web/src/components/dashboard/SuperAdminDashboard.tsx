"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ShieldCheck, Activity, Users, Calendar } from "lucide-react";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";

interface Firm {
  id: string;
  name: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
}

export function SuperAdminDashboard() {
  const { data: firms = [], isLoading } = useQuery<Firm[]>({
    queryKey: ["firms"],
    queryFn: async () => {
      const res = await fetch("/api/firms");
      if (!res.ok) throw new Error("Failed to fetch firms");
      return res.json();
    }
  });

  const recentFirms = [...firms]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Platform Admin Dashboard" breadcrumb="Overview" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">

          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Total Tenant Firms
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {isLoading ? "..." : firms.length}
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[100%]" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-2">
              Multi-tenant system active
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">

          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Security Boundary
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-black text-foreground tracking-tight">
              Isolated
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[100%]" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-2">
              Tenant database isolation lock active
            </p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">

          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Platform Health
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-black text-success tracking-tight flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
              Operational
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-success w-[100%]" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-2">
              All platform services reporting healthy
            </p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">

          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Platform Role
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xl font-extrabold text-foreground truncate">
              Global Admin
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-3 truncate">
              Full system control access
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="skeuo-card md:col-span-12 bg-card text-card-foreground relative overflow-hidden">

          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Recently Registered Tenant Firms
            </CardTitle>
            <CardDescription className="text-xs">
              Quick view of the latest tenant firms added to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading recent firms...</div>
            ) : recentFirms.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">No firms registered yet.</div>
            ) : (
              <div className="space-y-4">
                {recentFirms.map((firm) => (
                  <div key={firm.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                        {firm.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{firm.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">Owner: {firm.ownerName} ({firm.ownerEmail})</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(firm.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
