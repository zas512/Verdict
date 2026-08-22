"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Building2,
  ShieldCheck,
  Activity,
  Users,
  Calendar
} from "lucide-react";
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
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Platform Admin Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
              Total Tenant Firms
            </CardTitle>
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-foreground text-3xl font-black tracking-tight">
              {isLoading ? "..." : firms.length}
            </div>
            <div className="bg-muted mt-2.5 h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[100%]" />
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-semibold">
              Multi-tenant system active
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
              Security Boundary
            </CardTitle>
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl font-bold">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-foreground text-3xl font-black tracking-tight">
              Isolated
            </div>
            <div className="bg-muted mt-2.5 h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[100%]" />
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-semibold">
              Tenant database isolation lock active
            </p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
              Platform Health
            </CardTitle>
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl font-bold">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-success flex items-center gap-2 text-2xl font-black tracking-tight">
              <span className="bg-success h-2.5 w-2.5 animate-pulse rounded-full" />
              Operational
            </div>
            <div className="bg-muted mt-2.5 h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-success h-full w-[100%]" />
            </div>
            <p className="text-muted-foreground mt-2 text-xs font-semibold">
              All platform services reporting healthy
            </p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
              Platform Role
            </CardTitle>
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl font-bold">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-foreground truncate text-xl font-extrabold">
              Global Admin
            </div>
            <p className="text-muted-foreground mt-3 truncate text-xs font-semibold">
              Full system control access
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="skeuo-card bg-card text-card-foreground relative overflow-hidden md:col-span-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Building2 className="text-primary h-4 w-4" />
              Recently Registered Tenant Firms
            </CardTitle>
            <CardDescription className="text-xs">
              Quick view of the latest tenant firms added to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground py-6 text-center text-xs">
                Loading recent firms...
              </div>
            ) : recentFirms.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-xs">
                No firms registered yet.
              </div>
            ) : (
              <div className="space-y-4">
                {recentFirms.map((firm) => (
                  <div
                    key={firm.id}
                    className="bg-muted/40 border-border/60 flex items-center justify-between rounded-xl border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                        {firm.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-foreground text-xs font-bold">
                          {firm.name}
                        </p>
                        <p className="text-muted-foreground text-xs font-medium">
                          Owner: {firm.ownerName} ({firm.ownerEmail})
                        </p>
                      </div>
                    </div>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
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
