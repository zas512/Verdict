"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  FolderClosed,
  Plus,
  Loader2,
  ExternalLink,
  History,
  GitCommit,
  UploadCloud,
  ChevronDown,
  ChevronRight
} from "lucide-react";

// Create Document Schema
const createDocumentSchema = z.object({
  title: z.string().min(2, { message: "Document title is required" }),
  category: z.enum([
    "PLEADING",
    "EVIDENCE",
    "CORRESPONDENCE",
    "ORDER_SHEET",
    "AFFIDAVIT",
    "CONTRACT",
    "OTHER"
  ]),
  fileUrl: z.url({ message: "Provide a valid file URL" })
});

type CreateDocumentValues = z.infer<typeof createDocumentSchema>;

// Upload Version Schema
const uploadVersionSchema = z.object({
  fileUrl: z.url({ message: "Provide a valid file URL" }),
  changeNotes: z
    .string()
    .min(3, { message: "Provide change notes for this revision" })
});

type UploadVersionValues = z.infer<typeof uploadVersionSchema>;

interface CaseDocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  uploadedById: string;
  changeNotes?: string | null;
  isCurrent: boolean;
  createdAt: string;
}

interface CaseDocument {
  id: string;
  matterId: string;
  title: string;
  category:
    | "PLEADING"
    | "EVIDENCE"
    | "CORRESPONDENCE"
    | "ORDER_SHEET"
    | "AFFIDAVIT"
    | "CONTRACT"
    | "OTHER";
  createdAt: string;
  versions: CaseDocumentVersion[];
}

interface MatterDocumentsProps {
  id: string;
  userRole: string | undefined;
}

export function MatterDocuments({
  id,
  userRole
}: Readonly<MatterDocumentsProps>) {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>(
    {}
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);

  const canEdit = userRole === "OWNER" || userRole === "ASSOCIATE";

  // 1. Fetch Documents list
  const {
    data: documents = [],
    isLoading,
    refetch,
    isRefetching
  } = useQuery<CaseDocument[]>({
    queryKey: ["matter-documents", id],
    queryFn: async () => {
      const res = await fetch(`/api/matters/${id}/documents`);
      if (!res.ok) {
        throw new Error("Failed to fetch case documents");
      }
      return res.json();
    }
  });

  // Forms setup
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    control: controlCreate,
    formState: { errors: errorsCreate, isSubmitting: isSubmittingCreate }
  } = useForm<CreateDocumentValues>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: "",
      category: "PLEADING",
      fileUrl: ""
    }
  });

  const {
    register: registerVersion,
    handleSubmit: handleSubmitVersion,
    reset: resetVersion,
    formState: { errors: errorsVersion, isSubmitting: isSubmittingVersion }
  } = useForm<UploadVersionValues>({
    resolver: zodResolver(uploadVersionSchema),
    defaultValues: {
      fileUrl: "",
      changeNotes: ""
    }
  });

  // Create logical document mutation
  const createMutation = useMutation({
    mutationFn: async (values: CreateDocumentValues) => {
      const res = await fetch(`/api/matters/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to create document");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Logical document created and version #1 indexed.");
      resetCreate();
      setIsCreateOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["matter-documents", id]
      });
      void queryClient.invalidateQueries({ queryKey: ["matter-timeline", id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to upload document");
    }
  });

  // Create new version mutation
  const versionMutation = useMutation({
    mutationFn: async (values: UploadVersionValues) => {
      if (!selectedDoc) return;
      const res = await fetch(
        `/api/case-documents/${selectedDoc.id}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        }
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to submit new version");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Document revised and current version pointer updated.");
      resetVersion();
      setIsVersionOpen(false);
      setSelectedDoc(null);
      void queryClient.invalidateQueries({
        queryKey: ["matter-documents", id]
      });
      void queryClient.invalidateQueries({ queryKey: ["matter-timeline", id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add revision");
    }
  });

  const onCreateSubmit = (values: CreateDocumentValues) => {
    createMutation.mutate(values);
  };

  const onVersionSubmit = (values: UploadVersionValues) => {
    versionMutation.mutate(values);
  };

  const toggleExpandDoc = (docId: string) => {
    setExpandedDocIds((prev) => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  const openVersionDialog = (doc: CaseDocument) => {
    setSelectedDoc(doc);
    resetVersion();
    setIsVersionOpen(true);
  };

  // Group by folders
  const getCategoryIcon = () => {
    return <FolderClosed className="text-primary/80 h-10 w-10 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-muted-foreground text-sm font-bold tracking-wider uppercase">
            Case Documents Directory
          </h3>
          <p className="text-muted-foreground text-sm font-medium">
            Manage version-controlled petitions, evidentiary scans, and court
            order sheets.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="skeuo-button-primary gap-1 rounded-xl text-sm font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Document</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-border rounded-xl text-sm font-semibold"
          >
            Sync Files
          </Button>
        </div>
      </div>

      {/* Grid of Documents */}
      {isLoading ? (
        <div className="flex items-center justify-center space-y-2 p-16">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
          <span className="text-muted-foreground ml-2 text-sm font-bold tracking-wider uppercase">
            Loading case file indexes...
          </span>
        </div>
      ) : documents.length === 0 ? (
        <div className="border-border bg-card space-y-2 rounded-2xl border-2 border-dashed p-16 text-center">
          <FolderClosed className="text-muted-foreground/60 mx-auto h-12 w-12" />
          <p className="text-foreground text-base font-bold">
            No documents uploaded
          </p>
          <p className="text-muted-foreground text-sm">
            Upload lawsuit file scans, pleading drafts, or evidence PDFs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const isExpanded = expandedDocIds[doc.id];
            const currentVersion =
              doc.versions.find((v) => v.isCurrent) || doc.versions[0];

            return (
              <Card
                key={doc.id}
                className="skeuo-card bg-card text-card-foreground overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    {/* Icon & Title */}
                    <div className="flex flex-1 items-center gap-4">
                      {getCategoryIcon()}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-foreground max-w-[200px] truncate text-sm font-black sm:max-w-[280px]">
                            {doc.title}
                          </h4>
                          <Badge
                            variant="navy"
                            className="px-2 py-0.5 text-xs font-bold uppercase"
                          >
                            {doc.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Uploaded:{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                          {currentVersion &&
                            ` • Current Version: v${currentVersion.versionNumber}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-3">
                      {currentVersion && (
                        <a
                          href={currentVersion.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary bg-primary/5 border-primary/10 inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold hover:underline"
                        >
                          <span>Open File</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVersionDialog(doc)}
                          className="border-border h-8 gap-1 rounded-xl text-sm font-bold"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          <span>Revise</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandDoc(doc.id)}
                        className="h-8 gap-1 rounded-xl text-sm font-bold"
                      >
                        <History className="text-muted-foreground h-3.5 w-3.5" />
                        <span>Revisions</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Revisions history */}
                  {isExpanded && (
                    <div className="border-border/40 bg-muted/10 mt-4 space-y-2 rounded-xl border border-t p-3 pt-3 pl-14">
                      <h5 className="text-muted-foreground pb-1 text-xs font-black tracking-wider uppercase">
                        Version History Ledger
                      </h5>

                      {doc.versions
                        .sort((a, b) => b.versionNumber - a.versionNumber)
                        .map((ver) => (
                          <div
                            key={ver.id}
                            className="border-border/20 flex items-start justify-between border-b py-1.5 text-sm last:border-b-0"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-foreground flex items-center gap-1 font-extrabold">
                                  <GitCommit className="text-primary h-3.5 w-3.5" />
                                  <span>Version {ver.versionNumber}</span>
                                </span>
                                {ver.isCurrent && (
                                  <Badge
                                    variant="emerald"
                                    className="px-2 py-0.5 text-xs font-bold uppercase"
                                  >
                                    Current Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                Uploaded on{" "}
                                {new Date(ver.createdAt).toLocaleString()}
                              </p>
                              {ver.changeNotes && (
                                <p className="text-foreground bg-card border-border/50 mt-1 inline-block rounded border px-2 py-1 text-xs font-semibold italic">
                                  Change note: &ldquo;{ver.changeNotes}&rdquo;
                                </p>
                              )}
                            </div>

                            <a
                              href={ver.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary border-border bg-card hover:bg-muted flex items-center gap-0.5 rounded-lg border px-2 py-1 text-xs font-bold hover:underline"
                            >
                              <span>Download</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Logical Document Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border max-w-md rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-black">
              Add Document Folder Node
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Define a logical lawsuit document container and index its first
              file URL.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitCreate(onCreateSubmit)}
            className="space-y-4 py-2"
          >
            {/* Title */}
            <div className="space-y-1">
              <Label
                htmlFor="title"
                className="text-foreground text-xs font-bold"
              >
                Document Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g. Settlement Agreement / Written Plaint"
                {...registerCreate("title")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errorsCreate.title && (
                <p className="text-destructive text-xs font-semibold">
                  {errorsCreate.title.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label
                htmlFor="category"
                className="text-foreground text-xs font-bold"
              >
                Document Category *
              </Label>
              <Controller
                control={controlCreate}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 rounded-xl font-semibold">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLEADING">
                        Pleading / Plaint
                      </SelectItem>
                      <SelectItem value="EVIDENCE">Evidence Scan</SelectItem>
                      <SelectItem value="ORDER_SHEET">
                        Court Order Sheet
                      </SelectItem>
                      <SelectItem value="AFFIDAVIT">
                        Affidavit / Statement
                      </SelectItem>
                      <SelectItem value="CONTRACT">
                        Contract / Agreement
                      </SelectItem>
                      <SelectItem value="OTHER">
                        Other / Miscellaneous
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* File URL */}
            <div className="space-y-1">
              <Label
                htmlFor="fileUrl"
                className="text-foreground text-xs font-bold"
              >
                Indexed File Link (URL) *
              </Label>
              <Input
                id="fileUrl"
                placeholder="e.g. https://storage.lga.dev/docs/plaint-v1.pdf"
                {...registerCreate("fileUrl")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errorsCreate.fileUrl && (
                <p className="text-destructive text-xs font-semibold">
                  {errorsCreate.fileUrl.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCreate}
                className="skeuo-button-primary gap-1.5 rounded-xl text-sm font-bold"
              >
                {isSubmittingCreate ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Indexing...</span>
                  </>
                ) : (
                  <span>Index Document</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Revision Dialog */}
      <Dialog open={isVersionOpen} onOpenChange={setIsVersionOpen}>
        <DialogContent className="bg-card border-border max-w-md rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-black">
              Upload Document Revision
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Revise logical file &ldquo;{selectedDoc?.title}&rdquo;. This will
              set all other versions to inactive.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitVersion(onVersionSubmit)}
            className="space-y-4 py-2"
          >
            {/* File URL */}
            <div className="space-y-1">
              <Label
                htmlFor="fileUrlRev"
                className="text-foreground text-xs font-bold"
              >
                Revised File Link (URL) *
              </Label>
              <Input
                id="fileUrlRev"
                placeholder="e.g. https://storage.lga.dev/docs/plaint-v2.pdf"
                {...registerVersion("fileUrl")}
                className="border-border bg-card focus-visible:ring-primary/40 rounded-xl text-sm"
              />
              {errorsVersion.fileUrl && (
                <p className="text-destructive text-xs font-semibold">
                  {errorsVersion.fileUrl.message}
                </p>
              )}
            </div>

            {/* Change Notes */}
            <div className="space-y-1">
              <Label
                htmlFor="changeNotes"
                className="text-foreground text-xs font-bold"
              >
                Revision Change Notes *
              </Label>
              <textarea
                id="changeNotes"
                placeholder="Describe what edits were made (e.g. corrected typing, added Annexure A...)"
                rows={3}
                {...registerVersion("changeNotes")}
                className="border-border bg-card text-foreground focus:border-primary focus-visible:ring-primary/40 w-full resize-none rounded-xl border p-3 text-sm font-medium outline-none"
              />
              {errorsVersion.changeNotes && (
                <p className="text-destructive text-xs font-semibold">
                  {errorsVersion.changeNotes.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsVersionOpen(false);
                  setSelectedDoc(null);
                }}
                className="rounded-xl text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingVersion}
                className="skeuo-button-primary gap-1 rounded-xl text-sm font-bold"
              >
                {isSubmittingVersion ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Submit Revision</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
