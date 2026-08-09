"use client";
import { HeaderUpdater } from "@/components/layout/HeaderUpdater";
import {
  CreateFirmUserDialog,
  type FirmUser
} from "@/components/platform/CreateFirmUserDialog";
import { InviteFirmOwnerDialog } from "@/components/platform/InviteFirmOwnerDialog";
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
import { CustomTable } from "@/components/ui/table";
import type { ColumnConfig } from "@/types/tableTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  Mail,
  Plus,
  Search,
  User,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const createFirmSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Firm name must be at least 2 characters" }),
  ownerName: z
    .string()
    .min(2, { message: "Owner name must be at least 2 characters" }),
  ownerEmail: z.email({ message: "Valid owner email is required" }),
  ownerPassword: z
    .string()
    .min(8, { message: "Initial password must be at least 8 characters" })
});

type CreateFirmValues = z.infer<typeof createFirmSchema>;

interface Firm {
  id: string;
  name: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
}

export function PlatformClient() {
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [createFirm, setCreateFirm] = useState<Firm | null>(null);
  const [isInviteOwnerOpen, setIsInviteOwnerOpen] = useState(false);

  const {
    data: allFirms = [],
    isLoading,
    error
  } = useQuery<Firm[]>({
    queryKey: ["firms"],
    queryFn: async () => {
      const res = await fetch("/api/firms");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch firms");
      }
      return res.json();
    }
  });

  const { data: firmMembers = [], isLoading: membersLoading } = useQuery<
    FirmUser[]
  >({
    queryKey: ["firm-members", selectedFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/firms/${selectedFirm!.id}/users`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch firm members");
      }
      return res.json();
    },
    enabled: Boolean(selectedFirm)
  });

  useEffect(() => {
    if (error) {
      toast.error(`Error loading firms: ${error.message}`);
    }
  }, [error]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateFirmValues>({
    resolver: zodResolver(createFirmSchema),
    defaultValues: {
      name: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: ""
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateFirmValues) => {
      const res = await fetch("/api/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create firm");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Firm and owner account created successfully.");
      reset();
      setIsCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["firms"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create firm");
    }
  });

  function onSubmit(values: CreateFirmValues) {
    createMutation.mutate(values);
  }

  const filteredFirms = useMemo(() => {
    return allFirms.filter((firm) => {
      const searchStr =
        `${firm.name} ${firm.ownerName} ${firm.ownerEmail}`.toLowerCase();
      return !globalFilter || searchStr.includes(globalFilter.toLowerCase());
    });
  }, [allFirms, globalFilter]);

  const columns: ColumnConfig<Firm>[] = [
    {
      key: "name",
      header: "FIRM NAME",
      sortable: true,
      accessor: (firm) => firm.name,
      render: (firm) => {
        const initials = firm.name.substring(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
              {initials}
            </div>
            <p className="font-bold text-foreground leading-tight">
              {firm.name}
            </p>
          </div>
        );
      }
    },
    {
      key: "ownerName",
      header: "OWNER NAME",
      sortable: true,
      accessor: (firm) => firm.ownerName,
      render: (firm) => (
        <span className="text-xs text-foreground font-semibold">
          {firm.ownerName}
        </span>
      )
    },
    {
      key: "ownerEmail",
      header: "OWNER EMAIL",
      sortable: true,
      accessor: (firm) => firm.ownerEmail,
      render: (firm) => (
        <span className="text-xs text-muted-foreground font-medium">
          {firm.ownerEmail}
        </span>
      )
    },
    {
      key: "createdAt",
      header: "CREATED DATE",
      sortable: true,
      accessor: (firm) => new Date(firm.createdAt),
      render: (firm) => (
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-primary/70" />
          {new Date(firm.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "center",
      render: (firm) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFirm(firm);
            }}
            className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold gap-1 rounded-xl"
          >
            <span>View</span>
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <HeaderUpdater title="Multi-Tenant Firms" breadcrumb="Platform / Firms" />
      {/* Top Actions/Search Bar Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search firms..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-card text-xs rounded-xl h-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsInviteOwnerOpen(true)}
            className="h-9 px-4 text-xs font-bold flex items-center gap-1.5 rounded-xl shrink-0"
          >
            <Mail className="h-4 w-4" />
            <span>Invite Owner</span>
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 rounded-xl shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Firm</span>
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card text-card-foreground shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Registered Firms
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {allFirms.length} tenants registered under the platform
            </CardDescription>
          </div>
          <Badge variant="navy" className="text-xs">
            {allFirms.length} Active Firms
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <CustomTable
            columns={columns}
            data={filteredFirms}
            rowKey={(firm) => firm.id}
            isLoading={isLoading}
            loadingLabel="Loading firms..."
            emptyTitle="No registered firms found."
            emptyDescription="Create a new firm to get started."
            caption="Registered tenant firms"
            pageSize={8}
            onRowClick={(firm) => setSelectedFirm(firm)}
          />
        </CardContent>
      </Card>

      {/* CREATE FIRM DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Create Tenant Firm
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a new tenant law firm and create its administrator/owner
              account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Firm Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-bold text-foreground"
              >
                Firm Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Law Chambers"
                {...register("name")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.name && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Owner Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ownerName"
                className="text-xs font-bold text-foreground"
              >
                Owner Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerName"
                placeholder="John Doe"
                {...register("ownerName")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.ownerName && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.ownerName.message}
                </p>
              )}
            </div>

            {/* Owner Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ownerEmail"
                className="text-xs font-bold text-foreground"
              >
                Owner Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="john@acme.com"
                {...register("ownerEmail")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.ownerEmail && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.ownerEmail.message}
                </p>
              )}
            </div>

            {/* Owner Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ownerPassword"
                className="text-xs font-bold text-foreground"
              >
                Initial Owner Password{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerPassword"
                type="password"
                placeholder="At least 8 characters"
                {...register("ownerPassword")}
                className="bg-card text-xs rounded-xl"
              />
              {errors.ownerPassword && (
                <p className="text-xs text-destructive font-semibold">
                  {errors.ownerPassword.message}
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
                {createMutation.isPending ? "Creating..." : "Create Firm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW FIRM DETAILS DIALOG */}
      <Dialog
        open={Boolean(selectedFirm)}
        onOpenChange={(open) => {
          if (!open) setSelectedFirm(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selectedFirm && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 pb-2">
                  <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black text-base flex items-center justify-center border border-primary/20 shadow-xs">
                    {selectedFirm.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {selectedFirm.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>
                        Tenant ID: {selectedFirm.id.substring(0, 8)}...
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 col-span-2">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Firm Owner Name
                    </p>
                    <p className="font-bold text-foreground truncate mt-1">
                      {selectedFirm.ownerName}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 col-span-2">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      Firm Owner Email
                    </p>
                    <p className="font-bold text-foreground truncate mt-1">
                      {selectedFirm.ownerEmail}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Registered Date
                    </p>
                    <p className="font-bold text-foreground mt-1">
                      {new Date(selectedFirm.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Firm members */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Members
                    </p>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {firmMembers.length} total
                    </span>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {membersLoading ? (
                      <p className="py-2 text-xs font-medium text-muted-foreground">
                        Loading members...
                      </p>
                    ) : firmMembers.length === 0 ? (
                      <p className="py-2 text-xs font-medium text-muted-foreground">
                        No members yet.
                      </p>
                    ) : (
                      firmMembers.map((member) => (
                        <div
                          key={member.id}
                          className="rounded-xl border border-border/60 bg-muted/40 p-2.5"
                        >
                          <p className="truncate text-xs font-bold text-foreground">
                            {member.name || member.email}
                          </p>
                          <p className="truncate text-[11px] font-medium text-muted-foreground">
                            {member.email}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="navy"
                              className="text-[10px] px-2"
                            >
                              {member.role}
                            </Badge>
                            {member.mustChangePassword && (
                              <Badge
                                variant="amber"
                                className="text-[10px] px-2"
                              >
                                Pending reset
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              <DialogFooter className="pt-4 border-t border-border/60 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFirm(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateFirm(selectedFirm)}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Create User
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* INVITE FIRM OWNER DIALOG (email → owner onboarding creates the firm) */}
      <InviteFirmOwnerDialog
        open={isInviteOwnerOpen}
        onOpenChange={setIsInviteOwnerOpen}
        onInvited={() => {
          void queryClient.invalidateQueries({ queryKey: ["firms"] });
        }}
      />

      {/* CREATE USER DIALOG (manual: name/email/role/initial password) */}
      <CreateFirmUserDialog
        firm={createFirm ?? { id: "", name: "" }}
        open={Boolean(createFirm)}
        onOpenChange={(open) => {
          if (!open) setCreateFirm(null);
        }}
        onCreated={() => {
          if (createFirm) {
            void queryClient.invalidateQueries({
              queryKey: ["firm-members", createFirm.id]
            });
          }
        }}
      />
    </div>
  );
}
