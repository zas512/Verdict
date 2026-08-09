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
      void queryClient.invalidateQueries({ queryKey: ["matter-documents", id] });
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
      void queryClient.invalidateQueries({ queryKey: ["matter-documents", id] });
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
    return <FolderClosed className="h-10 w-10 text-primary/80 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Case Documents Directory
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            Manage version-controlled petitions, evidentiary scans, and court
            order sheets.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="skeuo-button-primary rounded-xl text-sm font-bold gap-1"
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
            className="rounded-xl text-sm font-semibold border-border"
          >
            Sync Files
          </Button>
        </div>
      </div>

      {/* Grid of Documents */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 space-y-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider ml-2">
            Loading case file indexes...
          </span>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center p-16 space-y-2 border-2 border-dashed border-border rounded-2xl bg-card">
          <FolderClosed className="h-12 w-12 text-muted-foreground/60 mx-auto" />
          <p className="font-bold text-foreground text-base">
            No documents uploaded
          </p>
          <p className="text-sm text-muted-foreground">
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 flex-1">
                      {getCategoryIcon()}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                            {doc.title}
                          </h4>
                          <Badge
                            variant="navy"
                            className="text-xs font-bold uppercase py-0.5 px-2"
                          >
                            {doc.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded:{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                          {currentVersion &&
                            ` • Current Version: v${currentVersion.versionNumber}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {currentVersion && (
                        <a
                          href={currentVersion.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-bold bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 h-8"
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
                          className="rounded-xl text-sm font-bold gap-1 border-border h-8"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          <span>Revise</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandDoc(doc.id)}
                        className="rounded-xl text-sm font-bold gap-1 h-8"
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
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
                    <div className="mt-4 pt-3 border-t border-border/40 pl-14 space-y-2 bg-muted/10 p-3 rounded-xl border">
                      <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground pb-1">
                        Version History Ledger
                      </h5>

                      {doc.versions
                        .sort((a, b) => b.versionNumber - a.versionNumber)
                        .map((ver) => (
                          <div
                            key={ver.id}
                            className="flex items-start justify-between text-sm py-1.5 border-b border-border/20 last:border-b-0"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-foreground flex items-center gap-1">
                                  <GitCommit className="h-3.5 w-3.5 text-primary" />
                                  <span>Version {ver.versionNumber}</span>
                                </span>
                                {ver.isCurrent && (
                                  <Badge
                                    variant="emerald"
                                    className="text-xs py-0.5 px-2 uppercase font-bold"
                                  >
                                    Current Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Uploaded on{" "}
                                {new Date(ver.createdAt).toLocaleString()}
                              </p>
                              {ver.changeNotes && (
                                <p className="text-xs text-foreground font-semibold bg-card px-2 py-1 rounded border border-border/50 mt-1 italic inline-block">
                                  Change note: &ldquo;{ver.changeNotes}&rdquo;
                                </p>
                              )}
                            </div>

                            <a
                              href={ver.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5 border border-border bg-card hover:bg-muted px-2 py-1 rounded-lg"
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
        <DialogContent className="max-w-md bg-card border-border rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Add Document Folder Node
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
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
                className="text-xs font-bold text-foreground"
              >
                Document Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g. Settlement Agreement / Written Plaint"
                {...registerCreate("title")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errorsCreate.title && (
                <p className="text-xs text-destructive font-semibold">
                  {errorsCreate.title.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label
                htmlFor="category"
                className="text-xs font-bold text-foreground"
              >
                Document Category *
              </Label>
              <Controller
                control={controlCreate}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-xl h-8 font-semibold">
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
                className="text-xs font-bold text-foreground"
              >
                Indexed File Link (URL) *
              </Label>
              <Input
                id="fileUrl"
                placeholder="e.g. https://storage.lga.dev/docs/plaint-v1.pdf"
                {...registerCreate("fileUrl")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errorsCreate.fileUrl && (
                <p className="text-xs text-destructive font-semibold">
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
                className="skeuo-button-primary rounded-xl text-sm font-bold gap-1.5"
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
        <DialogContent className="max-w-md bg-card border-border rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Upload Document Revision
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
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
                className="text-xs font-bold text-foreground"
              >
                Revised File Link (URL) *
              </Label>
              <Input
                id="fileUrlRev"
                placeholder="e.g. https://storage.lga.dev/docs/plaint-v2.pdf"
                {...registerVersion("fileUrl")}
                className="text-sm rounded-xl border-border bg-card focus-visible:ring-primary/40"
              />
              {errorsVersion.fileUrl && (
                <p className="text-xs text-destructive font-semibold">
                  {errorsVersion.fileUrl.message}
                </p>
              )}
            </div>

            {/* Change Notes */}
            <div className="space-y-1">
              <Label
                htmlFor="changeNotes"
                className="text-xs font-bold text-foreground"
              >
                Revision Change Notes *
              </Label>
              <textarea
                id="changeNotes"
                placeholder="Describe what edits were made (e.g. corrected typing, added Annexure A...)"
                rows={3}
                {...registerVersion("changeNotes")}
                className="w-full text-sm p-3 rounded-xl border border-border bg-card text-foreground font-medium outline-none focus:border-primary focus-visible:ring-primary/40 resize-none"
              />
              {errorsVersion.changeNotes && (
                <p className="text-xs text-destructive font-semibold">
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
                className="skeuo-button-primary rounded-xl text-sm font-bold gap-1"
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
