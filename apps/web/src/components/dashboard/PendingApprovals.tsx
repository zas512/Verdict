"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ClipboardCheck, Inbox, X } from "lucide-react";
import { useEffect, useState } from "react";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: string;
  leaveType?: { id: string; name: string } | null;
  associate?: { id: string; fullName: string; email?: string | null } | null;
}

const DAY_MS = 86_400_000;

function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "short"
  }).format(new Date(iso));
}

function fmtYear(iso: string): string {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric" }).format(
    new Date(iso)
  );
}

function rangeLabel(r: LeaveRequest): string {
  const start = new Date(r.startDate);
  const end = new Date(r.endDate);
  const days =
    Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const range =
    start.getUTCFullYear() === end.getUTCFullYear()
      ? `${fmtDay(r.startDate)} – ${fmtDay(r.endDate)} ${fmtYear(r.endDate)}`
      : `${fmtDay(r.startDate)} ${fmtYear(r.startDate)} – ${fmtDay(r.endDate)} ${fmtYear(r.endDate)}`;
  return `${range} · ${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * OWNER approval queue for pending leave requests. Fetches through the web
 * proxy (`/api/leave`) so the session JWT rides the cookie, then decides
 * inline via `PATCH /api/leave/:id/status`. Decided requests drop out of the
 * list — a hard refresh re-reads the truth from the backend.
 */
export function PendingApprovals({ className }: { className?: string }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leave")
      .then((res) => {
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRequests(
          Array.isArray(data)
            ? data.filter(
                (r: LeaveRequest) => r.status === "PENDING"
              )
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/leave/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error(`decision failed: ${res.status}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setActionError("Couldn't update that request — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.length;

  return (
    <Card className={cn("skeuo-card bg-card text-card-foreground relative overflow-hidden", className)}>

      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Pending Approvals
        </CardTitle>
        <Badge variant={pending > 0 ? "amber" : "navy"}>
          {loading ? "…" : `${pending} pending`}
        </Badge>
      </CardHeader>
      <CardContent className="pb-4">
        {actionError && (
          <p
            role="alert"
            className="mb-3 text-xs font-semibold text-destructive"
          >
            {actionError}
          </p>
        )}
        {loading ? (
          <p className="py-6 text-center text-xs font-medium text-muted-foreground">
            Loading leave requests…
          </p>
        ) : loadError ? (
          <p className="py-6 text-center text-xs font-medium text-muted-foreground">
            Couldn&apos;t load pending requests — refresh to retry.
          </p>
        ) : pending === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">All caught up</p>
            <p className="max-w-xs text-xs font-medium text-muted-foreground">
              No leave requests are waiting for your decision.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60" aria-live="polite">
            {requests.map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {r.associate?.fullName ?? "Associate"}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                      {r.leaveType?.name ?? "Leave"} · {rangeLabel(r)}
                    </p>
                    {r.reason && (
                      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground/80">
                        “{r.reason}”
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => decide(r.id, "APPROVED")}
                      disabled={busyId !== null}
                      aria-label={`Approve ${r.associate?.fullName ?? "associate"}'s leave request`}
                      title="Approve"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-inset ring-success/25 transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r.id, "REJECTED")}
                      disabled={busyId !== null}
                      aria-label={`Reject ${r.associate?.fullName ?? "associate"}'s leave request`}
                      title="Reject"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25 transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:pointer-events-none disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
