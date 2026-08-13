"use client";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { CustomTable } from "@/components/ui/table";
import { SummaryStrip } from "../ui/summary-strip";
import { InsetSurface } from "../ui/inset-surface";
import type { ColumnConfig } from "@/types/tableTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  Crown,
  Eye,
  Mail,
  RefreshCw,
  Search,
  Shield,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// Validation Schema for creating a User / Associate under the firm
const createMemberSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.email({ message: "Valid email address is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(["ASSOCIATE", "ADMIN"], {
    error: () => ({ message: "Role must be ASSOCIATE or ADMIN" })
  })
});

type CreateMemberValues = z.infer<typeof createMemberSchema>;

interface FirmMember {
  id: string;
  email: string;
  name?: string | null;
  mustChangePassword?: boolean;
  role: "OWNER" | "ADMIN" | "ASSOCIATE" | "SUPER_ADMIN";
  firmId: string | null;
  isActive: boolean;
  createdAt: string;
  firm?: {
    id: string;
    name: string;
  } | null;
}

interface AssociatesClientProps {
  userRole: string;
}

function getBadgeVariant(role: string): "navy" | "secondary" | "outline" {
  if (role === "OWNER") return "navy";
  if (role === "ADMIN") return "secondary";
  return "outline";
}

export function AssociatesList({
  userRole
}: Readonly<AssociatesClientProps>) {
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FirmMember | null>(null);

  const canManage = userRole === "OWNER";

  // Fetch all firm members (Users having the same firmId)
  const {
    data: allMembers = [],
    isLoading,
    isRefetching,
    refetch,
    error
  } = useQuery<FirmMember[]>({
    queryKey: ["associates"],
    queryFn: async () => {
      console.log("[CLIENT useQuery] Fetching GET /api/associates...");
      const res = await fetch("/api/associates");
      console.log(
        "[CLIENT useQuery] GET /api/associates response status:",
        res.status
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[CLIENT useQuery] Error response:", errorData);
        throw new Error(errorData.message || "Failed to fetch firm members");
      }
      const data = await res.json();
      console.log(`[CLIENT useQuery] Received ${data?.length} members:`, data);
      return data;
    }
  });

  useEffect(() => {
    if (error) {
      toast.error(`Error loading firm roster: ${error.message}`);
    }
  }, [error]);

  // Fetch attendance for "On Leave" calculations
  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["attendance-firm-roster"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/firm");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canManage
  });

  const stats = useMemo(() => {
    const total = allMembers.length;
    const active = allMembers.filter((m) => m.isActive).length;
    const inactive = allMembers.filter((m) => !m.isActive).length;
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const onLeave = attendance.filter(
      (r) => r.date?.startsWith(todayKey) && r.status === "LEAVE"
    ).length;
    return {
      total,
      active: Math.max(0, active - onLeave),
      onLeave,
      inactive
    };
  }, [allMembers, attendance]);

  // Extract Firm Owner(s) and staff members
  const ownerMember = useMemo(
    () => allMembers.find((m) => m.role === "OWNER") || null,
    [allMembers]
  );

  const staffMembers = useMemo(
    () => allMembers.filter((m) => m.role !== "OWNER"),
    [allMembers]
  );

  const filteredMembers = useMemo(() => {
    return staffMembers.filter((m) => {
      const searchStr = `${m.name || ""} ${m.email} ${m.role}`.toLowerCase();
      return !globalFilter || searchStr.includes(globalFilter.toLowerCase());
    });
  }, [staffMembers, globalFilter]);

  // Form for creating new associate/user
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "ASSOCIATE"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateMemberValues) => {
      console.log(
        "[CLIENT createMutation] Posting to /api/associates:",
        values
      );
      const res = await fetch("/api/associates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create firm member");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Member account created successfully.");
      reset();
      setIsCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create firm member");
    }
  });

  function onSubmit(values: CreateMemberValues) {
    createMutation.mutate(values);
  }

  const columns: ColumnConfig<FirmMember>[] = [
    {
      key: "name",
      header: "FULL NAME",
      sortable: true,
      accessor: (m) => m.name ?? "",
      render: (m) => {
        const initials = m.name
          ? m.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : m.email.substring(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
              {initials}
            </div>
            <p className="font-bold text-foreground leading-tight">
              {m.name || "N/A"}
            </p>
          </div>
        );
      }
    },
    {
      key: "email",
      header: "MEMBER EMAIL",
      sortable: true,
      accessor: (m) => m.email,
      render: (m) => (
        <span className="text-xs text-muted-foreground font-medium">
          {m.email}
        </span>
      )
    },
    {
      key: "role",
      header: "ASSIGNED ROLE",
      sortable: true,
      accessor: (m) => m.role,
      render: (m) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {m.role === "OWNER"
            ? "Owner"
            : m.role === "ADMIN"
              ? "Admin"
              : "Associate"}
        </span>
      )
    },
    {
      key: "isActive",
      header: "STATUS",
      sortable: true,
      accessor: (m) => (m.isActive ? 1 : 0),
      render: (m) => (
        <div
          className={cn(
            "flex items-center gap-1.5 font-semibold text-xs",
            m.isActive ? "text-success" : "text-destructive"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              m.isActive ? "bg-success" : "bg-destructive"
            )}
          />
          <span>{m.isActive ? "Active" : "Inactive"}</span>
        </div>
      )
    },
    {
      key: "createdAt",
      header: "CREATED DATE",
      sortable: true,
      accessor: (m) => new Date(m.createdAt),
      render: (m) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(m.createdAt).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })}
        </span>
      )
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (m) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMember(m);
            }}
            className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold gap-1 rounded-md"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Roster Metrics */}
      <SummaryStrip
        metrics={[
          {
            label: "Total Roster",
            value: stats.total
          },
          {
            label: "Active",
            value: stats.active,
            accentColor: "var(--success)"
          },
          {
            label: "On Leave",
            value: stats.onLeave,
            accentColor: "var(--warning)"
          },
          {
            label: "Inactive",
            value: stats.inactive,
            accentColor: "var(--destructive)"
          }
        ]}
      />

      {/* ========================================================= */}
      {/* TOP SECTION: FIRM OWNER LEADERSHIP CARD */}
      {/* ========================================================= */}
      {ownerMember && (
        <Card className="border-border bg-card text-card-foreground shadow-xs relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
                  {ownerMember.email.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold">
                      {ownerMember.email}
                    </CardTitle>
                    <Badge
                      variant="navy"
                      className="gap-1 font-extrabold text-xs"
                    >
                      <Crown className="h-3 w-3 text-warning" />
                      FIRM OWNER
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      {ownerMember.firm?.name || "Laal Global Advisory"}
                    </span>
                    <span>•</span>
                    <span>Managing Principal & Administrator</span>
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="emerald" className="text-xs">
                  Active Owner Account
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMember(ownerMember)}
                  className="rounded-md text-xs font-bold border-border"
                >
                  View Owner Details
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Action Bar & Search */}
      <InsetSurface className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search associates"
            placeholder="Search associates & staff by email, role..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-card border-border text-xs rounded-md focus-visible:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="rounded-md text-xs font-semibold border-border gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          {canManage && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsInviteOpen(true)}
                className="rounded-md text-xs font-semibold border-border gap-1.5 h-9 px-4"
              >
                <Mail className="h-4 w-4" />
                <span>Invite Member</span>
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-bold gap-1.5 h-9 px-4 shadow-xs"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create Associate</span>
              </Button>
            </>
          )}
        </div>
      </InsetSurface>

      {/* ========================================================= */}
      {/* ASSOCIATES & STAFF TANSTACK DATA TABLE */}
      {/* ========================================================= */}
      <Card className="border-border bg-card text-card-foreground shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Firm Associates & Roster
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {staffMembers.length} enrolled staff members registered under firm
            </CardDescription>
          </div>
          <Badge variant="navy" className="text-xs">
            {staffMembers.filter((m) => m.isActive).length} Active Staff
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <CustomTable
            columns={columns}
            data={filteredMembers}
            rowKey={(m) => m.id}
            isLoading={isLoading}
            loadingLabel="Loading firm members..."
            emptyTitle="No staff or associate records found."
            emptyDescription="Create a new associate to get started."
            caption="Firm members and associates"
            pageSize={8}
            onRowClick={(m) => setSelectedMember(m)}
          />
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* CREATE ASSOCIATE DIALOG (MODAL WITH REQUIRED RED STARS *) */}
      {/* ========================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Create Associate Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a new associate or admin under your firm. Mandatory
              fields are marked with a red star (
              <span className="text-destructive font-bold">*</span>).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Full Name * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-bold text-foreground"
              >
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register("name")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.name && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Address * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-bold text-foreground"
              >
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="associate@laalglobal.com"
                {...register("email")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.email && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-bold text-foreground"
              >
                Account Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                {...register("password")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.password && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Role * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="role"
                className="text-xs font-bold text-foreground"
              >
                Assigned Role <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-9 text-xs shadow-xs">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSOCIATE">
                        ASSOCIATE (Legal Counsel)
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        ADMIN (Operations Assistant)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.role.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl"
              >
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* VIEW MEMBER DETAILS DIALOG */}
      {/* ========================================================= */}
      <Dialog
        open={Boolean(selectedMember)}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 pb-2">
                  <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black text-base flex items-center justify-center border border-primary/20 shadow-xs">
                    {selectedMember.name
                      ? selectedMember.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : selectedMember.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {selectedMember.name || selectedMember.email}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Role: {selectedMember.role}</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">
                        {selectedMember.firm?.name || "Laal Global Advisory"}
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedMember.name && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 col-span-2">
                      <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Full Name
                      </p>
                      <p className="font-bold text-foreground truncate mt-1">
                        {selectedMember.name}
                      </p>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      Email Address
                    </p>
                    <p className="font-bold text-foreground truncate mt-1">
                      {selectedMember.email}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      System Role
                    </p>
                    <p className="font-bold text-foreground mt-1">
                      {selectedMember.role}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Created Date
                    </p>
                    <p className="font-bold text-foreground mt-1">
                      {new Date(selectedMember.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Account Status
                    </p>
                    <p className="font-bold text-success mt-1">
                      {selectedMember.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      Password Status
                    </p>
                    <p className="font-bold text-foreground mt-1">
                      {selectedMember.mustChangePassword
                        ? "Pending Reset"
                        : "Set by User"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMember(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* INVITE MEMBER DIALOG (EMAIL LINK / RESEND) */}
      {/* ========================================================= */}
      <InviteMemberDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
    </div>
  );
}
