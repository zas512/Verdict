"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
import type { ColumnConfig } from "@/types/tableTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Shield, UserPlus, Users } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const createMemberSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(["ADMIN", "ASSOCIATE"], {
    error: () => ({ message: "Role must be ADMIN or ASSOCIATE" })
  })
});

type CreateMemberValues = z.infer<typeof createMemberSchema>;

interface TeamMember {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "ASSOCIATE";
  firmId: string;
  isActive: boolean;
  createdAt: string;
}

function getRoleBadgeVariant(role: string): "navy" | "secondary" | "outline" {
  if (role === "OWNER") {
    return "navy";
  }
  if (role === "ADMIN") {
    return "secondary";
  }
  return "outline";
}

export function TeamManagementClient() {
  const queryClient = useQueryClient();

  const {
    data: teamMembers = [],
    isLoading,
    isRefetching,
    refetch
  } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Failed to fetch team members");
      }
      return res.json();
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "ASSOCIATE"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateMemberValues) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create team member");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Employee account created successfully.");
      reset();
      void queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create employee");
    }
  });

  function onSubmit(values: CreateMemberValues) {
    createMutation.mutate(values);
  }

  const columns: ColumnConfig<TeamMember>[] = [
    {
      key: "email",
      header: "EMPLOYEE EMAIL",
      sortable: true,
      accessor: (m) => m.email,
      render: (m) => (
        <span className="text-foreground font-bold">{m.email}</span>
      )
    },
    {
      key: "createdAt",
      header: "CREATED DATE",
      sortable: true,
      accessor: (m) => new Date(m.createdAt),
      render: (m) => (
        <span className="text-muted-foreground flex items-center gap-1 font-medium">
          <Shield className="text-primary h-3 w-3" />
          {new Date(m.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      key: "role",
      header: "ROLE",
      align: "right",
      sortable: true,
      accessor: (m) => m.role,
      render: (m) => (
        <Badge variant={getRoleBadgeVariant(m.role)}>{m.role}</Badge>
      )
    }
  ];

  const renderRosterContent = () => {
    return (
      <CustomTable
        columns={columns}
        data={teamMembers}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        loadingLabel="Loading firm roster..."
        emptyTitle="No team members registered yet."
        emptyDescription="Add a new employee to get started."
        caption="Team roster"
        pageSize={8}
      />
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* Create Member Form Card */}
      <Card className="border-border bg-card text-card-foreground shadow-xs md:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="text-primary h-5 w-5" />
            Create Firm Employee
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Register a new associate or admin under your firm. All created
            employees share your firm identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold">
                Employee Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="employee@laalglobal.com"
                {...register("email")}
                disabled={createMutation.isPending}
                className="bg-card border-border text-foreground focus-visible:ring-primary/40 rounded-xl"
              />
              {errors.email && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold">
                Initial Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                {...register("password")}
                disabled={createMutation.isPending}
                className="bg-card border-border text-foreground focus-visible:ring-primary/40 rounded-xl"
              />
              {errors.password && (
                <p className="text-destructive text-xs font-semibold">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs font-semibold">
                Assigned Role
              </Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs shadow-xs">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSOCIATE">
                        ASSOCIATE (Legal Associate)
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        ADMIN (Operational Assistant)
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

            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 h-10 w-full rounded-xl text-xs font-bold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Creating Employee..."
                : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Members List Card */}
      <Card className="border-border bg-card text-card-foreground shadow-xs md:col-span-7">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Users className="text-primary h-5 w-5" />
              Firm Team Roster
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              All active associates and staff under your firm tenant
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            aria-label="Refresh team list"
            title="Refresh team list"
            className="text-muted-foreground hover:text-foreground rounded-xl"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "text-primary animate-spin" : ""}`}
            />
          </Button>
        </CardHeader>
        <CardContent>{renderRosterContent()}</CardContent>
      </Card>
    </div>
  );
}
