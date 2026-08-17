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
import { CustomTable } from "@/components/table";
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

export function AssociatesList({ userRole }: Readonly<AssociatesClientProps>) {
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
            <div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
              {initials}
            </div>
            <p className="text-foreground leading-tight font-bold">
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
        <span className="text-muted-foreground text-xs font-medium">
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
        <span className="text-muted-foreground text-xs font-semibold">
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
            "flex items-center gap-1.5 text-xs font-semibold",
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
        <span className="text-muted-foreground font-mono text-xs">
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
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1 rounded-md px-2.5 text-xs font-bold"
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
        <Card className="border-border bg-card text-card-foreground relative overflow-hidden shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="bg-primary text-primary-foreground border-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-xl font-black shadow-xs">
                  {ownerMember.email.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold">
                      {ownerMember.email}
                    </CardTitle>
                    <Badge
                      variant="navy"
                      className="gap-1 text-xs font-extrabold"
                    >
                      <Crown className="text-warning h-3 w-3" />
                      FIRM OWNER
                    </Badge>
                  </div>
                  <CardDescription className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                    <span className="text-foreground flex items-center gap-1 font-semibold">
                      <Building2 className="text-primary h-3.5 w-3.5" />
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
                  className="border-border rounded-md text-xs font-bold"
                >
                  View Owner Details
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Action Bar & Search */}
      <InsetSurface className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="text-muted-foreground absolute top-2.5 left-3.5 h-4 w-4" />
          <Input
            aria-label="Search associates"
            placeholder="Search associates & staff by email, role..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-card border-border focus-visible:ring-primary/40 rounded-md pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-border gap-1.5 rounded-md text-xs font-semibold"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching ? "text-primary animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          {canManage && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsInviteOpen(true)}
                className="border-border h-9 gap-1.5 rounded-md px-4 text-xs font-semibold"
              >
                <Mail className="h-4 w-4" />
                <span>Invite Member</span>
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 gap-1.5 rounded-md px-4 text-xs font-bold shadow-xs"
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
        <CardHeader className="border-border/60 flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="text-primary h-5 w-5" />
              Firm Associates & Roster
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
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
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UserPlus className="text-primary h-5 w-5" />
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
                className="text-foreground text-xs font-bold"
              >
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register("name")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.name && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Address * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-foreground text-xs font-bold"
              >
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="associate@laalglobal.com"
                {...register("email")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.email && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-foreground text-xs font-bold"
              >
                Account Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                {...register("password")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.password && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Role * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="role"
                className="text-foreground text-xs font-bold"
              >
                Assigned Role <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 rounded-xl text-xs shadow-xs">
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
                <p className="text-destructive text-xs font-semibold">
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold"
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
                  <div className="bg-primary text-primary-foreground border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border text-base font-black shadow-xs">
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
                    <DialogDescription className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      <span>Role: {selectedMember.role}</span>
                      <span>•</span>
                      <span className="text-foreground font-semibold">
                        {selectedMember.firm?.name || "Laal Global Advisory"}
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedMember.name && (
                    <div className="bg-muted/40 border-border/60 col-span-2 rounded-xl border p-2.5">
                      <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                        <Users className="text-primary h-3.5 w-3.5" />
                        Full Name
                      </p>
                      <p className="text-foreground mt-1 truncate font-bold">
                        {selectedMember.name}
                      </p>
                    </div>
                  )}

                  <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Mail className="text-primary h-3.5 w-3.5" />
                      Email Address
                    </p>
                    <p className="text-foreground mt-1 truncate font-bold">
                      {selectedMember.email}
                    </p>
                  </div>

                  <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Shield className="text-primary h-3.5 w-3.5" />
                      System Role
                    </p>
                    <p className="text-foreground mt-1 font-bold">
                      {selectedMember.role}
                    </p>
                  </div>

                  <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Calendar className="text-primary h-3.5 w-3.5" />
                      Created Date
                    </p>
                    <p className="text-foreground mt-1 font-bold">
                      {new Date(selectedMember.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Building2 className="text-primary h-3.5 w-3.5" />
                      Account Status
                    </p>
                    <p className="text-success mt-1 font-bold">
                      {selectedMember.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <RefreshCw className="text-primary h-3.5 w-3.5" />
                      Password Status
                    </p>
                    <p className="text-foreground mt-1 font-bold">
                      {selectedMember.mustChangePassword
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
