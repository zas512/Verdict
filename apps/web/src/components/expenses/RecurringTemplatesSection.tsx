"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2, Plus, RefreshCcw, Repeat, Trash2 } from "lucide-react";
import type { RecurringTemplate } from "./ExpensesClient";

const CYCLE_LABEL: Record<RecurringTemplate["billingCycle"], string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually"
};

function formatNextRun(dateIso: string): string {
  if (!dateIso) return "Not scheduled";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

interface RecurringTemplatesSectionProps {
  templates: RecurringTemplate[];
  isLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onCreate: () => void;
  onToggleActive: (template: RecurringTemplate) => void;
  onDelete: (template: RecurringTemplate) => void;
}

export function RecurringTemplatesSection({
  templates,
  isLoading,
  isGenerating,
  onGenerate,
  onCreate,
  onToggleActive,
  onDelete
}: Readonly<RecurringTemplatesSectionProps>) {
  return (
    <Card className="border-border bg-card overflow-hidden rounded-2xl shadow-xs">
      <CardHeader className="border-border flex flex-row flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
          <Repeat className="text-primary h-4 w-4" />
          Recurring Templates
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating || isLoading}
            className="border-border h-8 rounded-full text-xs font-semibold dark:border-white/40"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Generate Now
          </Button>
          <Button
            size="sm"
            onClick={onCreate}
            disabled={isLoading}
            className="h-8 rounded-full text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 p-8 text-xs font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="space-y-2 p-8 text-center">
            <Repeat className="text-muted-foreground/40 mx-auto h-10 w-10" />
            <p className="text-foreground text-sm font-bold">
              No recurring templates
            </p>
            <p className="text-muted-foreground mx-auto max-w-sm text-xs">
              Set up a template to automatically generate fixed expenses on a
              monthly, quarterly or annual cycle.
            </p>
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground truncate text-sm font-bold">
                      {t.category}
                    </span>
                    <Badge
                      variant={t.isActive ? "emerald" : "outline"}
                      className="text-[10px]"
                    >
                      {t.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p
                    className="text-muted-foreground mt-0.5 max-w-md truncate text-xs"
                    title={t.description}
                  >
                    {t.description}
                  </p>
                  <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                    Next run: {formatNextRun(t.nextRunDate)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-foreground text-sm font-black whitespace-nowrap">
                      {formatPKR(Number(t.amount) || 0)}
                    </p>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase">
                      {CYCLE_LABEL[t.billingCycle]}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={t.isActive}
                    aria-label={`${t.isActive ? "Pause" : "Activate"} ${t.category} template`}
                    onClick={() => onToggleActive(t)}
                    className={cn(
                      "focus-visible:ring-ring relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      t.isActive ? "bg-success" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                        t.isActive && "translate-x-5"
                      )}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(t)}
                    className="border-border bg-card hover:bg-destructive/10 hover:text-destructive text-muted-foreground cursor-pointer rounded-lg border p-1.5 transition-colors"
                    title="Delete template"
                    aria-label={`Delete ${t.category} template`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
