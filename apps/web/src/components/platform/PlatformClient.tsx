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
import { CustomTable } from "@/components/table";
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
            <div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
              {initials}
            </div>
            <p className="text-foreground leading-tight font-bold">
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
        <span className="text-foreground text-xs font-semibold">
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
        <span className="text-muted-foreground text-xs font-medium">
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
        <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
          <Calendar className="text-primary/70 h-3.5 w-3.5" />
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
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1 rounded-xl px-2.5 text-xs font-bold"
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
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              placeholder="Search firms..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="bg-card h-9 rounded-xl pl-9 text-xs"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsInviteOwnerOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-bold"
          >
            <Mail className="h-4 w-4" />
            <span>Invite Owner</span>
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Firm</span>
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card text-card-foreground shadow-xs">
        <CardHeader className="border-border/60 flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="text-primary h-5 w-5" />
              Registered Firms
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
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
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Building2 className="text-primary h-5 w-5" />
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
                className="text-foreground text-xs font-bold"
              >
                Firm Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Law Chambers"
                {...register("name")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.name && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Owner Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ownerName"
                className="text-foreground text-xs font-bold"
              >
                Owner Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerName"
                placeholder="John Doe"
                {...register("ownerName")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.ownerName && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.ownerName.message}
                </p>
              )}
            </div>

            {/* Owner Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ownerEmail"
                className="text-foreground text-xs font-bold"
              >
                Owner Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="john@acme.com"
                {...register("ownerEmail")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.ownerEmail && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.ownerEmail.message}
                </p>
              )}
            </div>

            {/* Owner Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ownerPassword"
                className="text-foreground text-xs font-bold"
              >
                Initial Owner Password{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerPassword"
                type="password"
                placeholder="At least 8 characters"
                {...register("ownerPassword")}
                className="bg-card rounded-xl text-xs"
              />
              {errors.ownerPassword && (
                <p className="text-destructive text-xs font-semibold">
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold"
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
                  <div className="bg-primary text-primary-foreground border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border text-base font-black shadow-xs">
                    {selectedFirm.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {selectedFirm.name}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      <span>
                        Tenant ID: {selectedFirm.id.substring(0, 8)}...
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/40 border-border/60 col-span-2 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <User className="text-primary h-3.5 w-3.5" />
                      Firm Owner Name
                    </p>
                    <p className="text-foreground mt-1 truncate font-bold">
                      {selectedFirm.ownerName}
                    </p>
                  </div>

                  <div className="bg-muted/40 border-border/60 col-span-2 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Mail className="text-primary h-3.5 w-3.5" />
                      Firm Owner Email
                    </p>
                    <p className="text-foreground mt-1 truncate font-bold">
                      {selectedFirm.ownerEmail}
                    </p>
                  </div>

                  <div className="bg-muted/40 border-border/60 rounded-xl border p-2.5">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                      <Calendar className="text-primary h-3.5 w-3.5" />
                      Registered Date
                    </p>
                    <p className="text-foreground mt-1 font-bold">
                      {new Date(selectedFirm.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Firm members */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                      <Users className="text-primary h-3.5 w-3.5" />
                      Members
                    </p>
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      {firmMembers.length} total
                    </span>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {membersLoading ? (
                      <p className="text-muted-foreground py-2 text-xs font-medium">
                        Loading members...
                      </p>
                    ) : firmMembers.length === 0 ? (
                      <p className="text-muted-foreground py-2 text-xs font-medium">
                        No members yet.
                      </p>
                    ) : (
                      firmMembers.map((member) => (
                        <div
                          key={member.id}
                          className="border-border/60 bg-muted/40 rounded-xl border p-2.5"
                        >
                          <p className="text-foreground truncate text-xs font-bold">
                            {member.name || member.email}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px] font-medium">
                            {member.email}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="navy" className="px-2 text-[10px]">
                              {member.role}
                            </Badge>
                            {member.mustChangePassword && (
                              <Badge
                                variant="amber"
                                className="px-2 text-[10px]"
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

              <DialogFooter className="border-border/60 flex-wrap gap-2 border-t pt-4">
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
                  className="gap-1.5 rounded-xl text-xs font-bold"
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
