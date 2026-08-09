"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { ColumnConfig } from "@/types/tableTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Phone, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// Add Party Schema
const addPartySchema = z
  .object({
    partyRole: z.enum([
      "PLAINTIFF",
      "DEFENDANT",
      "PETITIONER",
      "RESPONDENT",
      "ACCUSED",
      "COMPLAINANT",
      "OPPOSING_COUNSEL",
      "CO_COUNSEL",
      "WITNESS",
      "COURT_CLERK"
    ]),
    selectType: z.enum(["EXISTING", "NEW"]),
    partyId: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    isExternal: z.boolean()
  })
  .refine(
    (data) => {
      if (data.selectType === "EXISTING" && !data.partyId) return false;
      if (data.selectType === "NEW" && !data.name) return false;
      return true;
    },
    {
      message: "Either select an existing contact or enter a new name.",
      path: ["name"]
    }
  );

type AddPartyValues = z.infer<typeof addPartySchema>;

interface PartyContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isExternal: boolean;
}

interface MatterPartyLink {
  id: string;
  partyId: string;
  partyRole:
    | "PLAINTIFF"
    | "DEFENDANT"
    | "PETITIONER"
    | "RESPONDENT"
    | "ACCUSED"
    | "COMPLAINANT"
    | "OPPOSING_COUNSEL"
    | "CO_COUNSEL"
    | "WITNESS"
    | "COURT_CLERK";
  party?: PartyContact | null;
}

interface MatterPartiesProps {
  matter: {
    id: string;
    parties: MatterPartyLink[];
  };
  userRole: string | undefined;
}

export function MatterParties({
  matter,
  userRole
}: Readonly<MatterPartiesProps>) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const canEdit = userRole === "OWNER";

  // Fetch unique firm contacts for dropdown selection
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<
    PartyContact[]
  >({
    queryKey: ["parties-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/matters/parties");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canEdit && isOpen
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<AddPartyValues>({
    resolver: zodResolver(addPartySchema),
    defaultValues: {
      partyRole: "PLAINTIFF",
      selectType: "NEW",
      partyId: "",
      name: "",
      phone: "",
      email: "",
      isExternal: true
    }
  });

  const selectType = watch("selectType");

  const addPartyMutation = useMutation({
    mutationFn: async (values: AddPartyValues) => {
      const payload: {
        partyRole: string;
        partyId?: string;
        name?: string;
        phone?: string;
        email?: string;
        isExternal?: boolean;
      } = {
        partyRole: values.partyRole
      };
      if (values.selectType === "EXISTING") {
        payload.partyId = values.partyId;
      } else {
        payload.name = values.name;
        payload.phone = values.phone || undefined;
        payload.email = values.email || undefined;
        payload.isExternal = values.isExternal;
      }

      const res = await fetch(`/api/matters/${matter.id}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to link party to case");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Party successfully linked to case roster.");
      reset();
      setIsOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["matter", matter.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to link party");
    }
  });

  const onSubmit = (values: AddPartyValues) => {
    addPartyMutation.mutate(values);
  };

  const getRoleBadgeVariant = (role: string) => {
    if (["PLAINTIFF", "PETITIONER", "COMPLAINANT"].includes(role))
      return "emerald";
    if (["DEFENDANT", "RESPONDENT", "ACCUSED"].includes(role))
      return "destructive";
    if (role === "OPPOSING_COUNSEL") return "amber";
    return "outline";
  };

  const columns: ColumnConfig<MatterPartyLink>[] = [
    {
      key: "name",
      header: "Contact Name",
      sortable: true,
      accessor: (lnk) => lnk.party?.name || "Unresolved Party",
      render: (lnk) => {
        const name = lnk.party?.name || "Unresolved Party";
        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {initials}
            </div>
            <span>{name}</span>
          </div>
        );
      }
    },
    {
      key: "partyRole",
      header: "Case Association Role",
      sortable: true,
      accessor: (lnk) => lnk.partyRole,
      render: (lnk) => (
        <Badge
          variant={getRoleBadgeVariant(lnk.partyRole)}
          className="text-xs font-bold uppercase tracking-wide"
        >
          {lnk.partyRole.replace("_", " ")}
        </Badge>
      )
    },
    {
      key: "classification",
      header: "Scope Classification",
      sortable: true,
      accessor: (lnk) => (lnk.party?.isExternal ? "External" : "Internal"),
      render: (lnk) => (
        <Badge variant="outline" className="text-xs font-bold">
          {lnk.party?.isExternal ? "External Litigant" : "Internal Client"}
        </Badge>
      )
    },
    {
      key: "phone",
      header: "Phone",
      render: (lnk) => (
        <span className="flex items-center gap-1 text-muted-foreground font-semibold">
          <Phone className="h-3 w-3 text-primary/70" />
          {lnk.party?.phone || "N/A"}
        </span>
      )
    },
    {
      key: "email",
      header: "Email Address",
      render: (lnk) => (
        <span className="flex items-center gap-1 text-muted-foreground font-semibold">
          <Mail className="h-3 w-3 text-primary/70" />
          {lnk.party?.email || "N/A"}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Litigants & Contacts Roster
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            Manage opposing counsels, witnesses, plaintiffs, defendants, and
            clerks associated with this case.
          </p>
        </div>
        <div>
          {canEdit && (
            <Button
              onClick={() => setIsOpen(true)}
              className="skeuo-button-primary rounded-xl text-sm font-bold gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Link Litigant / Party</span>
            </Button>
          )}
        </div>
      </div>

      {/* Litigants Table Card */}
      <Card className="skeuo-card bg-card text-card-foreground">
        <CardContent className="p-0">
          <CustomTable
            columns={columns}
            data={matter.parties}
            rowKey={(lnk) => lnk.id}
            emptyIcon={
              <Users className="h-12 w-12 text-muted-foreground/60 mx-auto" />
            }
            emptyTitle="No linked parties"
            emptyDescription="Link litigants, counsel or witnesses to list them here."
            caption="Linked matter parties"
            pageSize={5}
          />
        </CardContent>
      </Card>

      {/* Add Party Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-card border-border rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Link Litigant / Opposing Counsel
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Add litigants, witnesses, opposing counsels or judicial clerks to
              the case.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Case Association Role */}
            <div className="space-y-1">
              <Label
                htmlFor="partyRole"
                className="text-xs font-bold text-foreground"
              >
                Case Association Role *
              </Label>
              <Controller
                control={control}
                name="partyRole"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLAINTIFF">
                        Plaintiff (Civil)
                      </SelectItem>
                      <SelectItem value="DEFENDANT">
                        Defendant (Civil)
                      </SelectItem>
                      <SelectItem value="PETITIONER">
                        Petitioner (Writ)
                      </SelectItem>
                      <SelectItem value="RESPONDENT">
                        Respondent (Writ)
                      </SelectItem>
                      <SelectItem value="ACCUSED">
                        Accused (Criminal)
                      </SelectItem>
                      <SelectItem value="COMPLAINANT">
                        Complainant (Criminal)
                      </SelectItem>
                      <SelectItem value="OPPOSING_COUNSEL">
                        Opposing Counsel
                      </SelectItem>
                      <SelectItem value="CO_COUNSEL">Co-Counsel</SelectItem>
                      <SelectItem value="WITNESS">Witness</SelectItem>
                      <SelectItem value="COURT_CLERK">Court Clerk</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Select existing or create inline */}
            <div className="space-y-2">
              <Label
                id="contactSourceLabel"
                className="text-xs font-bold text-foreground"
              >
                Contact Source
              </Label>
              <div
                role="group"
                aria-labelledby="contactSourceLabel"
                className="flex gap-4"
              >
                <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    value="NEW"
                    checked={selectType === "NEW"}
                    onChange={() => setValue("selectType", "NEW")}
                    className="text-primary focus:ring-primary/40"
                  />
                  <span>Create new contact inline</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    value="EXISTING"
                    checked={selectType === "EXISTING"}
                    onChange={() => setValue("selectType", "EXISTING")}
                    className="text-primary focus:ring-primary/40"
                  />
                  <span>Pick from existing contacts</span>
                </label>
              </div>
            </div>

            {/* Form Fields: Pick Existing */}
            {selectType === "EXISTING" && (
              <div className="space-y-1">
                <Label
                  htmlFor="partyId"
                  className="text-xs font-bold text-foreground"
                >
                  Select Firm Contact *
                </Label>
                {isLoadingContacts ? (
                  <div className="flex items-center text-sm text-muted-foreground gap-1.5 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Fetching contacts roster...</span>
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name="partyId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="rounded-xl h-8 font-semibold">
                          <SelectValue placeholder="Choose contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} (
                              {c.email || c.phone || "No contact info"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>
            )}

            {/* Form Fields: Create Inline */}
            {selectType === "NEW" && (
              <div className="space-y-3 p-3 border border-border/80 rounded-xl bg-muted/10">
                <div className="space-y-1">
                  <Label
                    htmlFor="name"
                    className="text-xs font-bold text-foreground"
                  >
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter name"
                    {...register("name")}
                    className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive font-semibold">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="phone"
                      className="text-xs font-bold text-foreground"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      placeholder="e.g. +923001234567"
                      {...register("phone")}
                      className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold text-foreground"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      placeholder="e.g. litigant@gmail.com"
                      {...register("email")}
                      className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isExternal"
                    {...register("isExternal")}
                    className="rounded text-primary focus:ring-primary/40 h-4 w-4"
                  />
                  <Label
                    htmlFor="isExternal"
                    className="text-sm font-semibold cursor-pointer select-none"
                  >
                    External entity (Opponent / Opposing Counsel / Clerk)
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  reset();
                }}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="skeuo-button-primary rounded-xl text-sm font-bold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Linking...</span>
                  </>
                ) : (
                  <span>Link Party</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
